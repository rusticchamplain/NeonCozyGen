# Architecture (Current State)

## System Overview
- CozyGen runs as a ComfyUI custom node package that registers HTTP routes, mounts middleware, and serves a built frontend under `/cozygen`. (`__init__.py`:5-63)
- The frontend is a React single-page app with hash-based routing and protected routes when authentication is enabled. (`js/src/app/App.jsx`:3-135)

## Backend Modules and Responsibilities
- `api.py` defines the aiohttp route table and implements endpoints for gallery access, workflow listing, alias and tag management, thumbnail generation, and auth actions. (`api.py`:24-1669)
- `auth.py` provides middleware, token signing/verification, and environment-driven auth configuration. (`auth.py`:13-127)
- `nodes.py` defines ComfyUI node classes for dynamic inputs, static inputs, image inputs, and output handling (including image/video output hooks). (`nodes.py`:45-505)
- `prompt_raw_store.py` stores a prompt-id to raw prompt mapping and records generated outputs with prompt id linkage. (`prompt_raw_store.py`:1-159)

## Frontend Modules and Responsibilities
- App shell and routing live in `js/src/app/App.jsx`, routing to `/studio`, `/controls`, `/compose`, `/gallery`, and `/library` (plus login and redirects). (`js/src/app/App.jsx`:95-118)
- Studio context aggregates workflow selection, form state, alias data, and execution status. (`js/src/features/studio/contexts/StudioContext.jsx`:1-215)
- Workflow controls and input rendering live under `js/src/features/workflow/`, driven by workflow JSON loaded from the backend. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:17-220; `js/src/features/workflow/hooks/useWorkflowForm.js`:30-246)
- Prompt composition lives in `js/src/features/composer/` and uses alias and tag sources to build prompt text. (`js/src/features/composer/pages/Composer.jsx`:6-55; `js/src/features/composer/components/PromptComposer.jsx`:100-840)
- Gallery browsing and media viewer live in `js/src/features/gallery/`, backed by gallery API endpoints and prompt metadata retrieval. (`js/src/features/gallery/pages/Gallery.jsx`:154-200; `js/src/features/gallery/components/MediaViewerModal.jsx`:2010-2095)
- Alias and tag management live under `js/src/features/aliases/` and `js/src/features/tags/`. (`js/src/features/aliases/pages/Aliases.jsx`:37-199; `js/src/features/tags/pages/TagLibrary.jsx`:1-53)

## Data Flow (UI -> Backend -> UI)
- Workflow data is loaded from `/cozygen/workflows` and `/cozygen/workflows/{filename}`; the UI builds form controls from workflow nodes. (`api.py`:1047-1064; `js/src/features/workflow/hooks/useWorkflowForm.js`:62-120)
- Form state is persisted to session storage on each change; the UI reloads stored values when a workflow is selected. (`js/src/features/workflow/utils/storage.js`:171-204; `js/src/features/workflow/hooks/useWorkflowForm.js`:122-165)
- On generate, the UI expands aliases in prompt-like fields, injects form values into the workflow graph, stores raw prompt metadata, and queues the prompt to `/prompt`. (`js/src/features/workflow/hooks/useExecutionQueue.js`:392-507; `js/src/services/api.js`:61-69, 130-134)
- The backend writes raw prompt metadata to `data/prompt_raw_store.json` and ties prompt ids to output filenames. (`prompt_raw_store.py`:115-159; `nodes.py`:225-259)
- The gallery reads output directories and optionally extracts prompt metadata from PNGs; it also returns raw prompt metadata when available. (`api.py`:547-591; `api.py`:765-831)

## Networking and API Boundaries
- Frontend API calls are centralized in `js/src/services/api.js`, which uses JSON fetch helpers and includes auth headers if present. (`js/src/services/api.js`:1-224)
- API requests are served by `api.py` route handlers, mounted at `/cozygen/*` via ComfyUI’s `PromptServer`. (`__init__.py`:28-35; `api.py`:765-1669)
- Authentication is enforced by middleware for protected prefixes, with explicit allowlist paths for login/status/assets. (`auth.py`:40-127)

## Storage and Persistence
- Alias definitions and categories are stored in `data/aliases.json` and served directly by `/cozygen/api/aliases` without additional server-side validation. (`api.py`:30-31, 1093-1101)
- Workflow mode mappings are stored in `data/workflow_types.json`. (`api.py`:31, 230-238)
- Workflow presets are stored in `data/workflow_presets.json`, normalized to a per-user structure. (`api.py`:32, 240-257, 1397-1482)
- Prompt raw metadata is stored in `data/prompt_raw_store.json` with caps for prompt and file entries. (`prompt_raw_store.py`:8-99)
- Thumbnails are generated into `data/thumbs` and are served via `/cozygen/thumb`. (`api.py`:29, 1492-1579)
