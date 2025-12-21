import asyncio
import contextlib
import json
import logging
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
logger = logging.getLogger(__name__)

EXT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(EXT_DIR, "data")
THUMBS_DIR = os.path.join(DATA_DIR, "thumbs")
ALIASES_FILE = os.path.join(DATA_DIR, "aliases.json")
WORKFLOW_TYPES_FILE = os.path.join(DATA_DIR, "workflow_types.json")
WORKFLOW_PRESETS_FILE = os.path.join(DATA_DIR, "workflow_presets.json")
WORKFLOW_MODE_CHOICES = {
    "text-to-image",
    "text-to-video",
    "image-to-image",
    "image-to-video",
}
os.makedirs(THUMBS_DIR, exist_ok=True)
if not os.path.exists(ALIASES_FILE):
    with open(ALIASES_FILE, "w", encoding="utf-8") as f:
        json.dump({}, f)
if not os.path.exists(WORKFLOW_TYPES_FILE):
    with open(WORKFLOW_TYPES_FILE, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "workflows": {}}, f)
if not os.path.exists(WORKFLOW_PRESETS_FILE):
    with open(WORKFLOW_PRESETS_FILE, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "users": {}}, f)

# Danbooru tag reference (used for in-app tag browsing + alias validation)
DANBOORU_TAGS_FILE = os.path.join(DATA_DIR, "danbooru_tags.md")

_DANBOORU_TAGS_CACHE = None
_DANBOORU_TAGS_MTIME = None
_DANBOORU_TAGS_LOCK = asyncio.Lock()

_RE_DANBOORU_CATEGORY = re.compile(r"^##\s+(.+?)(?:\s+\((\d+)\))?\s*$")
_RE_DANBOORU_TAG = re.compile(r"^-\s+`([^`]+)`\s+—\s+(\d+)\s*$")
_RE_DANBOORU_TIME_TAG = re.compile(r"^(?:\d{1,2}:\d{2}(?:am|pm)?|\d+:)$", re.I)

_DANBOORU_CATEGORY_MAP = {
    "anatomy_body": "body",
    "camera_composition": "camera",
    "clothing_accessories": "clothing",
    "color": "color",
    "expression_emotion": "expression",
    "lighting": "lighting",
    "location_scene": "scene",
    "meta_quality": "quality",
    "name_title_misc": "names",
    "other": "general",
    "pose_action": "pose",
    "style_medium": "style",
    "text_symbols": "text",
    "subject_count": "meta",
    "weapons_tools": "props",
    "violence_gore": "violence",
    "nsfw_suggestive": "nsfw",
    "nsfw_nudity": "nsfw",
    "nsfw_explicit": "nsfw",
}


def _normalize_danbooru_ui_category(raw_category: str, tag: str) -> str:
    raw = (raw_category or "").strip().lower()
    tl = (tag or "").strip().lower()

    if not raw:
        return "general"

    if raw.startswith("namespace"):
        # The source file explodes any "namespaced" tag (contains ':') into a unique category,
        # which clutters the UI. Collapse them into a small set of common-sense buckets.
        if tl.startswith(("<", ">", ":")):
            return "expression"
        if _RE_DANBOORU_TIME_TAG.match(tl):
            return "general"
        return "fandom"

    mapped = _DANBOORU_CATEGORY_MAP.get(raw)
    if mapped:
        return mapped

    # Fallback: keep unknown categories (should be rare) but normalize to lowercase.
    return raw


