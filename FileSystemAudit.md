# File System Audit

## Architecture Overview
CozyGen is a ComfyUI custom node package that adds CozyGen nodes, a REST-style API, and an optional auth layer, then serves a React UI under `/cozygen`. The frontend (Vite + React) drives workflow selection, dynamic parameter forms, gallery browsing, tag and alias tooling, and queues prompts via `/prompt` and `/ws`. Data files in `data/` seed or persist aliases, workflow metadata, and tag catalogs, while `workflows/` holds ComfyUI graphs and `js/web/` adds ComfyUI UI widgets for CozyGen nodes.

## Navigation Index
- [Repository Root](#repository-root)
- [data/](#data)
- [data/thumbs/output/CozyGen/](#datathumbsoutputcozygen)
- [scripts/](#scripts)
- [workflows/](#workflows)
- [js/](#js)
- [js/web/](#jsweb)
- [js/src/](#jssrc)
- [js/src/contexts/](#jssrccontexts)
- [js/src/components/](#jssrccomponents)
- [js/src/components/inputs/](#jssrccomponentsinputs)
- [js/src/components/ui/](#jssrccomponentsui)
- [js/src/components/workflow/](#jssrccomponentsworkflow)
- [js/src/components/workflow/panels/](#jssrccomponentsworkflowpanels)
- [js/src/config/](#jssrcconfig)
- [js/src/hooks/](#jssrchooks)
- [js/src/pages/](#jssrcpages)
- [js/src/styles/](#jssrcstyles)
- [js/src/utils/](#jssrcutils)
- [js/src/__tests__/](#jssrctests)
- [js/src/test/](#jssrctest)

## Repository Root
- `__init__.py`
  Purpose: ComfyUI extension entrypoint that registers CozyGen node classes, mounts API routes, and serves the built UI and assets.
  Key exports / entry points: `NODE_CLASS_MAPPINGS`, `NODE_DISPLAY_NAME_MAPPINGS`, module side effects to register routes and middleware.
  Inputs/Outputs: Consumes ComfyUI `server.PromptServer`, filesystem paths, and auth status; outputs aiohttp routes/middleware and static asset mounts.
  Dependencies: `server`, `ComfyUI_CozyGen.auth`, `.api`, `.nodes`.
  Notes: Expects the React build at `js/dist/index.html`; logs a warning if the build is missing.

- `api.py`
  Purpose: Defines the CozyGen HTTP API for workflows, gallery browsing, thumbnails, aliases, tags, input browsing, and auth endpoints.
  Key exports / entry points: `routes` (aiohttp `RouteTableDef`) and handlers such as `gallery_list`, `gallery_stream`, `upload_image`, `get_choices`, `workflow_presets_*`, and `login`.
  Inputs/Outputs: Consumes HTTP requests, ComfyUI input/output directories, and JSON data files; outputs JSON responses, SSE streams, and file responses (images/videos/thumbnails).
  Dependencies: `ComfyUI_CozyGen.auth`, `folder_paths`, `comfy.samplers`, `server`, `PIL`.
  Notes: Uses on-disk caches for thumbnails and danbooru tags; uses `ffmpeg` when available for video thumbnails.

- `auth.py`
  Purpose: Lightweight auth and token middleware for CozyGen endpoints, with optional `.env` loading.
  Key exports / entry points: `cozygen_auth_middleware`, `auth_enabled`, `sign_token`, `verify_token`, `extract_token`.
  Inputs/Outputs: Reads `COZYGEN_AUTH_*` env vars and HTTP headers/cookies; outputs JSON 401 responses or passes through to handlers.
  Dependencies: `aiohttp.web`.
  Notes: If `COZYGEN_AUTH_SECRET` is absent, a process-local secret is used (tokens reset on restart).

- `nodes.py`
  Purpose: Implements CozyGen ComfyUI nodes for dynamic inputs, image input, output, video output, and static input types.
  Key exports / entry points: `CozyGenDynamicInput`, `CozyGenImageInput`, `CozyGenOutput`, `CozyGenVideoOutput`, `CozyGenFloatInput`, `CozyGenIntInput`, `CozyGenStringInput`, `CozyGenChoiceInput`, `NODE_CLASS_MAPPINGS`, `NODE_DISPLAY_NAME_MAPPINGS`.
  Inputs/Outputs: Consumes ComfyUI node inputs, writes media to output folders, returns tensors/masks, and emits WebSocket messages for batch/video readiness.
  Dependencies: `folder_paths`, `comfy.samplers`, `server`, `nodes.SaveImage`, `torch`, `numpy`, `imageio`, `PIL`.
  Notes: Choice/dynamic inputs are paired with UI extensions in `js/web/`.

- `LICENSE`
  Purpose: License terms for the project.
  Key exports / entry points: N/A.
  Inputs/Outputs: N/A.
  Dependencies: N/A.
  Notes: Review for redistribution or modification requirements.

- `pyproject.toml`
  Purpose: Tooling configuration for ruff and mypy.
  Key exports / entry points: N/A.
  Inputs/Outputs: Read by ruff/mypy during lint/type checks.
  Dependencies: ruff, mypy.
  Notes: Ignores F401 in `__init__.py` and targets Python 3.11.

- `requirements.txt`
  Purpose: Runtime Python dependencies for CozyGen backend.
  Key exports / entry points: N/A.
  Inputs/Outputs: Consumed by pip.
  Dependencies: N/A.
  Notes: Includes `aiohttp`, `imageio`, `imageio-ffmpeg`.

- `requirements-dev.txt`
  Purpose: Development-only Python tooling.
  Key exports / entry points: N/A.
  Inputs/Outputs: Consumed by pip.
  Dependencies: N/A.
  Notes: Includes `ruff` and `mypy`.

## data/
- `data/aliases.json`
  Purpose: Persistent alias catalog for prompt expansion, with category metadata and display ordering.
  Key exports / entry points: N/A (data file).
  Inputs/Outputs: Read/written by `/cozygen/api/aliases` and used by the Alias UI; stores `{ items, categoryList }`.
  Dependencies: `api.py`, `js/src/hooks/usePromptAliases.js`.
  Notes: Large, curated list; edits are persisted by the Aliases page.

- `data/danbooru_tags.md`
  Purpose: Reference catalog of danbooru tags with category headers and counts for tag browsing and validation.
  Key exports / entry points: N/A (data file).
  Inputs/Outputs: Parsed by `api.py` for tag search/validation; can be regenerated by `scripts/reclassify_danbooru_tags.py`.
  Dependencies: `api.py`, `scripts/reclassify_danbooru_tags.py`.
  Notes: Large file; updates affect tag validation and search results.

- `data/workflow_presets.json`
  Purpose: Persistent workflow presets organized by user and workflow.
  Key exports / entry points: N/A (data file).
  Inputs/Outputs: Read/written by `/cozygen/api/workflow_presets`; consumed by `MainPage` preset UI.
  Dependencies: `api.py`, `js/src/pages/MainPage.jsx`.
  Notes: Includes example entries for `default` and `admin` users.

- `data/workflow_types.json`
  Purpose: Mapping of workflow filenames to CozyGen workflow modes (text-to-image, image-to-video, etc.).
  Key exports / entry points: N/A (data file).
  Inputs/Outputs: Read/written by `/cozygen/api/workflow_types`.
  Dependencies: `api.py`.
  Notes: Starts as `{ "version": 1, "workflows": {} }`.

### data/thumbs/output/CozyGen/
- `data/thumbs/output/CozyGen/T2I_00001___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00001`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present; used by gallery thumbnails.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00001___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00001`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00002___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00002`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00002___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00002`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00003___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00003`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00003___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00003`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00004___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00004`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00004___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00004`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00005___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00005`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00005___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00005`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00006___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00006`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00007___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00007`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00008___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00008`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00009___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00009`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00010___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00010`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00011___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00011`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00012___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00012`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00013___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00013`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00014___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00014`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00015___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00015`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00016___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00016`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00016___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00016`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00017___w384.jpg`
  Purpose: Cached 384px thumbnail for output image `T2I_00017`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

- `data/thumbs/output/CozyGen/T2I_00017___w768.jpg`
  Purpose: Cached 768px thumbnail for output image `T2I_00017`.
  Key exports / entry points: N/A (asset file).
  Inputs/Outputs: Served via `/cozygen/thumb` if present.
  Dependencies: `api.py` thumbnail cache logic.
  Notes: Likely generated at runtime; regenerate by requesting the thumbnail.

## scripts/
- `scripts/reclassify_danbooru_tags.py`
  Purpose: CLI tool to reclassify danbooru tags into CozyGen categories and rewrite the tag reference file.
  Key exports / entry points: `classify_tag`, `parse_tags`, `write_tags`, `main` (CLI).
  Inputs/Outputs: Reads a markdown tag file and writes a categorized markdown output (defaults to `data/danbooru_tags.md`).
  Dependencies: Python stdlib (`argparse`, `re`, `collections`).
  Notes: Uses token heuristics to reassign tags from general categories into more specific ones.

## workflows/
- `workflows/Text 2 Image.json`
  Purpose: ComfyUI workflow graph for text-to-image generation.
  Key exports / entry points: N/A (workflow JSON).
  Inputs/Outputs: Consumed by `/cozygen/workflows` and the frontend to render controls and queue prompts.
  Dependencies: ComfyUI node classes referenced in the graph.
  Notes: Filename is used in presets and workflow metadata.

- `workflows/Smooth I2V-2.json`
  Purpose: ComfyUI workflow graph for image-to-video style pipelines.
  Key exports / entry points: N/A (workflow JSON).
  Inputs/Outputs: Consumed by `/cozygen/workflows` and the frontend to render controls and queue prompts.
  Dependencies: ComfyUI node classes referenced in the graph.
  Notes: Name includes spaces; ensure URL-encoding when requesting.

## js/
- `js/index.html`
  Purpose: Vite HTML entry that mounts the React app at `#root`.
  Key exports / entry points: N/A.
  Inputs/Outputs: Loaded by Vite dev/build and references `src/main.jsx`.
  Dependencies: Vite build pipeline, `js/src/main.jsx`.
  Notes: Sets viewport and no-cache meta; `class="dark"` on `<html>`.

- `js/package.json`
  Purpose: Frontend package manifest and scripts.
  Key exports / entry points: N/A.
  Inputs/Outputs: Used by npm/pnpm/yarn to install and run scripts.
  Dependencies: React, React Router, Vite, Tailwind, Vitest, ESLint.
  Notes: Build output goes to `js/dist` via `vite build`.

- `js/package-lock.json`
  Purpose: Lockfile for exact npm dependency versions.
  Key exports / entry points: N/A.
  Inputs/Outputs: Used by npm install.
  Dependencies: N/A (data).
  Notes: Keep in sync with `js/package.json`.

- `js/postcss.config.js`
  Purpose: PostCSS config enabling Tailwind and Autoprefixer.
  Key exports / entry points: default export with `tailwindcss` and `autoprefixer` plugins.
  Inputs/Outputs: Consumed during CSS build.
  Dependencies: `tailwindcss`, `autoprefixer`.
  Notes: Standard PostCSS pipeline.

- `js/tailwind.config.js`
  Purpose: Tailwind theme and content scan configuration.
  Key exports / entry points: default Tailwind config object.
  Inputs/Outputs: Consumed by Tailwind compiler.
  Dependencies: Tailwind.
  Notes: Defines custom colors and a dark theme baseline.

- `js/vite.config.js`
  Purpose: Vite build and dev server configuration for the frontend.
  Key exports / entry points: default Vite config via `defineConfig`.
  Inputs/Outputs: Sets base path `/cozygen/`, build output `dist`, and dev proxy to ComfyUI on `8188`.
  Dependencies: `@vitejs/plugin-react`, Vite, Vitest.
  Notes: Test setup uses `js/src/test/setup.js`.

## js/web/
- `js/web/cozygen_dynamic_input.js`
  Purpose: ComfyUI web extension that adapts `CozyGenDynamicInput` widgets based on connected node input types.
  Key exports / entry points: `app.registerExtension` hook for `CozyGenDynamicInput`.
  Inputs/Outputs: Reads node graph connections and mutates widget definitions and properties; outputs updated UI widgets in ComfyUI.
  Dependencies: ComfyUI `/scripts/app.js` frontend runtime.
  Notes: Infers dropdown choice types for common loader nodes (checkpoint, LoRA, etc.).

- `js/web/cozygen_choice_input.js`
  Purpose: ComfyUI web extension that replaces the hidden `CozyGenChoiceInput` value widget with a populated combo box.
  Key exports / entry points: `app.registerExtension` hook for `CozyGenChoiceInput`.
  Inputs/Outputs: Fetches `/cozygen/get_choices?type=...` and updates node widgets; optional bypass toggle.
  Dependencies: ComfyUI `/scripts/app.js` frontend runtime, CozyGen API.
  Notes: Logs errors when choice fetch fails.

## js/src/
- `js/src/main.jsx`
  Purpose: React entry point that mounts the app.
  Key exports / entry points: N/A (side-effect render).
  Inputs/Outputs: Renders `<App />` into `#root`.
  Dependencies: `react`, `react-dom`, `./App.jsx`, `./index.css`.
  Notes: Uses `React.StrictMode`.

- `js/src/App.jsx`
  Purpose: Application router and layout shell with auth gating.
  Key exports / entry points: default export `AppWithProviders` (HashRouter + AuthProvider + App).
  Inputs/Outputs: Consumes route state and auth context; renders pages and navigation.
  Dependencies: `react-router-dom`, `TopBar`, `BottomNav`, `useAuth`, `StudioProvider`.
  Notes: Listens for `cozygen:open-composer` events to navigate to the Composer.

- `js/src/api.js`
  Purpose: Client-side API wrapper for CozyGen endpoints and ComfyUI `/prompt`.
  Key exports / entry points: `getWorkflows`, `getWorkflow`, `getChoices`, `queuePrompt`, `uploadImage`, `getGallery`, alias/tag/workflow preset APIs, `login`, `authStatus`.
  Inputs/Outputs: HTTP fetch with auth headers/cookies; returns JSON or text.
  Dependencies: `./utils/auth`.
  Notes: Throws a custom `unauthorized` error on 401 responses and emits an auth-expired event to reset UI state.

- `js/src/index.css`
  Purpose: Global styling and theme tokens for the CozyGen UI.
  Key exports / entry points: N/A (CSS).
  Inputs/Outputs: Imported by the app entry.
  Dependencies: Tailwind base/components/utilities.
  Notes: Defines layout, typography, and motion styling for the UI shell.

## js/src/contexts/
- `js/src/contexts/StudioContext.jsx`
  Purpose: Central context provider for workflows, form state, aliases, and execution status.
  Key exports / entry points: `StudioProvider`, `useStudioContext`.
  Inputs/Outputs: Aggregates outputs from `useWorkflows`, `useWorkflowForm`, `useExecutionQueue`, and `usePromptAliases`.
  Dependencies: `../hooks/*`, `../utils/*`, `../components/DynamicForm`.
  Notes: Determines a primary prompt field heuristically for the Composer.

## js/src/components/
- `js/src/components/BottomBar.jsx`
  Purpose: Status dock with render button, progress bar, and logs entry point.
  Key exports / entry points: default `BottomBar`.
  Inputs/Outputs: Props like `busy`, `progressValue`, `onPrimary`, `onLogs`; renders UI and triggers callbacks.
  Dependencies: None (pure UI).
  Notes: Computes percent from progress values and color-codes status.

- `js/src/components/BottomNav.jsx`
  Purpose: Primary navigation bar with render action and gallery pending indicator.
  Key exports / entry points: default `BottomNav`.
  Inputs/Outputs: Uses router state and global render events; triggers render or navigation.
  Dependencies: `react-router-dom`, `useGalleryPending`, `useMediaQuery`, `../utils/globalRender`.
  Notes: On non-control pages, render action re-queues the last saved workflow.

- `js/src/components/CollapsibleSection.jsx`
  Purpose: Reusable collapsible section using `<details>` and `<summary>` styling.
  Key exports / entry points: default `CollapsibleSection`.
  Inputs/Outputs: Props for `title`, `kicker`, `meta`, `defaultOpen`, `variant`.
  Dependencies: `Icons`.
  Notes: Supports "card" and "bare" variants.

- `js/src/components/DynamicForm.jsx`
  Purpose: Renders CozyGen dynamic inputs into appropriate field components with LoRA pair grouping.
  Key exports / entry points: default `DynamicForm`, plus named helpers `resolveLabel`, `resolveParamName`, `resolveConfig`.
  Inputs/Outputs: Consumes `inputs`, `formData`, and change callbacks; outputs form UI and emits change events.
  Dependencies: `inputs/*` components, `FieldRow`, `LORA_PAIRS`, `modelDisplay`.
  Notes: Builds collapse/preview behavior and integrates alias tooling for string fields.

- `js/src/components/FieldSpotlight.jsx`
  Purpose: Full-screen focus overlay for editing a single field.
  Key exports / entry points: default `FieldSpotlight`.
  Inputs/Outputs: Props include `open`, `title`, `render`, `onClose`; outputs modal UI and focus trapping.
  Dependencies: `Icons`.
  Notes: Manages focus restore for accessibility.

- `js/src/components/GalleryItem.jsx`
  Purpose: Gallery tile/feed card renderer for images, videos, and directories.
  Key exports / entry points: default `GalleryItem`.
  Inputs/Outputs: Props include `item`, `variant`, `autoPlay`; renders tile and calls `onSelect`.
  Dependencies: None (pure UI).
  Notes: Uses `/cozygen/thumb` for thumbnails and `/view` for full media.

- `js/src/components/GalleryNav.jsx`
  Purpose: Breadcrumb and quick-collection navigation for the gallery.
  Key exports / entry points: default `GalleryNav`.
  Inputs/Outputs: Props include `crumbs`, `dirChips`, `onBack`, `onRoot`.
  Dependencies: `../styles/mobile-helpers.css`.
  Notes: Renders "collection" chips for directories.

- `js/src/components/Icons.jsx`
  Purpose: Centralized SVG icon set and logo mark for the UI.
  Key exports / entry points: `LogoMark` and many `Icon*` components.
  Inputs/Outputs: Props like `size` and `className`; outputs inline SVG elements.
  Dependencies: None.
  Notes: All icons share a common `Icon` wrapper for styling.

- `js/src/components/ImageInput.jsx`
  Purpose: Image input control with upload, preview, and server picker support.
  Key exports / entry points: default `ImageInput`.
  Inputs/Outputs: Props include `input`, `value`, `onFormChange`; outputs form changes and previews.
  Dependencies: `useImagePicker`, `ImagePickerSheet`, `UrlViewerSheet`.
  Notes: Supports drag-and-drop uploads.

- `js/src/components/ImagePickerSheet.jsx`
  Purpose: Bottom sheet for browsing input/output directories and selecting images.
  Key exports / entry points: default `ImagePickerSheet`.
  Inputs/Outputs: Props include pagination, filters, and `onSelect`; renders selectable entries.
  Dependencies: `BottomSheet`, `SegmentedTabs`, `Select`.
  Notes: Supports source toggle between inputs and outputs.

- `js/src/components/MediaViewerModal.jsx`
  Purpose: Fullscreen modal for viewing images/videos with metadata panel.
  Key exports / entry points: default `MediaViewerModal`.
  Inputs/Outputs: Props include `media`, `isOpen`, navigation callbacks; outputs modal UI via portal.
  Dependencies: `Button`, `Icons`.
  Notes: Closes on overlay click or Escape; supports arrow navigation.

- `js/src/components/PromptComposer.jsx`
  Purpose: Prompt editor with alias insertion, tag browsing, and token weight controls.
  Key exports / entry points: default `PromptComposer`.
  Inputs/Outputs: Props include `value`, `onChange`, `aliasCatalog`, `open`; outputs edited prompt text.
  Dependencies: `BottomSheet`, `SegmentedTabs`, `TokenStrengthSheet`, `Select`, `tokenWeights`, `aliasPresentation`, CozyGen tag API.
  Notes: Supports drag-reordering of prompt tokens and tag collection.

- `js/src/components/RunLogsSheet.jsx`
  Purpose: Bottom sheet for viewing and copying generation logs.
  Key exports / entry points: default `RunLogsSheet`.
  Inputs/Outputs: Props include `logs`, `onClear`, `onClose`; outputs UI and clipboard copy.
  Dependencies: `BottomSheet`.
  Notes: Limits log display to provided entries; copy uses clipboard API.

- `js/src/components/TagLibrarySheet.jsx`
  Purpose: Browsable tag library UI with categories, search, and collection management.
  Key exports / entry points: default `TagLibrarySheet`.
  Inputs/Outputs: Props include `onSelectTag`, `initialQuery`, `inline`; outputs selected tags and clipboard actions.
  Dependencies: `BottomSheet`, `Select`, `Icons`, CozyGen tag API.
  Notes: Includes drag-and-drop reorder for collected tags.

- `js/src/components/TopBar.jsx`
  Purpose: Header navigation and render/logout actions for desktop and mobile.
  Key exports / entry points: default `TopBar`.
  Inputs/Outputs: Uses router location and auth context; outputs navigation and render triggers.
  Dependencies: `react-router-dom`, `useAuth`, `useMediaQuery`, `globalRender`.
  Notes: Renders desktop links and a mobile drawer variant.

## js/src/components/inputs/
- `js/src/components/inputs/BooleanInput.jsx`
  Purpose: Toggle-style boolean input control.
  Key exports / entry points: default `BooleanInput`.
  Inputs/Outputs: Props `value`, `onChange`, `disabled`; outputs toggled boolean values.
  Dependencies: None.
  Notes: Uses `role="switch"` for accessibility.

- `js/src/components/inputs/DropdownInput.jsx`
  Purpose: Dropdown input with folder grouping and model display formatting.
  Key exports / entry points: default `DropdownInput`.
  Inputs/Outputs: Props include `workflowName`, `options`, `value`, `onChange`; outputs selected value.
  Dependencies: `Select`, `modelDisplay`, `storage`.
  Notes: Persists selected folder per workflow/param.

- `js/src/components/inputs/LoraPairInput.jsx`
  Purpose: Combined UI for paired LoRA high/low selections and strengths.
  Key exports / entry points: default `LoraPairInput`.
  Inputs/Outputs: Props include param names, choices, form values, and change callbacks.
  Dependencies: `DropdownInput`, `NumberInput`.
  Notes: Auto-pairs `-high`/`-low` files and can link/split strengths.

- `js/src/components/inputs/NumberInput.jsx`
  Purpose: Numeric input with keyboard step handling and min/max display.
  Key exports / entry points: default `NumberInput`.
  Inputs/Outputs: Props include `value`, `min`, `max`, `step`, `isFloat`; outputs parsed numeric values.
  Dependencies: None.
  Notes: Normalizes input IDs for accessibility.

- `js/src/components/inputs/StringInput.jsx`
  Purpose: String input with alias picker, token weight controls, and optional multi-line editor.
  Key exports / entry points: default `StringInput`.
  Inputs/Outputs: Props include `value`, `onChange`, `aliasCatalog`, `multiline`; outputs text updates.
  Dependencies: `BottomSheet`, `TextAreaSheet`, `TokenStrengthSheet`, `Select`, `Icons`, `aliasPresentation`, `tokenWeights`.
  Notes: Supports inserting `$alias$` tokens and weight editing.

## js/src/components/ui/
- `js/src/components/ui/BottomSheet.jsx`
  Purpose: Portal-based modal sheet with focus trapping and optional footer.
  Key exports / entry points: default `BottomSheet`.
  Inputs/Outputs: Props include `open`, `onClose`, `title`, `variant`; outputs modal UI.
  Dependencies: `react-dom`, `Icons`.
  Notes: Supports fullscreen or bottom-sheet layouts.

- `js/src/components/ui/Button.jsx`
  Purpose: Shared button component with variants and size handling.
  Key exports / entry points: default `Button`.
  Inputs/Outputs: Props include `variant`, `size`, `as`, `href`; outputs a button or anchor element.
  Dependencies: None.
  Notes: Sets `aria-pressed` when provided.

- `js/src/components/ui/FieldRow.jsx`
  Purpose: Labeled row wrapper with optional collapsible panel and preview text.
  Key exports / entry points: default `FieldRow`.
  Inputs/Outputs: Props include `label`, `description`, `preview`, `onToggle`.
  Dependencies: `Icons`.
  Notes: Handles ARIA descriptions for accessibility.

- `js/src/components/ui/SegmentedTabs.jsx`
  Purpose: Segmented button/tab control with keyboard navigation.
  Key exports / entry points: default `SegmentedTabs`.
  Inputs/Outputs: Props include `items`, `value`, `onChange`, `role`.
  Dependencies: None.
  Notes: Supports `tablist` or button mode and auto layout.

- `js/src/components/ui/Select.jsx`
  Purpose: Styled `<select>` with optional search filter.
  Key exports / entry points: default `Select`.
  Inputs/Outputs: Props include `options`, `value`, `onChange`, `searchable`.
  Dependencies: None.
  Notes: Accepts option objects or primitives.

- `js/src/components/ui/TextAreaSheet.jsx`
  Purpose: Fullscreen textarea editor sheet.
  Key exports / entry points: default `TextAreaSheet`.
  Inputs/Outputs: Props include `value`, `onChange`, `title`.
  Dependencies: `BottomSheet`.
  Notes: Generates a random id for textarea labeling.

- `js/src/components/ui/TokenStrengthSheet.jsx`
  Purpose: Bottom sheet for adjusting alias/token weight.
  Key exports / entry points: default `TokenStrengthSheet`.
  Inputs/Outputs: Props include `weight`, `onApply`, `onRemoveWeight`.
  Dependencies: `BottomSheet`, `tokenWeights`.
  Notes: Constrains weights to 0.2-2.0.

- `js/src/components/ui/UrlViewerSheet.jsx`
  Purpose: Fullscreen preview sheet for image or video URLs.
  Key exports / entry points: default `UrlViewerSheet`.
  Inputs/Outputs: Props include `url`, `kind`, `title`.
  Dependencies: `BottomSheet`.
  Notes: Renders `<img>` or `<video>` based on `kind`.

## js/src/components/workflow/
- `js/src/components/workflow/WorkflowFormLayout.jsx`
  Purpose: Layout wrapper for workflow parameter panels.
  Key exports / entry points: default `WorkflowFormLayout`.
  Inputs/Outputs: Props include workflow name, inputs, and callbacks; outputs a `AllParametersPanel`.
  Dependencies: `AllParametersPanel`.
  Notes: Thin passthrough component for layout composition.

## js/src/components/workflow/panels/
- `js/src/components/workflow/panels/AllParametersPanel.jsx`
  Purpose: Normalizes CozyGen inputs and renders `DynamicForm` for all non-image parameters.
  Key exports / entry points: default `AllParametersPanel`.
  Inputs/Outputs: Props include `dynamicInputs`, `formData`, `onFormChange`.
  Dependencies: `DynamicForm`.
  Notes: Converts static CozyGen input nodes into dynamic-form compatible shapes.

## js/src/config/
- `js/src/config/loraPairs.js`
  Purpose: Defines LoRA high/low pairing rules and name matching helpers.
  Key exports / entry points: `LORA_PAIRS`, `matchLoraParam`.
  Inputs/Outputs: Consumes param name lists and returns match metadata.
  Dependencies: None.
  Notes: Supports multiple joiner patterns and strength param variants.

## js/src/hooks/
- `js/src/hooks/useAuthConstants.js`
  Purpose: Shared constants for auth idle timeout behavior.
  Key exports / entry points: `IDLE_TIMEOUT_MS`, `IDLE_FLAG_KEY`.
  Inputs/Outputs: N/A.
  Dependencies: None.
  Notes: Used by `useAuth` and `Login`.

- `js/src/hooks/useAuthContext.js`
  Purpose: Defines the React context for auth state.
  Key exports / entry points: default `AuthContext`.
  Inputs/Outputs: N/A.
  Dependencies: React.
  Notes: Provider is implemented in `useAuth.jsx`.

- `js/src/hooks/useAuth.jsx`
  Purpose: Auth provider and hook for login/logout and idle timeout.
  Key exports / entry points: `AuthProvider`, `useAuth`.
  Inputs/Outputs: Uses `authStatus`/`login` APIs and localStorage token; outputs auth state and actions.
  Dependencies: `../api`, `../utils/auth`, `useAuthConstants`, `useAuthContext`.
  Notes: Implements idle logout with localStorage flag for UX messaging; listens for auth-expired events to clear stale sessions.

- `js/src/hooks/useExecutionQueue.js`
  Purpose: Manages WebSocket status, queues prompts, and tracks progress/logs.
  Key exports / entry points: `useExecutionQueue`.
  Inputs/Outputs: Consumes workflow graph and form data; outputs status flags, progress values, and `handleGenerate`.
  Dependencies: `queuePrompt`, `auth`, `globalRender`, `promptAliases`, `storage`, `workflowGraph`.
  Notes: Uses a heuristic to mark completion when progress reaches max without explicit done event.

- `js/src/hooks/useGallery.js`
  Purpose: Gallery browsing state with paging, filtering, and SSE/poll refresh.
  Key exports / entry points: `useGallery`.
  Inputs/Outputs: Consumes `getGallery` API and localStorage prefs; outputs gallery state and navigation actions.
  Dependencies: `../api`.
  Notes: Uses SSE `/cozygen/api/gallery/stream` when available, falls back to polling.

- `js/src/hooks/useGalleryPending.js`
  Purpose: Tracks whether new gallery items are pending view.
  Key exports / entry points: `useGalleryPending` (default and named).
  Inputs/Outputs: Consumes localStorage and window events; outputs boolean state.
  Dependencies: None.
  Notes: Listens to `cozygen:gallery-pending` and `cozygen:gallery-viewed` events.

- `js/src/hooks/useImagePicker.js`
  Purpose: Unified input/output picker logic with upload support and preview URLs.
  Key exports / entry points: `useImagePicker`, `inputFileUrl`, `outputFileUrl`.
  Inputs/Outputs: Consumes API endpoints (`/cozygen/input`, `/cozygen/api/gallery`) and emits selection changes.
  Dependencies: `../api`.
  Notes: Encodes output selections with `output::` prefix for CozyGenImageInput.

- `js/src/hooks/useMediaQuery.js`
  Purpose: Hook for matchMedia queries.
  Key exports / entry points: default `useMediaQuery`.
  Inputs/Outputs: Consumes a media query string; outputs boolean match state.
  Dependencies: None.
  Notes: Handles older `addListener` APIs.

- `js/src/hooks/useMediaViewer.js`
  Purpose: Manages current media item and navigation for viewer modals.
  Key exports / entry points: `useMediaViewer`.
  Inputs/Outputs: Consumes `mediaItems`; outputs open/close/next/prev and current media state.
  Dependencies: None.
  Notes: Keeps indices in range when items change.

- `js/src/hooks/usePromptAliases.js`
  Purpose: Fetches, caches, and persists prompt aliases with categories.
  Key exports / entry points: default `usePromptAliases`.
  Inputs/Outputs: Uses `/cozygen/api/aliases` and localStorage; outputs aliases, categories, and persistence actions.
  Dependencies: `../api`, `../utils/promptAliases`.
  Notes: Builds a lookup map that supports `category:name` tokens.

- `js/src/hooks/useWorkflowForm.js`
  Purpose: Loads a workflow graph, fetches dropdown choices, and manages form defaults.
  Key exports / entry points: `useWorkflowForm`.
  Inputs/Outputs: Consumes `selectedWorkflow`; outputs `workflowData`, `dynamicInputs`, `formData`, and handlers.
  Dependencies: `../api`, `../utils/storage`.
  Notes: Restores per-workflow session state and flushes on unmount.

- `js/src/hooks/useWorkflows.js`
  Purpose: Fetches workflow list and tracks the selected workflow for the session.
  Key exports / entry points: `useWorkflows`.
  Inputs/Outputs: Consumes `/cozygen/workflows`; outputs list, selection, and change handler.
  Dependencies: `../api`.
  Notes: Session-only persistence via `sessionStorage`.

## js/src/pages/
- `js/src/pages/Aliases.jsx`
  Purpose: Alias management UI for creating, editing, categorizing, and validating aliases.
  Key exports / entry points: default `Aliases` page.
  Inputs/Outputs: Consumes alias state, validation API, and UI events; outputs updated alias payloads.
  Dependencies: `usePromptAliases`, `validateDanbooruTags`, `aliasPresentation`, `BottomSheet`, `Select`, `Button`.
  Notes: Validates tags against danbooru catalog before allowing save.

- `js/src/pages/Composer.jsx`
  Purpose: Dedicated composer page for editing the primary prompt field.
  Key exports / entry points: default `ComposerPage`.
  Inputs/Outputs: Consumes `StudioContext` for form data and uses `PromptComposer` to edit fields.
  Dependencies: `PromptComposer`, `useStudioContext`.
  Notes: Listens for `cozygen:request-render` to trigger generation.

- `js/src/pages/Gallery.jsx`
  Purpose: Gallery page for browsing outputs with filters, view modes, and viewer modal.
  Key exports / entry points: default `Gallery`.
  Inputs/Outputs: Uses `useGallery` state and `useMediaViewer` for modal navigation.
  Dependencies: `GalleryItem`, `GalleryNav`, `MediaViewerModal`, `SegmentedTabs`, `Select`.
  Notes: Implements lightweight grid virtualization for large galleries.

- `js/src/pages/Login.jsx`
  Purpose: Login screen for CozyGen auth.
  Key exports / entry points: default `Login`.
  Inputs/Outputs: Consumes auth state and submits credentials; outputs navigation on success.
  Dependencies: `useAuth`, `LogoMark`.
  Notes: Shows idle logout notice when `cozygen_idle_logout` is set.

- `js/src/pages/MainPage.jsx`
  Purpose: Main controls page for selecting workflows, filling parameters, and triggering renders.
  Key exports / entry points: default `MainPage` (with `WorkflowSelectorBar` memoized subcomponent).
  Inputs/Outputs: Consumes `StudioContext` data; outputs form changes, render requests, and preset CRUD operations.
  Dependencies: `WorkflowFormLayout`, `ImageInput`, `BottomBar`, `RunLogsSheet`, `BottomSheet`, `Select`, `Button`, `api`.
  Notes: Manages per-workflow presets via `/cozygen/api/workflow_presets`.

- `js/src/pages/StudioLanding.jsx`
  Purpose: Marketing-style landing page for the Studio.
  Key exports / entry points: default `StudioLanding`.
  Inputs/Outputs: Static content.
  Dependencies: None.
  Notes: Pure presentational page.

- `js/src/pages/TagLibrary.jsx`
  Purpose: Page wrapper around the Tag Library sheet for browsing danbooru tags.
  Key exports / entry points: default `TagLibrary`.
  Inputs/Outputs: Reads `q` query param and renders `TagLibrarySheet`.
  Dependencies: `TagLibrarySheet`, `Button`.
  Notes: Provides navigation to aliases and composer.

## js/src/styles/
- `js/src/styles/mobile-helpers.css`
  Purpose: Utility styles for mobile ergonomics and scroll helpers.
  Key exports / entry points: N/A (CSS).
  Inputs/Outputs: Imported by gallery and top bar components.
  Dependencies: None.
  Notes: Adds touch target sizing and safe area helpers.

## js/src/utils/
- `js/src/utils/aliasPresentation.js`
  Purpose: Formats alias names, categories, and subcategories for display.
  Key exports / entry points: `presentAliasEntry`, `formatAliasFriendlyName`, `formatCategoryLabel`, `formatSubcategoryLabel`.
  Inputs/Outputs: Consumes alias tokens and categories; outputs human-friendly labels.
  Dependencies: None.
  Notes: Contains heuristic grouping for pose, outfit, and lighting subcategories.

- `js/src/utils/auth.js`
  Purpose: Token storage and auth header helper for API calls.
  Key exports / entry points: `getToken`, `setToken`, `clearToken`, `authHeaders`, `AUTH_EXPIRED_EVENT`, `notifyAuthExpired`.
  Inputs/Outputs: Uses localStorage; outputs auth header objects.
  Dependencies: None.
  Notes: Used by `api.js` and `useExecutionQueue`; broadcasts auth-expired events on 401 handling.

- `js/src/utils/fieldOrder.js`
  Purpose: Stores and applies per-workflow field ordering and hidden flags.
  Key exports / entry points: `getFieldPrefs`, `setFieldPrefs`, `applyFieldOrder` and legacy helpers.
  Inputs/Outputs: Uses localStorage to persist order/hidden data; outputs reordered input arrays.
  Dependencies: None.
  Notes: Backwards compatible with older array-only storage.

- `js/src/utils/globalRender.js`
  Purpose: Persists last render payload for cross-page requeueing.
  Key exports / entry points: `saveLastRenderPayload`, `getLastRenderPayload`, `requeueLastRender`, `hasLastRenderPayload`.
  Inputs/Outputs: Uses localStorage and `/prompt` queue API; outputs success/error status.
  Dependencies: `../api`.
  Notes: Emits `cozygen:render-state` events to toggle UI state.

- `js/src/utils/modelDisplay.js`
  Purpose: Helpers for model file display names and extension detection.
  Key exports / entry points: `isModelFileLike`, `splitModelDisplayName`, `formatModelDisplayName`.
  Inputs/Outputs: Consumes model filename strings; outputs formatted display values.
  Dependencies: None.
  Notes: Used by dropdowns to shorten model names.

- `js/src/utils/presets.js`
  Purpose: LocalStorage-backed workflow preset helpers (client-side cache).
  Key exports / entry points: `loadWorkflowPresets`, `saveWorkflowPresets`, `addWorkflowPreset`, `removeWorkflowPreset`.
  Inputs/Outputs: Reads/writes localStorage; outputs preset lists.
  Dependencies: None.
  Notes: Appears to be legacy; server-side presets are also used in `MainPage`.

- `js/src/utils/promptAliases.js`
  Purpose: Alias normalization and token replacement helpers for prompt text.
  Key exports / entry points: `normalizeAliasMap`, `buildAliasLookup`, `applyPromptAliases`, `applyAliasesToForm`.
  Inputs/Outputs: Consumes alias maps and prompt strings; outputs expanded prompt strings.
  Dependencies: None.
  Notes: Supports `$alias$` and `category:alias` formats.

- `js/src/utils/storage.js`
  Purpose: Debounced session storage for form state and UI preferences.
  Key exports / entry points: `loadFormState`, `saveFormState`, `flushFormState`, `saveLastEditedParam`, `loadLastEditedParam`, `loadDropdownFolder`, `saveDropdownFolder`.
  Inputs/Outputs: Uses `sessionStorage` (and cleans up legacy localStorage) with idle callbacks.
  Dependencies: None.
  Notes: Flushes pending writes on `beforeunload` and `pagehide`.

- `js/src/utils/tokenWeights.js`
  Purpose: Parse and manipulate prompt tokens and weight wrappers.
  Key exports / entry points: `parsePromptElements`, `getElementWeight`, `setElementWeight`, `reorderElements`, `removeElement`, `formatTokenWeight`.
  Inputs/Outputs: Consumes prompt strings; outputs token arrays and updated strings.
  Dependencies: None.
  Notes: Handles `(token:weight)` syntax and alias tokens `$...$`.

- `js/src/utils/workflowGraph.js`
  Purpose: Clone workflow graphs and inject form values into CozyGen nodes.
  Key exports / entry points: `cloneWorkflow`, `injectFormValues`.
  Inputs/Outputs: Consumes workflow JSON and form data; outputs updated workflow graph and form data.
  Dependencies: None.
  Notes: Skips image inputs, which are handled separately.

## js/src/__tests__/
- `js/src/__tests__/GalleryStates.test.jsx`
  Purpose: Tests for Gallery error/loading states.
  Key exports / entry points: Vitest test suite.
  Inputs/Outputs: Mocks `useGallery` and `useMediaViewer`; asserts rendered UI states.
  Dependencies: `@testing-library/react`, `vitest`.
  Notes: Uses a mock localStorage setup.

- `js/src/__tests__/MediaViewerModal.test.jsx`
  Purpose: Tests metadata toggling and Escape handling in the media viewer.
  Key exports / entry points: Vitest test suite.
  Inputs/Outputs: Renders `MediaViewerModal` and simulates user actions.
  Dependencies: `@testing-library/react`, `vitest`.
  Notes: Asserts dialog presence and `onClose` callback.

- `js/src/__tests__/Select.test.jsx`
  Purpose: Tests for Select change handling and search filtering.
  Key exports / entry points: Vitest test suite.
  Inputs/Outputs: Renders `Select` and simulates change/search.
  Dependencies: `@testing-library/react`, `vitest`.
  Notes: Uses `searchable` option to verify empty state.

## js/src/test/
- `js/src/test/setup.js`
  Purpose: Vitest setup to enable `@testing-library/jest-dom` matchers.
  Key exports / entry points: N/A (side-effect import).
  Inputs/Outputs: Consumed by Vitest configuration.
  Dependencies: `@testing-library/jest-dom/vitest`.
  Notes: Runs before tests.
