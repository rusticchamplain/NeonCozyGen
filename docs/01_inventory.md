# Inventory

## Purpose (as implemented)
- The backend registers CozyGen as a ComfyUI custom node package, mounts HTTP routes, and serves the built frontend at `/cozygen` from `js/dist` via the ComfyUI server instance. (`__init__.py`:5-63)
- The frontend provides a multi-page UI for studio landing, workflow controls, prompt composition, gallery browsing, and alias/tag management as routed in the app shell. (`js/src/app/App.jsx`:95-118)
- I cannot confirm any other product purpose beyond the in-app copy and route structure shown above; no authoritative README remains in the repo.

## Tech Stack
- Python backend with aiohttp routes and ComfyUI server integration. (`api.py`:1-24, `__init__.py`:5-39)
- Python dependencies declared for runtime: `aiohttp`, `imageio`, `imageio-ffmpeg`. (`requirements.txt`:1-3)
- JavaScript frontend built with React and Vite. (`js/package.json`:1-19, 2-15)
- Frontend testing uses Vitest and Testing Library. (`js/package.json`:6-23, 12-18)
- Linting/type tooling configured with ESLint (frontend) and Ruff/Mypy (backend). (`js/package.json`:8-10, `pyproject.toml`:1-16)

## Directory Map
- `api.py`: Aiohttp route table and backend API handlers. (`api.py`:24-1669)
- `auth.py`: Auth middleware and token signing/verification. (`auth.py`:13-127)
- `nodes.py`: ComfyUI node definitions (inputs/outputs). (`nodes.py`:45-505)
- `prompt_raw_store.py`: Prompt raw persistence store and helpers. (`prompt_raw_store.py`:1-159)
- `data/`: Runtime data files (aliases, tags, presets, prompt raw store, thumbnails). (`api.py`:27-48, `prompt_raw_store.py`:6-43)
- `js/`: Frontend source, build output, and web extension assets. (`js/package.json`:1-23; `__init__.py`:41-61)
- `scripts/`: Utility script(s), e.g., tag reclassification. (`scripts/reclassify_danbooru_tags.py`:1-200)
- `workflows/`: Workflow JSON files served by the backend. (`api.py`:1047-1064)

## Entry Points
- Backend entry: module import registers API routes, auth middleware, and static file serving with ComfyUI’s `PromptServer`. (`__init__.py`:5-63)
- Frontend entry: React root mounts `App` in `js/src/app/main.jsx`. (`js/src/app/main.jsx`:1-9)
- Frontend routing: HashRouter routes for `/login`, `/studio`, `/controls`, `/compose`, `/gallery`, `/library`, `/aliases`, `/tags`. (`js/src/app/App.jsx`:95-118)

## Environments (Dev vs Prod behavior as coded)
- If the frontend build is missing, the backend returns an error message instructing `npm run build` in `js`. (`__init__.py`:41-49)
- The backend serves static assets from `js/dist/assets` under `/cozygen/assets`. (`__init__.py`:57-61)
- Vite dev server command exists but the repo does not wire it into the Python runtime; usage is only defined via scripts. (`js/package.json`:5-7)

## Build/Run Commands (as declared)
- Frontend dev server: `npm run dev`. (`js/package.json`:5-6)
- Frontend production build: `npm run build`. (`js/package.json`:6-8)
- Frontend tests: `npm test` or `npm run test:run`. (`js/package.json`:8-10)
- No backend CLI entrypoints are defined in this repository; CozyGen is initialized via module import in the ComfyUI runtime. (`__init__.py`:5-63)
