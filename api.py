import json
import mimetypes
import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Set

import comfy.samplers
import folder_paths
import server  # noqa: F401 - keep import side-effects
from aiohttp import web
from PIL import Image, ImageDraw, ImageOps

from ComfyUI_CozyGen import auth

routes = web.RouteTableDef()

EXT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(EXT_DIR, "data")
PRESETS_DIR = os.path.join(DATA_DIR, "presets")
THUMBS_DIR = os.path.join(DATA_DIR, "thumbs")
ALIASES_FILE = os.path.join(DATA_DIR, "aliases.json")
PROMPTS_FILE = os.path.join(DATA_DIR, "prompts.json")
WORKFLOW_TYPES_FILE = os.path.join(DATA_DIR, "workflow_types.json")
LORA_LIBRARY_FILE = os.path.join(DATA_DIR, "lora_library.json")
WORKFLOW_MODE_CHOICES = {
    "text-to-image",
    "text-to-video",
    "image-to-image",
    "image-to-video",
}
os.makedirs(PRESETS_DIR, exist_ok=True)
os.makedirs(THUMBS_DIR, exist_ok=True)
for p in (ALIASES_FILE, PROMPTS_FILE):
    if not os.path.exists(p):
        with open(p, "w", encoding="utf-8") as f:
            json.dump({}, f)
if not os.path.exists(WORKFLOW_TYPES_FILE):
    with open(WORKFLOW_TYPES_FILE, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "workflows": {}}, f)


def _load(path, dflt):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return dflt


def _save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


if not os.path.exists(LORA_LIBRARY_FILE):
    _save(LORA_LIBRARY_FILE, {"version": 1, "cards": {}})


def _load_workflow_types() -> dict:
    data = _load(WORKFLOW_TYPES_FILE, {"version": 1, "workflows": {}})
    workflows = data.get("workflows")
    return workflows if isinstance(workflows, dict) else {}


def _save_workflow_types(workflows: dict):
    _save(WORKFLOW_TYPES_FILE, {"version": 1, "workflows": workflows})


def _load_lora_cards() -> dict:
    data = _load(LORA_LIBRARY_FILE, {"version": 1, "cards": {}})
    cards = data.get("cards")
    return cards if isinstance(cards, dict) else {}


def _save_lora_cards(cards: dict):
    _save(LORA_LIBRARY_FILE, {"version": 1, "cards": cards})


_VARIANT_PATTERN = re.compile(r"(?i)[\s_\-]*(high|low)$")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def _slugify(text: str) -> str:
    text = (text or "").lower()
    text = _NON_ALNUM.sub("-", text).strip("-")
    return text


def _normalize_variant(stem: str):
    stem = stem or ""
    match = _VARIANT_PATTERN.search(stem)
    if match:
        variant = match.group(1).lower()
        base = stem[: match.start()].strip(" _-")
        if not base:
            base = stem
        return base, variant
    return stem, None


def _dedupe_id(slug_src: str, slug_map: dict, used_ids: Set[str]) -> str:
    if slug_src in slug_map:
        return slug_map[slug_src]
    base = _slugify(slug_src) or "lora"
    candidate = base
    index = 2
    while candidate in used_ids:
        candidate = f"{base}-{index}"
        index += 1
    slug_map[slug_src] = candidate
    used_ids.add(candidate)
    return candidate


