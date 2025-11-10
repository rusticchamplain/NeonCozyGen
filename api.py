from aiohttp import web
import os, json, uuid, mimetypes, shutil, subprocess
from pathlib import Path
from typing import Set
from PIL import Image, ImageOps, ImageDraw

import folder_paths
import comfy.samplers
import server  # keep import side-effects

routes = web.RouteTableDef()

EXT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(EXT_DIR, "data")
PRESETS_DIR = os.path.join(DATA_DIR, "presets")
THUMBS_DIR = os.path.join(DATA_DIR, "thumbs")
ALIASES_FILE = os.path.join(DATA_DIR, "aliases.json")
PROMPTS_FILE = os.path.join(DATA_DIR, "prompts.json")
WORKFLOW_TYPES_FILE = os.path.join(DATA_DIR, "workflow_types.json")
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
        with open(path, "r", encoding="utf-8") as f: return json.load(f)
    except Exception: return dflt

def _save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)

def _load_workflow_types() -> dict:
    data = _load(WORKFLOW_TYPES_FILE, {"version": 1, "workflows": {}})
    workflows = data.get("workflows")
    return workflows if isinstance(workflows, dict) else {}

def _save_workflow_types(workflows: dict):
    _save(WORKFLOW_TYPES_FILE, {"version": 1, "workflows": workflows})

# ---------------- Basic
@routes.get('/cozygen/hello')
async def hello(_): return web.json_response({"status": "ok"})

# ---------------- Gallery list (moved under /cozygen/api/)
@routes.get('/cozygen/api/gallery')
async def gallery_list(request: web.Request):
    subfolder = request.rel_url.query.get('subfolder', '')
    show_hidden = request.rel_url.query.get('show_hidden', '0') in ('1', 'true', 'True')
    try:
        page = int(request.rel_url.query.get('page', '1'))
        per_page = int(request.rel_url.query.get('per_page', '20'))
    except ValueError:
        return web.json_response({"error": "bad paging"}, status=400)

    base = folder_paths.get_output_directory()
    path = os.path.normpath(os.path.join(base, subfolder))
    if not path.startswith(base): return web.json_response({"error": "forbidden"}, status=403)
    if not os.path.isdir(path): return web.json_response({"error": "not found"}, status=404)

    items = []
    for name in os.listdir(path):
        if not show_hidden and name.startswith('.'):  # hide dot folders/files
            continue
        full = os.path.join(path, name)
        if os.path.isdir(full):
            items.append({"filename": name, "type": "directory",
                          "subfolder": os.path.join(subfolder, name).replace("\\","/"),
                          "mtime": os.path.getmtime(full)})
        else:
            low = name.lower()
            if low.endswith(('.png','.jpg','.jpeg','.gif','.webp','.bmp','.tif','.tiff','.mp4','.webm','.mov','.mkv','.mp3','.wav','.flac')):
                items.append({"filename": name, "type": "output",
                              "subfolder": subfolder.replace("\\","/"),
                              "mtime": os.path.getmtime(full)})

    dirs = [i for i in items if i["type"] == "directory"]
    files = [i for i in items if i["type"] != "directory"]
    files.sort(key=lambda x: x["mtime"], reverse=True)
    items = dirs + files

    total = len(items)
    total_pages = (total + per_page - 1)//per_page if per_page>0 else 1
    start = (page-1)*per_page; end = start+per_page
    page_items = items[start:end] if per_page>0 else items

    return web.json_response({"items": page_items, "page": page,
                              "per_page": per_page, "total_pages": total_pages,
                              "total_items": total})

# ---------------- Upload (inputs)
@routes.post('/cozygen/upload_image')
async def upload_image(request: web.Request):
    reader = await request.multipart()
    field = await reader.next()
    if not field or field.name != 'image': return web.json_response({"error":"image field"}, status=400)
    filename = field.filename or "upload"
    unique = f"{uuid.uuid4()}_{filename}"
    dest = os.path.join(folder_paths.get_input_directory(), unique)
    size = 0
    with open(dest, "wb") as f:
        while True:
            chunk = await field.read_chunk()
            if not chunk: break
            f.write(chunk); size += len(chunk)
    return web.json_response({"filename": unique, "size": size})

# ---------------- Workflows
@routes.get('/cozygen/workflows')
async def workflows(_):
    d = os.path.join(EXT_DIR, "workflows")
    if not os.path.isdir(d): return web.json_response({"workflows": []})
    return web.json_response({"workflows": [f for f in os.listdir(d) if f.endswith(".json")]})