def _parse_danbooru_tags_md(path: str) -> dict:
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    categories = {}
    all_items = []
    tag_set_lower = set()

    current_category_raw = ""
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.rstrip("\n")
                m_cat = _RE_DANBOORU_CATEGORY.match(line.strip())
                if m_cat:
                    current_category_raw = (m_cat.group(1) or "").strip()
                    continue

                m_tag = _RE_DANBOORU_TAG.match(line.strip())
                if not m_tag:
                    continue
                tag = (m_tag.group(1) or "").strip()
                if not tag:
                    continue
                try:
                    count = int(m_tag.group(2) or "0")
                except Exception:
                    count = 0

                category = _normalize_danbooru_ui_category(current_category_raw, tag)
                entry = {
                    "tag": tag,
                    "tag_lower": tag.lower(),
                    "count": count,
                    "category": category,
                    "category_raw": current_category_raw or "",
                }
                all_items.append(entry)
                tag_set_lower.add(entry["tag_lower"])
                if category:
                    if category not in categories:
                        categories[category] = {
                            "key": category,
                            "declared_count": None,
                            "items": [],
                        }
                    categories[category]["items"].append(entry)
    except Exception:
        raise

    # Sort categories by declared count (fallback to actual count)
    category_keys = list(categories.keys())
    category_keys.sort(
        key=lambda k: (
            -(categories[k].get("declared_count") or len(categories[k].get("items") or [])),
            k.lower(),
        )
    )

    # Sort items globally by popularity
    items_sorted = sorted(all_items, key=lambda e: (-int(e.get("count") or 0), e.get("tag_lower") or ""))

    # Pre-sort each category for popularity browsing
    for k in category_keys:
        categories[k]["items"] = sorted(
            categories[k].get("items") or [],
            key=lambda e: (-int(e.get("count") or 0), e.get("tag_lower") or ""),
        )

    tag_count_map = {e["tag_lower"]: int(e.get("count") or 0) for e in all_items}

    return {
        "categories": categories,
        "category_keys": category_keys,
        "items": all_items,
        "items_sorted": items_sorted,
        "tag_set_lower": tag_set_lower,
        "tag_count_map": tag_count_map,
    }


async def _get_danbooru_tags_index() -> dict:
    global _DANBOORU_TAGS_CACHE, _DANBOORU_TAGS_MTIME
    try:
        mtime = os.path.getmtime(DANBOORU_TAGS_FILE)
    except Exception:
        mtime = None
    async with _DANBOORU_TAGS_LOCK:
        if _DANBOORU_TAGS_CACHE is not None and _DANBOORU_TAGS_MTIME == mtime:
            return _DANBOORU_TAGS_CACHE
        try:
            data = await asyncio.to_thread(_parse_danbooru_tags_md, DANBOORU_TAGS_FILE)
        except Exception as e:
            logger.error("Failed to load danbooru_tags.md: %s", e)
            data = {
                "categories": {},
                "category_keys": [],
                "items": [],
                "items_sorted": [],
                "tag_set_lower": set(),
                "tag_count_map": {},
                "_error": str(e),
            }
        _DANBOORU_TAGS_CACHE = data
        _DANBOORU_TAGS_MTIME = mtime
        return data


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


def _load_workflow_types() -> dict:
    data = _load(WORKFLOW_TYPES_FILE, {"version": 1, "workflows": {}})
    workflows = data.get("workflows")
    return workflows if isinstance(workflows, dict) else {}


def _save_workflow_types(workflows: dict):
    _save(WORKFLOW_TYPES_FILE, {"version": 1, "workflows": workflows})


def _normalize_workflow_presets(data: dict) -> dict:
    if not isinstance(data, dict):
        return {"version": 2, "users": {}}
    if isinstance(data.get("users"), dict):
        return {"version": 2, "users": data.get("users", {})}
    workflows = data.get("workflows")
    workflows = workflows if isinstance(workflows, dict) else {}
    return {"version": 2, "users": {"default": {"workflows": workflows}}}


def _load_workflow_presets() -> dict:
    data = _load(WORKFLOW_PRESETS_FILE, {"version": 2, "users": {}})
    return _normalize_workflow_presets(data)


def _save_workflow_presets(data: dict):
    _save(WORKFLOW_PRESETS_FILE, _normalize_workflow_presets(data))


def _get_preset_user(request: web.Request) -> str:
    if auth.auth_enabled():
        token = auth.extract_token(request)
        verified = auth.verify_token(token)
        if verified:
            return verified[0]
    return "default"


# ---------------- Basic
@routes.get("/cozygen/hello")
async def hello(_):
    return web.json_response({"status": "ok"})


# ---------------- Gallery list (moved under /cozygen/api/)
_GALLERY_CACHE: dict = {}
_GALLERY_CACHE_TTL_SECONDS = 3.0
_GALLERY_CACHE_MAX = 64


def _is_ext_ok(name: str) -> bool:
    low = name.lower()
    return low.endswith(
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
    )


def _type_for(name: str) -> str:
    low = name.lower()
    if low.endswith((".mp4", ".webm", ".mov", ".mkv")):
        return "video"
    return "image"