def _collect_detected_loras():
    try:
        names = folder_paths.get_filename_list("loras")
    except Exception:
        names = []
    normalized = sorted({name.replace("\\", "/") for name in names})
    slug_map = {}
    used = set()
    entries = {}
    for rel in normalized:
        rel_path = rel.strip("/")
        folder = os.path.dirname(rel_path)
        folder = folder.replace("\\", "/").strip("/")
        stem = Path(rel_path).stem
        base_name, variant = _normalize_variant(stem)
        slug_src = f"{folder}/{base_name}" if folder else base_name
        card_id = _dedupe_id(slug_src, slug_map, used)
        entry = entries.get(card_id)
        if not entry:
            entry = {
                "id": card_id,
                "base_name": base_name or stem or card_id,
                "model_name": base_name or stem or card_id,
                "folder": folder,
                "files": {"high": None, "low": None, "others": []},
                "all_files": [],
            }
            entries[card_id] = entry
        entry["all_files"].append(rel_path)
        if variant in ("high", "low") and entry["files"][variant] is None:
            entry["files"][variant] = rel_path
        else:
            entry["files"]["others"].append(rel_path)
    for entry in entries.values():
        files = entry["files"]
        if files["high"] and files["low"]:
            entry["pair_state"] = "paired"
        elif files["high"] or files["low"]:
            entry["pair_state"] = "partial"
        else:
            entry["pair_state"] = "single"
    return entries


def _clean_string(value):
    return value.strip() if isinstance(value, str) else ""


def _clean_string_list(values):
    result = []
    if isinstance(values, (list, tuple, set)):
        source = values
    elif isinstance(values, str):
        source = [v.strip() for v in values.split(",")]
    else:
        source = []
    for item in source:
        item = _clean_string(item)
        if item and item not in result:
            result.append(item)
    return result


def _clean_prompt_examples(items):
    cleaned = []
    if not isinstance(items, list):
        return cleaned
    for item in items:
        if not isinstance(item, dict):
            continue
        title = _clean_string(item.get("title"))
        text = _clean_string(item.get("text"))
        negative = _clean_string(item.get("negative"))
        weight_tip = _clean_string(item.get("weightTip"))
        if not (title or text or negative or weight_tip):
            continue
        cleaned.append(
            {
                "title": title,
                "text": text,
                "negative": negative,
                "weightTip": weight_tip,
            }
        )
    return cleaned


def _clean_preview(obj):
    if not isinstance(obj, dict):
        return {}
    src = _clean_string(obj.get("src"))
    alt = _clean_string(obj.get("alt"))
    if not src and not alt:
        return {}
    return {"src": src, "alt": alt}


def _compose_lora_card(card_id: str, detected: dict, saved: dict, missing: bool = False):
    saved = saved or {}
    base_name = (
        saved.get("base_name")
        or saved.get("baseName")
        or (detected.get("base_name") if detected else "")
        or saved.get("model_name")
        or card_id
    )
    name = saved.get("name") or base_name or card_id
    model_name = saved.get("model_name") or saved.get("modelName") or base_name or card_id
    keywords = saved.get("keywords")
    prompt_examples = saved.get("promptExamples")
    tags = saved.get("tags")
    preview = saved.get("preview")
    status = "configured"
    if missing:
        status = "missing"
    elif not saved:
        status = "detected"
    files = None
    pair_state = "unknown"
    folder = ""
    if detected:
        files = detected.get("files")
        pair_state = detected.get("pair_state", "unknown")
        folder = detected.get("folder") or ""
    elif saved:
        files = saved.get("files") or {"others": []}
        pair_state = saved.get("pair_state", "unknown")
        folder = saved.get("folder") or ""
    return {
        "id": card_id,
        "name": name,
        "baseName": base_name,
        "modelName": model_name,
        "category": saved.get("category", ""),
        "description": saved.get("description", ""),
        "recommendedWeight": saved.get("recommendedWeight", ""),
        "keywords": keywords if isinstance(keywords, list) else [],
        "promptExamples": prompt_examples if isinstance(prompt_examples, list) else [],
        "tags": tags if isinstance(tags, list) else [],
        "sourceUrl": saved.get("sourceUrl", ""),
        "sourceLabel": saved.get("sourceLabel", ""),
        "preview": preview if isinstance(preview, dict) else {},
        "status": status,
        "files": files or {"others": []},
        "pairState": pair_state,
        "folder": folder,
        "lastUpdated": saved.get("lastUpdated"),
        "notes": saved.get("notes", ""),
    }


