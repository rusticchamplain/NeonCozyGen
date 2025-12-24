# 00 - Onboarding

## Mental model

CozyGen is a ComfyUI custom node package with two halves:

1) Backend (Python, aiohttp) mounted inside the ComfyUI server.
   - Routes live in `api.py` and are registered in `__init__.py`.
   - Auth middleware lives in `auth.py`.
   - Custom nodes live in `nodes.py` and expose dynamic inputs to the UI.
   - Data files live under `data/` (aliases, workflows, tag reference).

2) Frontend (React, Vite) served at `/cozygen/`.
   - App shell and routing live in `js/src/app/`.
   - Features live in `js/src/features/<feature>/`.
   - UI primitives live in `js/src/ui/` and are styled in `js/src/styles/`.

Think of it as a single product with a shared contract:
- The backend owns persistence and ComfyUI integration.
- The frontend owns interaction and presentation.
- The API contract under `/cozygen/api/*` is the seam between them.

## First tasks for a new developer (safe edits)

These are small, low-risk changes that teach the repo without causing drift:

- Update copy or microcopy in a page component.
  - Example: `js/src/features/gallery/pages/Gallery.jsx`
- Adjust a UI layout tweak inside a feature stylesheet.
  - Example: `js/src/styles/gallery.css`
- Add or refine an alias entry in `data/aliases.json` and validate it through the UI.
- Add an icon to `js/src/ui/primitives/Icons.jsx` and use it in one place.

Avoid editing the core API routes or workflow graph logic until you have read `docs/10-ARCHITECTURE.md`.

## Development environment expectations

- Python: use the same environment ComfyUI runs in.
  - Install deps from `requirements.txt`.
- Node.js: install dependencies in `js/` and run Vite.
  - `npm run dev` (frontend)
  - `npm run build` (served by ComfyUI)

Local dev path assumptions:
- ComfyUI default server is `http://127.0.0.1:8188`.
- The Vite dev server proxies `/cozygen/*` to that ComfyUI server.

Auth expectations:
- Auth is optional. If enabled, set `COZYGEN_AUTH_USER` and `COZYGEN_AUTH_PASS` in `.env`.
- See `.env.example` for the full set of env vars.

