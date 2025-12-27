# Backend (Current State)

## Initialization and Route Mounting
- On import, CozyGen registers node classes and mounts API routes and middleware on ComfyUI’s server instance. (`__init__.py`:15-39)
- The frontend is served at `/cozygen` and `/cozygen/`, with static assets mounted under `/cozygen/assets`. (`__init__.py`:41-61)

## Authentication
- Auth is enabled when `COZYGEN_AUTH_USER` or `COZYGEN_AUTH_PASS` is set; otherwise the middleware allows requests to pass through. (`auth.py`:32-66, 108-127)
- Protected prefixes include `/cozygen/api`, `/cozygen/workflows`, `/cozygen/get_choices`, `/cozygen/upload_image`, `/cozygen/input`, and `/prompt`. (`auth.py`:40-47)
- Login issues a signed token and sets an HttpOnly cookie. (`api.py`:1601-1636)
- Auth status returns authenticated state, user, and default credential status. (`api.py`:1639-1665)
- Logout clears the cookie. (`api.py`:1669-1673)

## ComfyUI Node Classes
- `CozyGenDynamicInput` and static input nodes (`CozyGenFloatInput`, `CozyGenIntInput`, `CozyGenStringInput`, `CozyGenChoiceInput`) provide workflow parameters. (`nodes.py`:45-483)
- `CozyGenImageInput` resolves file references from input or output folders and returns image + mask tensors. (`nodes.py`:111-202)
- `CozyGenOutput` and `CozyGenVideoOutput` extend output handling and emit websocket messages with generated media. (`nodes.py`:205-353)

## API Modules and Storage
- `api.py` defines all HTTP routes for workflows, gallery, tags, aliases, presets, inputs, thumbnails, and cache operations. (`api.py`:269-1669)
- `prompt_raw_store.py` implements a JSON store for prompt raw data and output-to-prompt linkage. (`prompt_raw_store.py`:1-159)
- Aliases, workflow types, and workflow presets are stored in JSON files under `data/`. (`api.py`:27-48, 230-257)