def _kind_allowed(name: str, kind: str) -> bool:
    if kind == "all":
        return True
    if kind == "video":
        return _type_for(name) == "video"
    if kind == "image":
        return _type_for(name) == "image"
    return True


def _gallery_cache_key(
    subfolder: str,
    show_hidden: bool,
    recursive: bool,
    kind: str,
    page: int,
    per_page: int,
    bust: str,
    include_meta: bool,
):
    return (
        subfolder or "",
        bool(show_hidden),
        bool(recursive),
        kind or "all",
        int(page),
        int(per_page),
        bust or "",
        bool(include_meta),
    )


def _safe_json_loads(raw):
    if raw is None:
        return None
    if isinstance(raw, (bytes, bytearray)):
        try:
            raw = raw.decode("utf-8", errors="ignore")
        except Exception:
            return None
    if isinstance(raw, (dict, list)):
        return raw
    if not isinstance(raw, str):
        return None
    raw = raw.strip()
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _clean_text(value):
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.lower() == "none":
        return None
    return cleaned


def _looks_numeric(value: str) -> bool:
    if not isinstance(value, str):
        return False
    try:
        float(value.strip())
    except ValueError:
        return False
    return True


def _resolve_prompt_value(prompt_data: dict, value):
    cleaned = _clean_text(value)
    if cleaned:
        return cleaned
    if isinstance(value, (list, tuple)) and value:
        node_id = str(value[0])
        node = prompt_data.get(node_id) if isinstance(prompt_data, dict) else None
        if isinstance(node, dict):
            inputs = node.get("inputs") or {}
            if isinstance(inputs, dict):
                for key in ("value", "default_value", "text", "prompt", "text_g", "text_l", "string"):
                    resolved = _clean_text(inputs.get(key))
                    if resolved:
                        return resolved
    return None


def _first_string(prompt_data, inputs, keys):
    if not isinstance(inputs, dict):
        return None
    for key in keys:
        value = inputs.get(key)
        resolved = _resolve_prompt_value(prompt_data, value)
        if resolved:
            return resolved
    return None


def _collect_prompt_texts(prompt_data, inputs):
    if not isinstance(inputs, dict):
        return []
    parts = []
    text = _resolve_prompt_value(prompt_data, inputs.get("text"))
    if text:
        parts.append(text)
    text_g = _resolve_prompt_value(prompt_data, inputs.get("text_g"))
    text_l = _resolve_prompt_value(prompt_data, inputs.get("text_l"))
    if text_g or text_l:
        combined = " / ".join([p for p in (text_g, text_l) if p])
        if combined:
            parts.append(combined)
    prompt = _resolve_prompt_value(prompt_data, inputs.get("prompt"))
    if prompt:
        parts.append(prompt)
    return parts


def _collect_dynamic_inputs(prompt_data):
    if not isinstance(prompt_data, dict):
        return []
    targets = (
        "cozygendynamicinput",
        "cozygenchoiceinput",
        "cozygenstringinput",
        "cozygenfloatinput",
        "cozygenintinput",
    )
    results = []
    for node in prompt_data.values():
        if not isinstance(node, dict):
            continue
        class_type = node.get("class_type") or ""
        class_lower = str(class_type).lower()
        if class_lower not in targets:
            continue
        inputs = node.get("inputs") or {}
        if not isinstance(inputs, dict):
            continue
        param_name = _clean_text(inputs.get("param_name"))
        if not param_name:
            continue
        value = _resolve_prompt_value(prompt_data, inputs.get("value"))
        if not value:
            value = _resolve_prompt_value(prompt_data, inputs.get("default_value"))
        results.append((param_name.lower(), value))
    return results


