# CozyGen (ComfyUI Custom Node + Web UI)

CozyGen adds a dedicated web UI to ComfyUI for workflow control, prompt authoring, gallery management, and tag/alias curation. It is a ComfyUI custom node package with an embedded React app served at `/cozygen/`.

## 60-second overview

- What it is: a ComfyUI extension that mounts API routes and serves a React frontend.
- Who it is for: ComfyUI users who want a cohesive UI to manage prompts, workflows, and gallery assets.
- What it does: dynamic inputs, prompt composer, aliases/tags library, gallery browsing, re-run controls.

## Quickstart

### Backend (ComfyUI)

1) Install this repo under your ComfyUI `custom_nodes/` directory (folder name should be `ComfyUI_CozyGen`).
2) Install Python deps in the same environment as ComfyUI:

```bash
pip install -r requirements.txt
```

3) (Optional) Configure auth in `.env` using `.env.example`.
4) Start ComfyUI, then open `http://localhost:8188/cozygen/`.

### Frontend (React)

```bash
cd js
npm install
npm run dev
```

The dev server proxies `/cozygen/*` to `http://127.0.0.1:8188` and serves the UI at `http://localhost:5173/cozygen/`.

### Build frontend for ComfyUI

```bash
cd js
npm run build
```

ComfyUI serves `js/dist` via `/cozygen/`.

## Where to look first

- `docs/00-ONBOARDING.md` - mental model and first tasks
- `docs/10-ARCHITECTURE.md` - subsystem diagram and data flow
- `docs/20-REPO-STRUCTURE.md` - placement rules and examples
- `docs/30-UI-DESIGN-SYSTEM.md` - canonical UI primitives and usage rules
- `docs/40-DEVELOPMENT-WORKFLOW.md` - build/test/lint commands
- `docs/50-CONTRIBUTING-GUIDE.md` - quality bar and change process
- `docs/60-TROUBLESHOOTING.md` - common issues and fixes
- `docs/70-FUTURE-EXPERIMENTS.md` - bounded exploration space
- `docs/80-APP-FUTURE-AND-MOBILE-STRATEGY.md` - long-term mobile plan
