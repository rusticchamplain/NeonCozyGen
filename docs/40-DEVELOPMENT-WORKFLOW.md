# 40 - Development Workflow

## Frontend commands (run from `js/`)

- Install deps:
  - `npm install`
- Start dev server:
  - `npm run dev`
- Run tests:
  - `npm run test:run`
- Watch tests:
  - `npm run test`
- Lint:
  - `npm run lint`
- Build for ComfyUI:
  - `npm run build`
- Preview build:
  - `npm run preview`

The Vite dev server proxies `/cozygen/*` to `http://127.0.0.1:8188`.

## Backend setup

- Install Python deps in the ComfyUI environment:
  - `pip install -r requirements.txt`
- Optional dev tools:
  - `pip install -r requirements-dev.txt`

## Basic dev loop

1) Start ComfyUI.
2) Run the frontend dev server from `js/`.
3) Use the app at `http://localhost:5173/cozygen/`.

For production behavior, build the frontend and let ComfyUI serve `/cozygen/` from `js/dist`.

## Debugging tips

- If the UI shows "Build not found", run `npm run build` in `js/`.
- If API requests fail, confirm ComfyUI is running at `127.0.0.1:8188`.
- Use browser devtools to inspect network requests to `/cozygen/api/*`.
- Authentication failures surface as 401 responses; check `.env` and auth status.