def _summarize_prompt(prompt_data: dict):
    if not isinstance(prompt_data, dict):
        return None

    model_name = None
    prompt_candidates = []
    lora_names = []

    for node in prompt_data.values():
        if not isinstance(node, dict):
            continue
        class_type = node.get("class_type") or ""
        class_lower = str(class_type).lower()
        inputs = node.get("inputs") or {}
        if not isinstance(inputs, dict):
            continue

        if model_name is None and ("checkpoint" in class_lower or "ckpt" in class_lower):
            model_name = _first_string(
                prompt_data,
                inputs,
                ("ckpt_name", "checkpoint", "model_name", "ckpt", "base_model"),
            )

        if "lora" in class_lower:
            lora_name = _first_string(
                prompt_data,
                inputs,
                ("lora_name", "lora", "lora_1", "lora_2", "lora_a", "lora_b"),
            )
            if lora_name:
                lora_names.append(lora_name)

        if "cliptextencode" in class_lower:
            prompt_candidates.extend(_collect_prompt_texts(prompt_data, inputs))

    if prompt_data:
        for param_name, value in _collect_dynamic_inputs(prompt_data):
            if not value:
                continue
            if model_name is None and ("checkpoint" in param_name or "ckpt" in param_name):
                model_name = value
            if "prompt" in param_name:
                prompt_candidates.append(value)
            if "lora" in param_name:
                if "strength" in param_name or "weight" in param_name or "scale" in param_name:
                    continue
                if _looks_numeric(value):
                    continue
                lora_names.append(value)

    prompt_text = None
    if prompt_candidates:
        prompt_text = max(prompt_candidates, key=len)

    lora_unique = []
    seen = set()
    for name in lora_names:
        if name in seen:
            continue
        seen.add(name)
        lora_unique.append(name)

    if not (model_name or prompt_text or lora_unique):
        return None

    return {
        "model": model_name,
        "prompt": prompt_text,
        "loras": lora_unique,
    }


def _read_media_meta(base: str, item: dict):
    if not item or item.get("type") == "directory":
        return None
    filename = item.get("filename") or ""
    if not filename.lower().endswith(".png"):
        return None
    if _type_for(filename) != "image":
        return None
    subfolder = item.get("subfolder") or ""
    path = os.path.normpath(os.path.join(base, subfolder, filename))
    if not path.startswith(base):
        return None
    try:
        with Image.open(path) as im:
            info = im.info or {}
    except Exception:
        return None
    prompt_data = _safe_json_loads(info.get("prompt"))
    if not prompt_data:
        return None
    summary = _summarize_prompt(prompt_data) or {}
    return {**summary, "has_prompt": True}


def _read_prompt_payload(base: str, subfolder: str, filename: str):
    if not filename or not filename.lower().endswith(".png"):
        return None
    path = os.path.normpath(os.path.join(base, subfolder, filename))
    if not path.startswith(base):
        return None
    try:
        with Image.open(path) as im:
            info = im.info or {}
    except Exception:
        return None
    prompt_data = _safe_json_loads(info.get("prompt"))
    if not prompt_data:
        return None
    return {"prompt": prompt_data}


def _attach_media_meta(items, base: str):
    if not items:
        return items
    enriched = []
    for item in items:
        if not isinstance(item, dict) or item.get("type") == "directory":
            enriched.append(item)
            continue
        meta = _read_media_meta(base, item)
        if meta:
            enriched.append({**item, "meta": meta})
        else:
            enriched.append(item)
    return enriched


def _gallery_cache_get(key):
    entry = _GALLERY_CACHE.get(key)
    if not entry:
        return None
    if entry["expires"] < time.time():
        _GALLERY_CACHE.pop(key, None)
        return None
    return entry["data"]


def _gallery_cache_set(key, data):
    _GALLERY_CACHE[key] = {"data": data, "expires": time.time() + _GALLERY_CACHE_TTL_SECONDS}
    if len(_GALLERY_CACHE) > _GALLERY_CACHE_MAX:
        # drop oldest by expiry
        oldest = sorted(_GALLERY_CACHE.items(), key=lambda kv: kv[1]["expires"])[: len(_GALLERY_CACHE) - _GALLERY_CACHE_MAX]
        for k, _ in oldest:
            _GALLERY_CACHE.pop(k, None)


def _slice_items(dirs, files_sorted, files_total: int, page: int, per_page: int):
    start = (page - 1) * per_page
    end = start + per_page
    total = len(dirs) + files_total
    if per_page <= 0:
        return dirs + files_sorted, total

    if end <= len(dirs):
        return dirs[start:end], total

    items = []
    if start < len(dirs):
        items.extend(dirs[start:])
        remaining = end - len(dirs)
        if remaining > 0:
            items.extend(files_sorted[:remaining])
        return items, total

    offset = start - len(dirs)
    items.extend(files_sorted[offset:end - len(dirs)])
    return items, total