def _merge_lora_cards():
    saved = _load_lora_cards()
    detected = _collect_detected_loras()
    merged = []
    seen = set()
    for card_id, det in detected.items():
        merged.append(_compose_lora_card(card_id, det, saved.get(card_id)))
        seen.add(card_id)
    for card_id, saved_card in saved.items():
        if card_id in seen:
            continue
        merged.append(_compose_lora_card(card_id, None, saved_card, missing=True))
    merged.sort(key=lambda item: (item["status"], item["name"].lower()))
    return merged


# ---------------- Basic
@routes.get("/cozygen/hello")
async def hello(_):
    return web.json_response({"status": "ok"})


# ---------------- Gallery list (moved under /cozygen/api/)
@routes.get("/cozygen/api/gallery")
async def gallery_list(request: web.Request):
    subfolder = request.rel_url.query.get("subfolder", "")
    show_hidden = request.rel_url.query.get("show_hidden", "0") in ("1", "true", "True")
    try:
        page = int(request.rel_url.query.get("page", "1"))
        per_page = int(request.rel_url.query.get("per_page", "20"))
    except ValueError:
        return web.json_response({"error": "bad paging"}, status=400)

    base = folder_paths.get_output_directory()
    path = os.path.normpath(os.path.join(base, subfolder))
    if not path.startswith(base):
        return web.json_response({"error": "forbidden"}, status=403)
    if not os.path.isdir(path):
        return web.json_response({"error": "not found"}, status=404)

    items = []
    for name in os.listdir(path):
        if not show_hidden and name.startswith("."):  # hide dot folders/files
            continue
        full = os.path.join(path, name)
        if os.path.isdir(full):
            items.append(
                {
                    "filename": name,
                    "type": "directory",
                    "subfolder": os.path.join(subfolder, name).replace("\\", "/"),
                    "mtime": os.path.getmtime(full),
                }
            )
        else:
            low = name.lower()
            if low.endswith(
                (
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".gif",
                    ".webp",
                    ".bmp",
                    ".tif",
                    ".tiff",
                    ".mp4",
                    ".webm",
                    ".mov",
                    ".mkv",
                    ".mp3",
                    ".wav",
                    ".flac",
                )
            ):
                items.append(
                    {
                        "filename": name,
                        "type": "output",
                        "subfolder": subfolder.replace("\\", "/"),
                        "mtime": os.path.getmtime(full),
                    }
                )

    dirs = [i for i in items if i["type"] == "directory"]
    files = [i for i in items if i["type"] != "directory"]
    files.sort(key=lambda x: x["mtime"], reverse=True)
    items = dirs + files

    total = len(items)
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    start = (page - 1) * per_page
    end = start + per_page
    page_items = items[start:end] if per_page > 0 else items

    return web.json_response(
        {"items": page_items, "page": page, "per_page": per_page, "total_pages": total_pages, "total_items": total}
    )


# ---------------- Upload (inputs)
@routes.post("/cozygen/upload_image")
async def upload_image(request: web.Request):
    reader = await request.multipart()
    field = await reader.next()
    if not field or field.name != "image":
        return web.json_response({"error": "image field"}, status=400)
    filename = field.filename or "upload"
    unique = f"{uuid.uuid4()}_{filename}"
    dest = os.path.join(folder_paths.get_input_directory(), unique)
    size = 0
    with open(dest, "wb") as f:
        while True:
            chunk = await field.read_chunk()
            if not chunk:
                break
            f.write(chunk)
            size += len(chunk)
    return web.json_response({"filename": unique, "size": size})


# ---------------- Workflows
@routes.get("/cozygen/workflows")
async def workflows(_):
    d = os.path.join(EXT_DIR, "workflows")
    if not os.path.isdir(d):
        return web.json_response({"workflows": []})
    return web.json_response({"workflows": [f for f in os.listdir(d) if f.endswith(".json")]})