@routes.get('/cozygen/workflows/{filename}')
async def workflow_one(request: web.Request):
    fn = request.match_info['filename']
    path = os.path.join(EXT_DIR, "workflows", fn)
    if not os.path.isfile(path): return web.json_response({"error":"not found"}, status=404)
    try:
        with open(path, "r", encoding="utf-8") as f: return web.json_response(json.load(f))
    except json.JSONDecodeError: return web.json_response({"error":"bad json"}, status=400)

# ---------------- Choices
valid_model_types = folder_paths.folder_names_and_paths.keys()
_alias = {"samplers_list":"sampler","schedulers_list":"scheduler","unet":"unet_gguf"}

@routes.get('/cozygen/get_choices')
async def get_choices(request: web.Request):
    kind = request.rel_url.query.get('type','')
    if not kind: return web.json_response({"error":"missing type"}, status=400)
    kind = _alias.get(kind, kind)
    if kind == "scheduler":
        return web.json_response({"choices": comfy.samplers.KSampler.SCHEDULERS})
    if kind == "sampler":
        return web.json_response({"choices": comfy.samplers.KSampler.SAMPLERS})
    if kind in valid_model_types:
        return web.json_response({"choices": folder_paths.get_filename_list(kind)})
    return web.json_response({"error": f"invalid type {kind}"}, status=400)

# ---------------- Aliases/Prompts (kept for compatibility)
@routes.get('/cozygen/api/aliases')
async def get_aliases(_): return web.json_response(_load(ALIASES_FILE, {}))
@routes.post('/cozygen/api/aliases')
async def post_aliases(request): _save(ALIASES_FILE, await request.json()); return web.json_response({"status":"ok"})
@routes.get('/cozygen/api/prompts')
async def get_prompts(_): return web.json_response(_load(PROMPTS_FILE, {}))
@routes.post('/cozygen/api/prompts')
async def post_prompts(request): _save(PROMPTS_FILE, await request.json()); return web.json_response({"status":"ok"})

# ---------------- Input browser
INPUT_DIR = Path(folder_paths.get_input_directory()).resolve()
def _safe_join_input(base: Path, rel: str) -> Path:
    rel = (rel or "").strip().lstrip("/").replace("\\","/")
    p = (base / rel).resolve()
    if base not in p.parents and p != base: raise web.HTTPBadRequest(text="Invalid path")
    return p

def _list_input_dir(base: Path, subfolder: str, page: int, per_page: int, exts: Set[str]):
    root = _safe_join_input(base, subfolder)
    if not root.exists() or not root.is_dir():
        return {"items": [], "page": page, "per_page": per_page, "total_pages": 0,
                "total_items": 0, "cwd": "", "base": str(base)}
    ents = []
    for d in sorted([p for p in root.iterdir() if p.is_dir()], key=lambda x: x.name.lower()):
        st = d.stat()
        ents.append({"name": d.name, "rel_path": str(d.relative_to(base)).replace("\\","/"),
                     "is_dir": True, "size":0, "mtime": int(st.st_mtime)})
    for f in sorted([p for p in root.iterdir() if p.is_file()], key=lambda x: x.name.lower()):
        if exts and f.suffix.lower().lstrip(".") not in exts: continue
        st = f.stat()
        ents.append({"name": f.name, "rel_path": str(f.relative_to(base)).replace("\\","/"),
                     "is_dir": False, "size": int(st.st_size), "mtime": int(st.st_mtime)})
    total = len(ents)
    total_pages = (total + per_page - 1)//per_page if per_page>0 else 1
    start = (page-1)*per_page; end = start+per_page
    slice_ = ents if per_page<=0 else ents[start:end]
    return {"items": slice_, "page": page, "per_page": per_page, "total_pages": total_pages,
            "total_items": total, "cwd": str(root.relative_to(base)).replace("\\","/") if root!=base else "", "base": str(base)}

@routes.get('/cozygen/input')
async def input_list(request: web.Request):
    subfolder = request.rel_url.query.get("subfolder","").strip("/")
    page = int(request.rel_url.query.get("page","1"))
    per_page = int(request.rel_url.query.get("per_page","50"))
    exts = set([e.strip().lower() for e in request.rel_url.query.get("exts","jpg,jpeg,png,webp,bmp,tif,tiff,gif").split(",") if e.strip()])
    return web.json_response(_list_input_dir(INPUT_DIR, subfolder, page, per_page, exts))

@routes.get('/cozygen/input/file')
async def input_file(request: web.Request):
    rel = request.rel_url.query.get("path"); 
    if not rel: raise web.HTTPBadRequest(text="Missing path")
    p = _safe_join_input(INPUT_DIR, rel)
    if not p.exists() or not p.is_file(): raise web.HTTPNotFound(text="File not found")
    mime = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
    return web.FileResponse(path=str(p), headers={"Content-Type": mime})