def _collect_recursive(path: str, base: str, show_hidden: bool, kind: str, needed_files: int):
    import heapq

    files_total = 0
    heap = []  # min-heap keyed by mtime
    collect_all = needed_files <= 0
    all_files = [] if collect_all else None
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if show_hidden or not d.startswith(".")]
        for fname in files:
            if not show_hidden and fname.startswith("."):
                continue
            if not _is_ext_ok(fname):
                continue
            if not _kind_allowed(fname, kind):
                continue
            files_total += 1
            full = os.path.join(root, fname)
            rel_sub = os.path.relpath(root, base).replace("\\", "/")
            if rel_sub == ".":
                rel_sub = ""
            mtime = os.path.getmtime(full)
            item = {
                "filename": fname,
                "type": "output",
                "subfolder": rel_sub,
                "mtime": mtime,
            }
            if collect_all:
                all_files.append((mtime, item))
                continue
            if len(heap) < needed_files:
                heapq.heappush(heap, (mtime, item))
            elif mtime > heap[0][0]:
                heapq.heapreplace(heap, (mtime, item))

    if collect_all:
        files_sorted = [i for _, i in sorted(all_files, key=lambda x: x[0], reverse=True)]
    else:
        files_sorted = [i for _, i in sorted(heap, key=lambda x: x[0], reverse=True)]
    return [], files_sorted, files_total


def _collect_non_recursive(path: str, subfolder: str, show_hidden: bool, kind: str, start: int, per_page: int):
    import heapq

    dirs = []
    files_buf = []
    with os.scandir(path) as it:
        for entry in it:
            name = entry.name
            if not show_hidden and name.startswith("."):
                continue
            try:
                is_dir = entry.is_dir()
            except OSError:
                continue
            if is_dir:
                try:
                    mtime = entry.stat().st_mtime
                except OSError:
                    mtime = 0
                dirs.append(
                    {
                        "filename": name,
                        "type": "directory",
                        "subfolder": os.path.join(subfolder, name).replace("\\", "/"),
                        "mtime": mtime,
                    }
                )
                continue

            if not _is_ext_ok(name) or not _kind_allowed(name, kind):
                continue
            try:
                mtime = entry.stat().st_mtime
            except OSError:
                mtime = 0
            files_buf.append((mtime, {
                "filename": name,
                "type": "output",
                "subfolder": subfolder.replace("\\", "/"),
                "mtime": mtime,
            }))

    files_total = len(files_buf)
    if per_page <= 0:
        files_sorted = [i for _, i in sorted(files_buf, key=lambda x: x[0], reverse=True)]
        return dirs, files_sorted, files_total

    end = (start - len(dirs) if start > len(dirs) else 0) + per_page
    needed_files = max(0, end)
    if needed_files and len(files_buf) > needed_files:
        top = heapq.nlargest(needed_files, files_buf, key=lambda x: x[0])
        files_sorted = [i for _, i in sorted(top, key=lambda x: x[0], reverse=True)]
    else:
        files_sorted = [i for _, i in sorted(files_buf, key=lambda x: x[0], reverse=True)]

    return dirs, files_sorted, files_total


async def _load_gallery(path: str, subfolder: str, base: str, show_hidden: bool, recursive: bool, kind: str, page: int, per_page: int):
    start = (page - 1) * per_page

    def _work():
        if recursive:
            needed_files = page * per_page if per_page > 0 else 0
            return _collect_recursive(path, base, show_hidden, kind, needed_files)
        return _collect_non_recursive(path, subfolder, show_hidden, kind, start, per_page)

    return await asyncio.to_thread(_work)


