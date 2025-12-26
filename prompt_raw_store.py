import json
import os
import threading
import time

EXT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(EXT_DIR, "data")
PROMPT_RAW_FILE = os.path.join(DATA_DIR, "prompt_raw_store.json")

_MAX_PROMPTS = 2000
_MAX_FILES = 4000
_LOCK = threading.Lock()
_CACHE = None


def _empty_store():
    return {"version": 1, "prompts": {}, "files": {}}


def _load_store():
    try:
        with open(PROMPT_RAW_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return _empty_store()

    if not isinstance(data, dict):
        return _empty_store()

    prompts = data.get("prompts")
    files = data.get("files")
    if not isinstance(prompts, dict):
        prompts = {}
    if not isinstance(files, dict):
        files = {}
    return {"version": 1, "prompts": prompts, "files": files}


def _save_store(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(PROMPT_RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _ensure_cache():
    global _CACHE
    if _CACHE is None:
        _CACHE = _load_store()
    return _CACHE


def _normalize_subfolder(subfolder):
    if not subfolder:
        return ""
    return str(subfolder).replace("\\", "/").strip("/")


def _build_file_key(filename, subfolder):
    if not filename:
        return ""
    sub = _normalize_subfolder(subfolder)
    return f"{sub}::{filename}" if sub else str(filename)


def _sanitize_raw_map(raw_map):
    if not isinstance(raw_map, dict):
        return {}
    cleaned = {}
    for key, value in raw_map.items():
        if not isinstance(key, str):
            continue
        if not isinstance(value, str):
            continue
        key = key.strip()
        if not key:
            continue
        cleaned[key] = value
    return cleaned


def _prune_store(data):
    prompts = data.get("prompts") or {}
    files = data.get("files") or {}

    if len(prompts) > _MAX_PROMPTS:
        ordered = sorted(prompts.items(), key=lambda item: item[1].get("ts", 0))
        to_remove = {pid for pid, _ in ordered[: len(prompts) - _MAX_PROMPTS]}
        for pid in to_remove:
            prompts.pop(pid, None)
        if to_remove:
            for key, entry in list(files.items()):
                if entry.get("prompt_id") in to_remove:
                    files.pop(key, None)

    if len(files) > _MAX_FILES:
        ordered_files = sorted(files.items(), key=lambda item: item[1].get("ts", 0))
        for key, _ in ordered_files[: len(files) - _MAX_FILES]:
            files.pop(key, None)


def remove_prompt_file(filename, subfolder=""):
    key = _build_file_key(filename, subfolder)
    if not key:
        return False
    with _LOCK:
        data = _ensure_cache()
        files = data.setdefault("files", {})
        if key in files:
            files.pop(key, None)
            _save_store(data)
            return True
    return False


def store_prompt_raw(prompt_id, raw_map):
    if not prompt_id:
        return False
    cleaned = _sanitize_raw_map(raw_map)
    if not cleaned:
        return False
    ts = time.time()
    with _LOCK:
        data = _ensure_cache()
        data.setdefault("prompts", {})[str(prompt_id)] = {"raw": cleaned, "ts": ts}
        _prune_store(data)
        _save_store(data)
    return True


def record_prompt_output(prompt_id, filename, subfolder=""):
    if not prompt_id or not filename:
        return False
    key = _build_file_key(filename, subfolder)
    if not key:
        return False
    ts = time.time()
    with _LOCK:
        data = _ensure_cache()
        data.setdefault("files", {})[key] = {"prompt_id": str(prompt_id), "ts": ts}
        _prune_store(data)
        _save_store(data)
    return True


def get_prompt_raw_by_file(filename, subfolder=""):
    key = _build_file_key(filename, subfolder)
    if not key:
        return None
    with _LOCK:
        data = _ensure_cache()
        entry = (data.get("files") or {}).get(key) or {}
        prompt_id = entry.get("prompt_id")
        if not prompt_id:
            return None
        prompt_entry = (data.get("prompts") or {}).get(prompt_id) or {}
        raw = prompt_entry.get("raw")
        if isinstance(raw, dict) and raw:
            return raw
    return None
