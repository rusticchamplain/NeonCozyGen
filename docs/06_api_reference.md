# API Reference (Current State)

This section lists backend endpoints implemented in `api.py` and used by the frontend. For each endpoint, only the behaviors visible in the repository are described.

## Health
- `GET /cozygen/hello` -> `{"status":"ok"}`. (`api.py`:269-272)

## Gallery
- `GET /cozygen/api/gallery`
  - Query: `subfolder`, `show_hidden`, `recursive`, `kind`, `include_meta`, `page`, `per_page`, `cache_bust`. (`api.py`:765-796)
  - Response: `items`, `page`, `per_page`, `total_pages`, `total_items` (plus optional `meta` per item when `include_meta=1`). (`api.py`:803-815)
- `GET /cozygen/api/gallery/prompt`
  - Query: `filename`, `subfolder`. (`api.py`:818-823)
  - Response: `{"prompt": <promptData>, "cozygen_prompt_raw": <rawMap?>}` when metadata exists. (`api.py`:571-591, 818-831)
- `POST /cozygen/api/gallery/delete`
  - Body: `{"filename": "...", "subfolder": "..."}`. (`api.py`:856-864)
  - Response: `{"ok": true, "filename": "...", "subfolder": "..."}`. (`api.py`:881-884)
- `POST /cozygen/api/gallery/delete_all`
  - Body: `{"confirm":"delete-all"|"delete_all"|"deleteall", "subfolder": "...", "recursive": true|false}`. (`api.py`:911-924)
  - Response: `{"ok": true, "deleted": <int>, "errors"?: [...]}`. (`api.py`:932-940)
- `GET /cozygen/api/gallery/stream`
  - Server-Sent Events stream for folder changes. (`api.py`:975-1022)

## Uploads and Inputs
- `POST /cozygen/upload_image`
  - Multipart form field `image`; stores file in input directory with UUID prefix. (`api.py`:1026-1043)
  - Response: `{"filename": "...", "size": <bytes>}`. (`api.py`:1043)
- `GET /cozygen/input`
  - Query: `subfolder`, `page`, `per_page`, `exts` (comma-separated). (`api.py`:1347-1358)
  - Response: directory listing with `items`, `page`, `per_page`, `total_pages`, `total_items`, `cwd`, `base`. (`api.py`:1336-1344, 1347-1359)
- `GET /cozygen/input/file`
  - Query: `path` to a file within the input directory. (`api.py`:1362-1371)
  - Response: file content with guessed Content-Type. (`api.py`:1368-1371)

## Workflows
- `GET /cozygen/workflows`
  - Response: `{"workflows": ["*.json", ...]}` from `workflows/` directory. (`api.py`:1047-1052)
- `GET /cozygen/workflows/{filename}`
  - Response: parsed JSON workflow, or `{"error":"not found"}` / `{"error":"bad json"}`. (`api.py`:1055-1065)
- `GET /cozygen/get_choices`
  - Query: `type`, `refresh`, `cache_bust`. (`api.py`:1073-1082)
  - Response: `{"choices": [...]}` for model types, samplers, or schedulers. (`api.py`:1083-1089)

## Aliases
- `GET /cozygen/api/aliases` -> returns raw JSON from `data/aliases.json`. (`api.py`:1093-1095)
- `POST /cozygen/api/aliases` -> writes JSON to `data/aliases.json`, response `{"status":"ok"}`. (`api.py`:1098-1101)

## Tags (Danbooru)
- `GET /cozygen/api/tags/categories` -> `{"categories": [{"key","count","actual"}], "total": <int>}`. (`api.py`:1153-1171)
- `GET /cozygen/api/tags/search`
  - Query: `q`, `category`, `sort`, `limit`, `offset`, `min_count`. (`api.py`:1173-1193)
  - Response: `{"items": [{"tag","count","category"}], "total", "limit", "offset", "q", "category", "sort"}`. (`api.py`:1228-1246)
- `POST /cozygen/api/tags/validate`
  - Body: `{"tags": ["tag1", ...]}`. (`api.py`:1249-1254)
  - Response: `{"invalid": [..], "suggestions": {"tag": [..]}}`. (`api.py`:1261-1279)

## Workflow Types and Presets
- `GET /cozygen/api/workflow_types` -> `{"workflows": <map>, "choices": [..]}`. (`api.py`:1374-1376)
- `POST /cozygen/api/workflow_types` -> saves or deletes workflow mode mapping. (`api.py`:1379-1394)
- `GET /cozygen/api/workflow_presets` -> `{"workflows": <map>, "user": "..."}` or `{"workflow": "...", "presets": [...], "user": "..."}`. (`api.py`:1397-1407)
- `POST /cozygen/api/workflow_presets` -> create/update/delete presets, returns updated preset list. (`api.py`:1409-1482)

## Thumbnails and Cache
- `GET /cozygen/thumb`
  - Query: `type` (input/output), `filename`, `subfolder`, `w` (width). (`api.py`:1544-1553)
  - Response: JPEG thumbnail with cache headers. (`api.py`:1560-1579)
- `POST /cozygen/api/clear_cache` -> clears thumbnail directory and gallery cache. (`api.py`:1582-1596)

## Auth
- `POST /cozygen/api/login` -> `{"token","user","expires_in","default_credentials"}` and sets cookie. (`api.py`:1601-1636)
- `GET /cozygen/api/auth_status` -> authenticated state and user, or 401 if invalid. (`api.py`:1639-1665)
- `POST /cozygen/api/logout` -> `{"status":"ok"}` and clears cookie. (`api.py`:1669-1673)

## External/Unimplemented in This Repo
- `POST /prompt` is called by the frontend to queue prompts, but it is not implemented in this repository. The request is part of the ComfyUI server API. (`js/src/services/api.js`:61-69)