@routes.get("/cozygen/api/gallery")
async def gallery_list(request: web.Request):
    subfolder = request.rel_url.query.get("subfolder", "")
    show_hidden = request.rel_url.query.get("show_hidden", "0") in ("1", "true", "True")
    recursive = request.rel_url.query.get("recursive", "0") in ("1", "true", "True")
    kind = (request.rel_url.query.get("kind", "all") or "all").lower()
    include_meta = request.rel_url.query.get("include_meta", "0") in ("1", "true", "True")
    try:
        page = max(1, int(request.rel_url.query.get("page", "1")))
        per_page = int(request.rel_url.query.get("per_page", "20"))
    except ValueError:
        return web.json_response({"error": "bad paging"}, status=400)
    per_page = max(0, min(per_page, 500))

    base = folder_paths.get_output_directory()
    path = os.path.normpath(os.path.join(base, subfolder))
    if not path.startswith(base):
        return web.json_response({"error": "forbidden"}, status=403)
    if not os.path.isdir(path):
        return web.json_response({"error": "not found"}, status=404)

    cache_bust = request.rel_url.query.get("cache_bust", "")
    cache_key = _gallery_cache_key(
        subfolder,
        show_hidden,
        recursive,
        kind,
        page,
        per_page,
        cache_bust,
        include_meta,
    )
    cached = _gallery_cache_get(cache_key)
    if cached:
        return web.json_response(cached)

    dirs, files_sorted, files_total = await _load_gallery(path, subfolder, base, show_hidden, recursive, kind, page, per_page)

    items_page, total = _slice_items(dirs, files_sorted, files_total, page, per_page)
    if include_meta:
        items_page = _attach_media_meta(items_page, base)
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    data = {
        "items": items_page,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "total_items": total,
    }
    _gallery_cache_set(cache_key, data)
    return web.json_response(data)


@routes.get("/cozygen/api/gallery/prompt")
async def gallery_prompt(request: web.Request):
    filename = (request.rel_url.query.get("filename") or "").strip()
    subfolder = (request.rel_url.query.get("subfolder") or "").strip()
    if not filename:
        return web.json_response({"error": "missing filename"}, status=400)

    base = folder_paths.get_output_directory()
    payload = _read_prompt_payload(base, subfolder, filename)
    if not payload:
        return web.json_response({"error": "prompt metadata not found"}, status=404)

    return web.json_response(payload)


def _latest_mtime(path: str, recursive: bool, show_hidden: bool) -> float:
    newest = 0.0
    if recursive:
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if show_hidden or not d.startswith(".")]
            for fname in files:
                if not show_hidden and fname.startswith("."):
                    continue
                try:
                    mt = os.path.getmtime(os.path.join(root, fname))
                    if mt > newest:
                        newest = mt
                except OSError:
                    continue
    else:
        try:
            with os.scandir(path) as it:
                for entry in it:
                    name = entry.name
                    if not show_hidden and name.startswith("."):
                        continue
                    try:
                        mt = entry.stat().st_mtime
                    except OSError:
                        continue
                    if mt > newest:
                        newest = mt
        except FileNotFoundError:
            return 0.0
    return newest