# ---------------- Presets
def _presets_path(wf: str) -> str:
    safe = "".join(c for c in (wf or "default") if c.isalnum() or c in ("-","_","."))
    return os.path.join(PRESETS_DIR, f"{safe}.json")
def _read_presets(wf: str) -> dict:
    p = _presets_path(wf)
    return _load(p, {"version":1,"items":{}})
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
    wf = request.rel_url.query.get("workflow","default")
    return web.json_response(_read_presets(wf))

@routes.post("/cozygen/api/presets")
async def presets_save(request: web.Request):
    wf = request.rel_url.query.get("workflow","default")
    body = await request.json()
    name = (body.get("name") or "").strip()
    if not name: raise web.HTTPBadRequest(text="Missing name")
    values = body.get("values") or {}
    meta = body.get("meta") if "meta" in body else None
    data = _read_presets(wf)
    existing = data.get("items", {}).get(name)
    entry = _ensure_entry(values, meta, existing)
    data.setdefault("items", {})[name] = entry
    if isinstance(entry, dict) and "values" in entry:
        data["version"] = max(2, data.get("version", 1))
    _write_presets(wf, data); return web.json_response({"status":"ok"})

@routes.delete("/cozygen/api/presets")
async def presets_delete(request: web.Request):
    wf = request.rel_url.query.get("workflow","default")
    name = (request.rel_url.query.get("name") or "").strip()
    data = _read_presets(wf)
    if name in data["items"]:
        del data["items"][name]
        _write_presets(wf, data)
    return web.json_response({"status":"ok"})

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
    return folder_paths.get_input_directory() if (which or "").lower()=="input" else folder_paths.get_output_directory()

def _thumb_dest_path(which: str, subfolder: str, filename: str, w: int) -> str:
    safe_sub = (subfolder or "").strip().strip("/").replace("\\","/")
    dest_dir = os.path.join(THUMBS_DIR, which, safe_sub); os.makedirs(dest_dir, exist_ok=True)
    name, _ = os.path.splitext(filename)
    return os.path.join(dest_dir, f"{name}__w{w}.jpg")

def _thumb_headers(etag: str) -> dict:
    return {"Cache-Control":"public, max-age=31536000, immutable","ETag":etag,"Content-Type":"image/jpeg"}

def _make_image_thumb(src: str, dest: str, w: int):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((w, w), Image.Resampling.LANCZOS)
        im.save(dest, "JPEG", quality=85, optimize=True, progressive=True)

def _make_video_thumb(src: str, dest: str, w: int):
    if shutil.which("ffmpeg"):
        cmd = ["ffmpeg","-y","-ss","0.10","-i",src,"-vframes","1","-vf",f"scale='min({w},iw)':-1","-q:v","5",dest]
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            if os.path.exists(dest) and os.path.getsize(dest)>0: return
        except Exception: pass
    H = int(w*9/16)
    img = Image.new("RGB", (w,H), (40,40,48))
    d = ImageDraw.Draw(img); d.polygon([(int(w*0.38),int(H*0.30)),(int(w*0.72),int(H*0.50)),(int(w*0.38),int(H*0.70))], fill=(240,240,240))
    img.save(dest, "JPEG", quality=85, optimize=True, progressive=True)

@routes.get("/cozygen/thumb")
async def thumb(request: web.Request):
    which = (request.rel_url.query.get("type") or "output").lower()
    filename = request.rel_url.query.get("filename"); subfolder = request.rel_url.query.get("subfolder","")
    w = max(96, min(1024, int(request.rel_url.query.get("w","384"))))
    if not filename: raise web.HTTPBadRequest(text="Missing filename")
    base = _thumb_src_base(which)
    src = os.path.normpath(os.path.join(base, subfolder, filename))
    if not src.startswith(base): raise web.HTTPForbidden(text="Invalid path")
    if not os.path.isfile(src): raise web.HTTPNotFound(text="Source not found")
    st = os.stat(src); etag = f'W/"{int(st.st_mtime)}-{st.st_size}-w{w}"'
    if request.headers.get("If-None-Match")==etag:
        return web.Response(status=304, headers=_thumb_headers(etag))
    dest = _thumb_dest_path(which, subfolder, filename, w)
    need = True
    if os.path.exists(dest):
        if st.st_mtime <= os.stat(dest).st_mtime: need = False
    if need:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        ext = os.path.splitext(filename)[1].lower()
        try:
            if ext in (".png",".jpg",".jpeg",".gif",".webp",".bmp",".tif",".tiff"): _make_image_thumb(src, dest, w)
            elif ext in (".mp4",".webm",".mov",".mkv"): _make_video_thumb(src, dest, w)
            else: _make_video_thumb(src, dest, w)
        except Exception: _make_video_thumb(src, dest, w)
    return web.FileResponse(dest, headers=_thumb_headers(etag))