@routes.get("/cozygen/workflows/{filename}")
async def workflow_one(request: web.Request):
    fn = request.match_info["filename"]
    path = os.path.join(EXT_DIR, "workflows", fn)
    if not os.path.isfile(path):
        return web.json_response({"error": "not found"}, status=404)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return web.json_response(json.load(f))
    except json.JSONDecodeError:
        return web.json_response({"error": "bad json"}, status=400)


# ---------------- Choices
valid_model_types = folder_paths.folder_names_and_paths.keys()
_alias = {"samplers_list": "sampler", "schedulers_list": "scheduler", "unet": "unet_gguf"}


@routes.get("/cozygen/get_choices")
async def get_choices(request: web.Request):
    kind = request.rel_url.query.get("type", "")
    if not kind:
        return web.json_response({"error": "missing type"}, status=400)
    kind = _alias.get(kind, kind)
    if kind == "scheduler":
        return web.json_response({"choices": comfy.samplers.KSampler.SCHEDULERS})
    if kind == "sampler":
        return web.json_response({"choices": comfy.samplers.KSampler.SAMPLERS})
    if kind in valid_model_types:
        return web.json_response({"choices": folder_paths.get_filename_list(kind)})
    return web.json_response({"error": f"invalid type {kind}"}, status=400)


# ---------------- Aliases/Prompts (kept for compatibility)
@routes.get("/cozygen/api/aliases")
async def get_aliases(_):
    return web.json_response(_load(ALIASES_FILE, {}))


@routes.post("/cozygen/api/aliases")
async def post_aliases(request):
    _save(ALIASES_FILE, await request.json())
    return web.json_response({"status": "ok"})


@routes.get("/cozygen/api/prompts")
async def get_prompts(_):
    return web.json_response(_load(PROMPTS_FILE, {}))


@routes.post("/cozygen/api/prompts")
async def post_prompts(request):
    _save(PROMPTS_FILE, await request.json())
    return web.json_response({"status": "ok"})


# ---------------- Input browser
INPUT_DIR = Path(folder_paths.get_input_directory()).resolve()


def _safe_join_input(base: Path, rel: str) -> Path:
    rel = (rel or "").strip().lstrip("/").replace("\\", "/")
    p = (base / rel).resolve()
    if base not in p.parents and p != base:
        raise web.HTTPBadRequest(text="Invalid path")
    return p


def _list_input_dir(base: Path, subfolder: str, page: int, per_page: int, exts: Set[str]):
    root = _safe_join_input(base, subfolder)
    if not root.exists() or not root.is_dir():
        return {
            "items": [],
            "page": page,
            "per_page": per_page,
            "total_pages": 0,
            "total_items": 0,
            "cwd": "",
            "base": str(base),
        }
    ents = []
    for d in sorted([p for p in root.iterdir() if p.is_dir()], key=lambda x: x.name.lower()):
        st = d.stat()
        ents.append(
            {
                "name": d.name,
                "rel_path": str(d.relative_to(base)).replace("\\", "/"),
                "is_dir": True,
                "size": 0,
                "mtime": int(st.st_mtime),
            }
        )
    for f in sorted([p for p in root.iterdir() if p.is_file()], key=lambda x: x.name.lower()):
        if exts and f.suffix.lower().lstrip(".") not in exts:
            continue
        st = f.stat()
        ents.append(
            {
                "name": f.name,
                "rel_path": str(f.relative_to(base)).replace("\\", "/"),
                "is_dir": False,
                "size": int(st.st_size),
                "mtime": int(st.st_mtime),
            }
        )
    total = len(ents)
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    start = (page - 1) * per_page
    end = start + per_page
    slice_ = ents if per_page <= 0 else ents[start:end]
    return {
        "items": slice_,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "total_items": total,
        "cwd": str(root.relative_to(base)).replace("\\", "/") if root != base else "",
        "base": str(base),
    }