@routes.get("/cozygen/api/gallery/stream")
async def gallery_stream(request: web.Request):
    """Server-Sent Events for gallery changes. Falls back to keepalive comments."""
    subfolder = request.rel_url.query.get("subfolder", "")
    show_hidden = request.rel_url.query.get("show_hidden", "0") in ("1", "true", "True")
    recursive = request.rel_url.query.get("recursive", "0") in ("1", "true", "True")

    base = folder_paths.get_output_directory()
    path = os.path.normpath(os.path.join(base, subfolder))
    if not path.startswith(base):
        raise web.HTTPForbidden(text="Invalid path")
    if not os.path.isdir(path):
        raise web.HTTPNotFound(text="Not found")

    resp = web.StreamResponse(
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
    await resp.prepare(request)
    await resp.write(b":ok\n\n")

    last = await asyncio.to_thread(_latest_mtime, path, recursive, show_hidden)
    keepalive_at = time.time() + 15
    try:
        while True:
            await asyncio.sleep(2)
            current = await asyncio.to_thread(_latest_mtime, path, recursive, show_hidden)
            now = time.time()
            if current > last:
                last = current
                payload = json.dumps(
                    {"subfolder": subfolder, "recursive": recursive, "mtime": current}
                )
                await resp.write(f"data: {payload}\n\n".encode("utf-8"))
                keepalive_at = now + 15
            elif now >= keepalive_at:
                await resp.write(b":keepalive\n\n")
                keepalive_at = now + 15
    except asyncio.CancelledError:
        pass
    finally:
        with contextlib.suppress(Exception):
            await resp.write_eof()
    return resp


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
    refresh = request.rel_url.query.get("refresh", "0") in ("1", "true", "True")
    cache_bust = request.rel_url.query.get("cache_bust", "")
    if refresh or cache_bust:
        folder_paths.filename_list_cache.pop(kind, None)
    if kind == "scheduler":
        return web.json_response({"choices": comfy.samplers.KSampler.SCHEDULERS})
    if kind == "sampler":
        return web.json_response({"choices": comfy.samplers.KSampler.SAMPLERS})
    if kind in valid_model_types:
        return web.json_response({"choices": folder_paths.get_filename_list(kind)})
    return web.json_response({"error": f"invalid type {kind}"}, status=400)


# ---------------- Aliases
@routes.get("/cozygen/api/aliases")
async def get_aliases(_):
    return web.json_response(_load(ALIASES_FILE, {}))


@routes.post("/cozygen/api/aliases")
async def post_aliases(request):
    _save(ALIASES_FILE, await request.json())
    return web.json_response({"status": "ok"})


# ---------------- Danbooru tags (browse + validate)
def _suggest_danbooru_tags(term: str, index: dict, limit: int = 8):
    if not term:
        return []
    q = term.strip().lower()
    if not q:
        return []

    tag_set = index.get("tag_set_lower") or set()
    items_sorted = index.get("items_sorted") or []

    # Common delimiter variants
    candidates = []
    for variant in (
        q.replace("_", "-"),
        q.replace("-", "_"),
        q.replace(" ", "_"),
        q.replace(" ", "-"),
    ):
        if variant != q and variant in tag_set:
            candidates.append(variant)

    # Substring search through popularity list (fast enough for a few invalid tags)
    parts = [p for p in re.split(r"[_\-\s]+", q) if p]
    for entry in items_sorted:
        tl = entry.get("tag_lower") or ""
        if not tl:
            continue
        if parts and not all(p in tl for p in parts):
            continue
        if q in tl or (parts and all(p in tl for p in parts)):
            candidates.append(entry.get("tag") or tl)
        if len(candidates) >= (limit * 4):
            break

    # Deduplicate while preserving popularity order
    seen = set()
    unique = []
    for c in candidates:
        cl = str(c).strip().lower()
        if not cl or cl in seen:
            continue
        seen.add(cl)
        unique.append(c)
        if len(unique) >= limit:
            break
    return unique


@routes.get("/cozygen/api/tags/categories")
async def get_tag_categories(_):
    index = await _get_danbooru_tags_index()
    if index.get("_error"):
        return web.json_response({"error": "danbooru tag reference unavailable"}, status=500)
    cats = []
    for key in index.get("category_keys") or []:
        info = (index.get("categories") or {}).get(key) or {}
        declared = info.get("declared_count")
        actual = len(info.get("items") or [])
        cats.append(
            {
                "key": key,
                "count": int(declared) if isinstance(declared, int) else int(actual),
                "actual": int(actual),
            }
        )
    return web.json_response({"categories": cats, "total": len(index.get("items") or [])})


@routes.get("/cozygen/api/tags/search")
async def search_tags(request: web.Request):
    index = await _get_danbooru_tags_index()
    if index.get("_error"):
        return web.json_response({"error": "danbooru tag reference unavailable"}, status=500)
    q = (request.rel_url.query.get("q", "") or "").strip().lower()
    category = (request.rel_url.query.get("category", "") or "").strip()
    sort = (request.rel_url.query.get("sort", "count") or "count").strip().lower()
    try:
        limit = max(1, min(200, int(request.rel_url.query.get("limit", "80"))))
    except Exception:
        limit = 80
    try:
        offset = max(0, int(request.rel_url.query.get("offset", "0")))
    except Exception:
        offset = 0

    # Select base list
    base = None
    if category:
        base = ((index.get("categories") or {}).get(category) or {}).get("items")
    if base is None:
        base = index.get("items_sorted") if sort != "alpha" else index.get("items")
    base = base or []

    # Filter
    if q:
        parts = [p for p in re.split(r"[_\-\s]+", q) if p]
        filtered = []
        for entry in base:
            tl = entry.get("tag_lower") or ""
            if not tl:
                continue
            if q in tl or (parts and all(p in tl for p in parts)):
                filtered.append(entry)
        base = filtered

    # Sort
    if sort == "alpha":
        base = sorted(base, key=lambda e: e.get("tag_lower") or "")
    else:
        # Default: already popularity-sorted for the common case
        if q:
            base = sorted(base, key=lambda e: (-int(e.get("count") or 0), e.get("tag_lower") or ""))

    total = len(base)
    slice_ = base[offset : offset + limit]

    items = [
        {
            "tag": e.get("tag") or "",
            "count": int(e.get("count") or 0),
            "category": e.get("category") or "",
        }
        for e in slice_
    ]
    return web.json_response(
        {
            "items": items,
            "total": int(total),
            "limit": int(limit),
            "offset": int(offset),
            "q": q,
            "category": category or "",
            "sort": sort,
        }
    )


@routes.post("/cozygen/api/tags/validate")
async def validate_tags(request: web.Request):
    payload = await request.json()
    tags = payload.get("tags") or []
    if not isinstance(tags, list):
        return web.json_response({"error": "tags must be a list"}, status=400)

    index = await _get_danbooru_tags_index()
    if index.get("_error"):
        return web.json_response({"error": "danbooru tag reference unavailable"}, status=500)
    tag_set = index.get("tag_set_lower") or set()

    invalid = []
    suggestions = {}
    seen = set()
    for raw in tags:
        if not isinstance(raw, str):
            continue
        tag = raw.strip()
        if not tag:
            continue
        tl = tag.lower()
        if tl in seen:
            continue
        seen.add(tl)
        if tl in tag_set:
            continue
        invalid.append(tag)
        suggestions[tag] = _suggest_danbooru_tags(tag, index, limit=8)

    return web.json_response({"invalid": invalid, "suggestions": suggestions})


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


@routes.get("/cozygen/api/workflow_presets")
async def workflow_presets_list(request: web.Request):
    workflow = (request.rel_url.query.get("workflow") or "").strip()
    data = _load_workflow_presets()
    user = _get_preset_user(request)
    workflows = (data.get("users", {}).get(user) or {}).get("workflows") or {}
    if workflow:
        presets = workflows.get(workflow, [])
        return web.json_response({"workflow": workflow, "presets": presets, "user": user})
    return web.json_response({"workflows": workflows, "user": user})


@routes.post("/cozygen/api/workflow_presets")
async def workflow_presets_save(request: web.Request):
    body = await request.json()
    workflow = (body.get("workflow") or "").strip()
    if not workflow:
        raise web.HTTPBadRequest(text="Missing workflow")

    data = _load_workflow_presets()
    user = _get_preset_user(request)
    workflows = (data.get("users", {}).get(user) or {}).get("workflows") or {}
    presets = workflows.get(workflow, [])
    if not isinstance(presets, list):
        presets = []

    delete_id = body.get("delete")
    if delete_id:
        delete_id = str(delete_id)
        presets = [p for p in presets if str(p.get("id")) != delete_id]
        workflows[workflow] = presets
        data.setdefault("users", {})[user] = {"workflows": workflows}
        _save_workflow_presets(data)
        return web.json_response({"status": "ok", "presets": presets, "user": user})

    preset = body.get("preset") or {}
    if not isinstance(preset, dict):
        raise web.HTTPBadRequest(text="Invalid preset")
    name = (preset.get("name") or "").strip()
    if not name:
        raise web.HTTPBadRequest(text="Missing preset name")

    preset_id = preset.get("id")
    values = preset.get("values") if isinstance(preset.get("values"), dict) else {}
    now = int(time.time())

    match_index = None
    if preset_id:
        preset_id = str(preset_id)
        for idx, existing in enumerate(presets):
            if str(existing.get("id")) == preset_id:
                match_index = idx
                break

    if match_index is None:
        for idx, existing in enumerate(presets):
            if str(existing.get("name") or "").strip().lower() == name.lower():
                match_index = idx
                preset_id = existing.get("id")
                break

    if not preset_id:
        preset_id = str(uuid.uuid4())

    existing_created = now
    if match_index is not None:
        existing_created = presets[match_index].get("created", now)

    payload = {
        "id": preset_id,
        "name": name,
        "values": values,
        "updated": now,
        "created": existing_created,
    }

    if match_index is None:
        presets.append(payload)
    else:
        presets[match_index] = payload

    presets = sorted(presets, key=lambda p: int(p.get("updated") or 0), reverse=True)
    workflows[workflow] = presets
    data.setdefault("users", {})[user] = {"workflows": workflows}
    _save_workflow_presets(data)
    return web.json_response({"status": "ok", "presets": presets, "preset": payload, "user": user})


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
