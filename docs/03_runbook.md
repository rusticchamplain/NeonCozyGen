# Runbook (Current State)

## Prerequisites (as implied by code)
- Python 3.11 is referenced in lint/type config. (`pyproject.toml`:8-16)
- Python runtime dependencies include `aiohttp`, `imageio`, and `imageio-ffmpeg`. (`requirements.txt`:1-3)
- Node.js tooling for the frontend is defined via `package.json` scripts (Vite, React, Vitest). (`js/package.json`:1-23)
- CozyGen is loaded by a ComfyUI server runtime and registers routes on import. I cannot confirm the exact installation steps from the repository itself. (`__init__.py`:5-63)

## Frontend (UI)
- Install dependencies (frontend): `npm install` in `js/`. (Scripts assume npm; `js/package.json`:5-10)
- Run development server: `npm run dev` in `js/`. (`js/package.json`:5-6)
- Build production assets: `npm run build` in `js/`. (`js/package.json`:6-8)

## Backend (ComfyUI integration)
- CozyGen’s backend behavior is initialized when the package is imported by ComfyUI. It mounts API routes, auth middleware, and static assets to the ComfyUI server instance. (`__init__.py`:28-63)
- The backend serves the frontend from `js/dist`. If this build is missing, the server returns a 500 response with an instruction to run `npm run build` in `js`. (`__init__.py`:41-49)

## Authentication
- Authentication is enabled by setting environment variables `COZYGEN_AUTH_USER` and `COZYGEN_AUTH_PASS`. (`auth.py`:32-36, 58-66)
- Token TTL and secret are controlled via `COZYGEN_AUTH_TTL` and `COZYGEN_AUTH_SECRET`. (`auth.py`:35-38)
- The login endpoint returns a token and sets an HttpOnly cookie. (`api.py`:1601-1636)

## Data Files (local)
- Aliases: `data/aliases.json` is read/written through `/cozygen/api/aliases`. (`api.py`:30-31, 1093-1101)
- Workflow presets: `data/workflow_presets.json` is managed through `/cozygen/api/workflow_presets`. (`api.py`:32, 1397-1482)
- Workflow types: `data/workflow_types.json` is managed through `/cozygen/api/workflow_types`. (`api.py`:31, 1374-1394)
- Prompt raw store: `data/prompt_raw_store.json` is managed by `prompt_raw_store.py`. (`prompt_raw_store.py`:8-159)

## Notes on What I Cannot Confirm
- The repo does not define a single command to start ComfyUI or install the custom node. I cannot confirm an installation procedure beyond the ComfyUI integration shown in `__init__.py`. (`__init__.py`:5-63)