@routes.get("/cozygen/input")
async def input_list(request: web.Request):
    subfolder = request.rel_url.query.get("subfolder", "").strip("/")
    page = int(request.rel_url.query.get("page", "1"))
    per_page = int(request.rel_url.query.get("per_page", "50"))
    exts = set(
        [
            e.strip().lower()
            for e in request.rel_url.query.get("exts", "jpg,jpeg,png,webp,bmp,tif,tiff,gif").split(",")
            if e.strip()
        ]
    )
    return web.json_response(_list_input_dir(INPUT_DIR, subfolder, page, per_page, exts))


@routes.get("/cozygen/input/file")
async def input_file(request: web.Request):
    rel = request.rel_url.query.get("path")
    if not rel:
        raise web.HTTPBadRequest(text="Missing path")
    p = _safe_join_input(INPUT_DIR, rel)
    if not p.exists() or not p.is_file():
        raise web.HTTPNotFound(text="File not found")
    mime = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
    return web.FileResponse(path=str(p), headers={"Content-Type": mime})


# ---------------- Presets
def _presets_path(wf: str) -> str:
    safe = "".join(c for c in (wf or "default") if c.isalnum() or c in ("-", "_", "."))
    return os.path.join(PRESETS_DIR, f"{safe}.json")


def _read_presets(wf: str) -> dict:
    p = _presets_path(wf)
    return _load(p, {"version": 1, "items": {}})


def _write_presets(wf: str, data: dict) -> None:
    _save(_presets_path(wf), data)


def _ensure_entry(values, meta, existing):
    """Pack preset values + meta, preserving legacy formats."""
    if meta is not None:
        out = {"values": values or {}, "meta": meta or {}}
        return out
    if isinstance(existing, dict) and "values" in existing:
        out = {"values": values or {}}
        if "meta" in existing:
            out["meta"] = existing.get("meta")
        return out
    return values or {}


@routes.get("/cozygen/api/presets")
async def presets_list(request: web.Request):
    wf = request.rel_url.query.get("workflow", "default")
    return web.json_response(_read_presets(wf))


@routes.post("/cozygen/api/presets")
async def presets_save(request: web.Request):
    wf = request.rel_url.query.get("workflow", "default")
    body = await request.json()
    name = (body.get("name") or "").strip()
    if not name:
        raise web.HTTPBadRequest(text="Missing name")
    values = body.get("values") or {}
    meta = body.get("meta") if "meta" in body else None
    data = _read_presets(wf)
    existing = data.get("items", {}).get(name)
    entry = _ensure_entry(values, meta, existing)
    data.setdefault("items", {})[name] = entry
    if isinstance(entry, dict) and "values" in entry:
        data["version"] = max(2, data.get("version", 1))
    _write_presets(wf, data)
    return web.json_response({"status": "ok"})


@routes.delete("/cozygen/api/presets")
async def presets_delete(request: web.Request):
    wf = request.rel_url.query.get("workflow", "default")
    name = (request.rel_url.query.get("name") or "").strip()
    data = _read_presets(wf)
    if name in data["items"]:
        del data["items"][name]
        _write_presets(wf, data)
    return web.json_response({"status": "ok"})


@routes.get("/cozygen/api/workflow_types")
async def workflow_types_list(_request: web.Request):
    return web.json_response({"workflows": _load_workflow_types(), "choices": sorted(WORKFLOW_MODE_CHOICES)})


@routes.post("/cozygen/api/workflow_types")
async def workflow_types_save(request: web.Request):
    body = await request.json()
    workflow = (body.get("workflow") or "").strip()
    if not workflow:
        raise web.HTTPBadRequest(text="Missing workflow")
    mode_raw = (body.get("mode") or "").strip().lower()
    if mode_raw and mode_raw not in WORKFLOW_MODE_CHOICES:
        raise web.HTTPBadRequest(text="Invalid workflow mode")
    data = _load_workflow_types()
    if mode_raw:
        data[workflow] = mode_raw
    else:
        data.pop(workflow, None)
    _save_workflow_types(data)
    return web.json_response({"status": "ok", "workflows": data})


