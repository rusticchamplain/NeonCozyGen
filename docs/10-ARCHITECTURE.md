# 10 - Architecture

## Subsystem diagram (text)

CozyGen is a single product split into backend and frontend:

```
ComfyUI Server (PromptServer)
  - __init__.py
    - registers CozyGen API routes
    - mounts auth middleware
    - serves /cozygen/ and /cozygen/assets
  - api.py
    - gallery API, tags, aliases, workflow presets
    - thumbnail generation and cache
    - auth endpoints
  - nodes.py
    - CozyGenDynamicInput and CozyGenImageInput
  - auth.py
    - cookie + bearer token auth

Data / persistence
  - data/aliases.json
  - data/workflow_types.json
  - data/workflow_presets.json
  - data/danbooru_tags.md
  - data/thumbs/ (generated)

Frontend (React + Vite)
  - js/src/app/ (App shell, routing)
  - js/src/features/* (gallery, composer, tags, aliases, workflow)
  - js/src/ui/* (primitives, composites, layout)
  - js/src/services/api.js (API client)
  - js/src/styles/* (tokens, base, ui-kit, feature styles)

ComfyUI Web Extension
  - js/web/* (node UI extensions)
```

## Data flow (UI -> state -> API -> persistence)

1) UI interactions
   - Pages and components in `js/src/features/*` update local state and context.
   - `StudioContext` aggregates workflow data, dynamic inputs, and alias catalog.

2) API access
   - `js/src/services/api.js` calls `/cozygen/*` endpoints or `/prompt` for queueing.
   - Auth tokens are added by `features/auth/utils/auth`.

3) Backend processing
   - `api.py` reads and writes files under `data/`.
   - Gallery reads ComfyUI output directories via `folder_paths`.
   - Thumbnails are generated and cached under `data/thumbs/`.

4) Persistence
   - Aliases and workflow presets are JSON files in `data/`.
   - Tag reference data is `data/danbooru_tags.md`.
   - Gallery output is on disk in ComfyUI output folders.

## Trust boundaries and assumptions

- Auth is optional. If enabled, requests to `/cozygen/api/*` and `/prompt` require a valid token.
- The frontend assumes the ComfyUI server is reachable (default `127.0.0.1:8188`).
- `useExecutionQueue` uses WebSocket `/ws` for progress signals.
- Gallery auto-refresh uses SSE at `/cozygen/api/gallery/stream` with a polling fallback.

## API surface (high level)

- Workflows and choices
  - `GET /cozygen/workflows`
  - `GET /cozygen/workflows/{filename}`
  - `GET /cozygen/get_choices`
- Queueing and input
  - `POST /prompt`
  - `POST /cozygen/upload_image`
  - `GET /cozygen/input`
- Gallery and thumbnails
  - `GET /cozygen/api/gallery`
  - `GET /cozygen/api/gallery/prompt`
  - `POST /cozygen/api/gallery/delete`
  - `GET /cozygen/api/gallery/stream`
  - `GET /cozygen/thumb`
  - `POST /cozygen/api/clear_cache`
- Aliases and tags
  - `GET/POST /cozygen/api/aliases`
  - `GET /cozygen/api/tags/categories`
  - `GET /cozygen/api/tags/search`
  - `POST /cozygen/api/tags/validate`
- Workflow presets/types
  - `GET/POST /cozygen/api/workflow_types`
  - `GET/POST /cozygen/api/workflow_presets`
- Auth
  - `POST /cozygen/api/login`
  - `GET /cozygen/api/auth_status`
  - `POST /cozygen/api/logout`
## Key responsibilities by module

- `__init__.py`: wiring routes, static assets, and auth middleware.
- `auth.py`: auth policy and token verification.
- `api.py`: data-backed endpoints and thumbnail generation.
- `nodes.py`: custom ComfyUI nodes for dynamic inputs and image inputs.
- `js/src/app/*`: app shell, routing, and top-level layout.
- `js/src/features/workflow/*`: dynamic form, workflow selection, prompt queueing.
- `js/src/features/composer/*`: prompt composer UI and tag/alias tools.
- `js/src/features/gallery/*`: gallery browsing, re-run, metadata, delete.
- `js/src/ui/*`: global primitives and composites (do not fork in feature code).