# ---------------- Thumbnails
def _thumb_src_base(which: str) -> str:
    return (
        folder_paths.get_input_directory() if (which or "").lower() == "input" else folder_paths.get_output_directory()
    )


def _thumb_dest_path(which: str, subfolder: str, filename: str, w: int) -> str:
    safe_sub = (subfolder or "").strip().strip("/").replace("\\", "/")
    dest_dir = os.path.join(THUMBS_DIR, which, safe_sub)
    os.makedirs(dest_dir, exist_ok=True)
    name, _ = os.path.splitext(filename)
    return os.path.join(dest_dir, f"{name}__w{w}.jpg")


def _thumb_headers(etag: str) -> dict:
    return {"Cache-Control": "public, max-age=31536000, immutable", "ETag": etag, "Content-Type": "image/jpeg"}


def _make_image_thumb(src: str, dest: str, w: int):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((w, w), Image.Resampling.LANCZOS)
        im.save(dest, "JPEG", quality=85, optimize=True, progressive=True)


def _make_video_thumb(src: str, dest: str, w: int):
    if shutil.which("ffmpeg"):
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            "0.10",
            "-i",
            src,
            "-vframes",
            "1",
            "-vf",
            f"scale='min({w},iw)':-1",
            "-q:v",
            "5",
            dest,
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            if os.path.exists(dest) and os.path.getsize(dest) > 0:
                return
        except Exception:
            pass
    H = int(w * 9 / 16)
    img = Image.new("RGB", (w, H), (40, 40, 48))
    d = ImageDraw.Draw(img)
    d.polygon(
        [(int(w * 0.38), int(H * 0.30)), (int(w * 0.72), int(H * 0.50)), (int(w * 0.38), int(H * 0.70))],
        fill=(240, 240, 240),
    )
    img.save(dest, "JPEG", quality=85, optimize=True, progressive=True)


@routes.get("/cozygen/thumb")
async def thumb(request: web.Request):
    which = (request.rel_url.query.get("type") or "output").lower()
    filename = request.rel_url.query.get("filename")
    subfolder = request.rel_url.query.get("subfolder", "")
    w = max(96, min(1024, int(request.rel_url.query.get("w", "384"))))
    if not filename:
        raise web.HTTPBadRequest(text="Missing filename")
    base = _thumb_src_base(which)
    src = os.path.normpath(os.path.join(base, subfolder, filename))
    if not src.startswith(base):
        raise web.HTTPForbidden(text="Invalid path")
    if not os.path.isfile(src):
        raise web.HTTPNotFound(text="Source not found")
    st = os.stat(src)
    etag = f'W/"{int(st.st_mtime)}-{st.st_size}-w{w}"'
    if request.headers.get("If-None-Match") == etag:
        return web.Response(status=304, headers=_thumb_headers(etag))
    dest = _thumb_dest_path(which, subfolder, filename, w)
    need = True
    if os.path.exists(dest):
        if st.st_mtime <= os.stat(dest).st_mtime:
            need = False
    if need:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        ext = os.path.splitext(filename)[1].lower()
        try:
            if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff"):
                _make_image_thumb(src, dest, w)
            elif ext in (".mp4", ".webm", ".mov", ".mkv"):
                _make_video_thumb(src, dest, w)
            else:
                _make_video_thumb(src, dest, w)
        except Exception:
            _make_video_thumb(src, dest, w)
    return web.FileResponse(dest, headers=_thumb_headers(etag))


# ---------------- LoRA Library
@routes.get("/cozygen/api/lora_library")
async def lora_library_list(_request: web.Request):
    items = _merge_lora_cards()
    drafts = sum(1 for item in items if item["status"] == "detected")
    missing = sum(1 for item in items if item["status"] == "missing")
    return web.json_response(
        {
            "items": items,
            "draftCount": drafts,
            "missingCount": missing,
            "timestamp": int(time.time()),
        }
    )


@routes.post("/cozygen/api/lora_library")
async def lora_library_save(request: web.Request):
    body = await request.json()
    card_id = _clean_string(body.get("id"))
    if not card_id:
        raise web.HTTPBadRequest(text="Missing card id")
    payload = body.get("data") or {}
    cards = _load_lora_cards()
    existing = cards.get(card_id) or {}

    name = _clean_string(payload.get("name")) or existing.get("name") or card_id
    base_name = _clean_string(payload.get("baseName")) or existing.get("baseName") or existing.get("base_name") or name
    model_name = (
        _clean_string(payload.get("modelName"))
        or existing.get("modelName")
        or existing.get("model_name")
        or base_name
        or name
    )
    description = _clean_string(payload.get("description")) or ""
    category = _clean_string(payload.get("category")) or ""
    recommended_weight = _clean_string(payload.get("recommendedWeight")) or ""
    source_url = _clean_string(payload.get("sourceUrl")) or ""
    source_label = _clean_string(payload.get("sourceLabel")) or ""
    notes = _clean_string(payload.get("notes")) or ""

    card = {
        "id": card_id,
        "name": name,
        "baseName": base_name,
        "model_name": model_name,
        "modelName": model_name,
        "description": description,
        "category": category,
        "recommendedWeight": recommended_weight,
        "sourceUrl": source_url,
        "sourceLabel": source_label or ("View source" if source_url else ""),
        "keywords": _clean_string_list(payload.get("keywords")),
        "tags": _clean_string_list(payload.get("tags")),
        "promptExamples": _clean_prompt_examples(payload.get("promptExamples")),
        "preview": _clean_preview(payload.get("preview")),
        "notes": notes,
        "lastUpdated": int(time.time()),
    }

    cards[card_id] = card
    _save_lora_cards(cards)
    return web.json_response({"status": "ok", "card": card})


@routes.delete("/cozygen/api/lora_library/{card_id}")
async def lora_library_delete(request: web.Request):
    card_id = _clean_string(request.match_info.get("card_id"))
    if not card_id:
        raise web.HTTPBadRequest(text="Missing card id")
    cards = _load_lora_cards()
    if card_id in cards:
        del cards[card_id]
        _save_lora_cards(cards)
    return web.json_response({"status": "ok"})


# ---------------- Auth
@routes.post("/cozygen/api/login")
async def login(request: web.Request):
    if not auth.auth_enabled():
        return web.json_response({"error": "auth_disabled"}, status=400)

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid_body"}, status=400)

    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if username != auth.AUTH_USER or password != auth.AUTH_PASS:
        return web.json_response({"error": "invalid_credentials"}, status=401)

    token = auth.sign_token(username)
    resp = web.json_response(
        {
            "token": token,
            "user": username,
            "expires_in": auth.AUTH_TTL_SECONDS,
            "default_credentials": auth.default_credentials_in_use(),
        }
    )
    # Set HttpOnly cookie for API requests; JS still uses token for WebSocket
    resp.set_cookie(
        "cozygen_token",
        token,
        max_age=auth.AUTH_TTL_SECONDS,
        secure=request.secure,
        httponly=True,
        samesite="Lax",
        path="/",
    )
    return resp


@routes.get("/cozygen/api/auth_status")
async def auth_status(request: web.Request):
    if not auth.auth_enabled():
        return web.json_response({"authenticated": False, "user": None, "auth_enabled": False})

    token = auth.extract_token(request)
    verified = auth.verify_token(token)
    if not verified:
        return web.json_response(
            {
                "authenticated": False,
                "user": None,
                "auth_enabled": True,
                "default_credentials": auth.default_credentials_in_use(),
            },
            status=401,
        )

    user, exp = verified
    return web.json_response(
        {
            "authenticated": True,
            "user": user,
            "exp": exp,
            "auth_enabled": True,
            "default_credentials": auth.default_credentials_in_use(),
        }
    )


@routes.post("/cozygen/api/logout")
async def logout(request: web.Request):
    resp = web.json_response({"status": "ok"})
    resp.del_cookie("cozygen_token", path="/")
    return resp
