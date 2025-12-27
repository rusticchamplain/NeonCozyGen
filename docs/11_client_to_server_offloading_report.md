# Client-to-Server Offloading Performance Report

## A) Executive Summary
I reviewed the current docs in `/docs` and traced the corresponding implementations in the frontend and backend code. The biggest client-side performance costs I can confirm are in the generate flow (workflow cloning, alias expansion, and prompt graph mutation on the client) and in the gallery (client-side filtering/search over fetched lists and full-resolution video playback). These areas can be offloaded to CozyGen’s own backend routes without rewriting the entire app or modifying ComfyUI core. Existing interactions with ComfyUI (e.g., `/prompt`) are already sanctioned and should remain unchanged; the proposals below add CozyGen-owned endpoints that wrap or reduce client work while calling ComfyUI as-is.

Top opportunities: (1) move workflow assembly + alias expansion + prompt-raw storage + queue submission into a CozyGen backend endpoint so the browser only submits form data; this removes deep JSON cloning and multi-pass regex expansion from the client and avoids sending full workflow graphs back to the server. (2) add server-side search filtering to `/cozygen/api/gallery` so the client does not fetch and filter large lists in-memory; server filtering also makes pagination accurate for searches. (3) add a low-res video preview endpoint (or use an existing thumbnail pipeline) to avoid full video downloads/decodes in the gallery feed. (4) if server-side queueing is introduced, provide a compact “workflow schema” endpoint so the UI can render inputs without loading the full workflow graph. All of these can be implemented within CozyGen’s API surface and keep ComfyUI interactions intact. These changes should improve perceived responsiveness on slower devices and large galleries, reduce network payloads, and keep UI work on the client focused on rendering.

## B) Current-State Hot Path Map
- **Initial load → workflow selection UI**: client fetches full workflow JSON and derives input controls, choice lists, and defaults in the browser (`js/src/features/workflow/hooks/useWorkflowForm.js:39-177`). Server provides workflow JSON and choices (`api.py:1047-1065`, `js/src/services/api.js:42-107`).
- **Generate flow**: client clones and mutates the workflow graph, expands aliases, persists prompt-raw metadata, and posts the expanded workflow to `/prompt` (`js/src/features/workflow/hooks/useExecutionQueue.js:369-489`, `js/src/features/workflow/utils/workflowGraph.js:7-74`, `js/src/utils/promptAliases.js:35-161`, `js/src/services/api.js:61-69`). Server only stores raw prompt data when the client posts it (`api.py:833-853`).
- **Gallery list view**: client fetches paged gallery items and then filters by hidden/name/kind in-memory (`js/src/features/gallery/hooks/useGallery.js:54-175`). Server supports paging and kind filtering, but not name search (`api.py:765-815`).
- **Gallery media viewing**: client loads thumbnails via `/cozygen/thumb` and full media via `/view`; video feed uses full `/view` media, which implies full-size video transfer and decode in the browser (`js/src/features/gallery/components/GalleryItem.jsx:127-223`). Server can generate image/video thumbnails (`api.py:1492-1579`).

## C) Prioritized Recommendations Table
| Priority | Area / Workflow | Current Client Responsibility (evidence) | Proposed Server Responsibility | Expected Benefit | Effort | Risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Generate: workflow assembly + alias expansion | Client clones workflow, injects form values, expands aliases, stores raw prompt, queues `/prompt` (`js/src/features/workflow/hooks/useExecutionQueue.js:369-489`, `js/src/features/workflow/utils/workflowGraph.js:7-74`, `js/src/utils/promptAliases.js:35-161`) | Add CozyGen backend endpoint to accept `{workflow_name, form_values}` and perform injection + alias expansion + prompt_raw storage before queueing; endpoint wraps the existing `/prompt` call without changing ComfyUI | **Estimate:** lower main-thread CPU, fewer large JSON copies, smaller request payloads; faster “queue” UX on large workflows | M | Med | `js/src/features/workflow/hooks/useExecutionQueue.js:369-489`, `js/src/features/workflow/utils/workflowGraph.js:7-74`, `js/src/utils/promptAliases.js:35-161`, `api.py:833-853`, `js/src/services/api.js:61-69` |
| P1 | Gallery search/filtering | Client filters by hidden/type/query after fetch (`js/src/features/gallery/hooks/useGallery.js:157-175`) | Extend `/cozygen/api/gallery` with optional `q` (and optionally `kind`/`show_hidden` enforcement) and filter before pagination | **Estimate:** smaller payloads, reduced client CPU for large folders, accurate pagination for search | S | Low | `js/src/features/gallery/hooks/useGallery.js:54-175`, `api.py:765-815`, `js/src/services/api.js:82-107` |
| P1 | Gallery video preview | Client plays full media via `/view` for videos in feed (`js/src/features/gallery/components/GalleryItem.jsx:145-223`) | Provide server-side preview video endpoint (low-res/bitrate) or server-side poster + short preview clip using ffmpeg | **Estimate:** large bandwidth + decode savings in feed; faster scroll and less memory use | M | Med | `js/src/features/gallery/components/GalleryItem.jsx:145-223`, `api.py:1492-1579`, `requirements.txt:1-3` |
| P2 | Workflow input schema | Client parses full workflow JSON and extracts inputs/choices in browser (`js/src/features/workflow/hooks/useWorkflowForm.js:62-177`) | If P0 implemented, add a compact “workflow schema” endpoint for input rendering so the UI no longer needs the full workflow graph | **Estimate:** reduced network payloads and JS parsing cost on workflow switch | M | Med | `js/src/features/workflow/hooks/useWorkflowForm.js:62-177`, `js/src/services/api.js:42-107` |

## D) Detailed Recommendation Sections

### 1) P0 — Server-side workflow assembly, alias expansion, prompt-raw storage, and queueing
1. **What happens today**
   - Client computes `effectiveFormData`, expands aliases (`applyAliasesToForm`), clones the workflow graph, and injects form values (`injectFormValues`).
   - Client scans prompt targets for raw alias usage, posts prompt-raw metadata, and expands aliases across the full workflow tree before calling `/prompt` (`js/src/features/workflow/hooks/useExecutionQueue.js:369-489`).
2. **Why it’s expensive on the client**
   - Deep clone via JSON stringify/parse and per-node injection across the workflow graph happen on the main thread (`js/src/features/workflow/utils/workflowGraph.js:7-74`).
   - Alias expansion is regex-heavy and can iterate multiple passes per string (`js/src/utils/promptAliases.js:35-139`).
3. **Offload design**
   - Add a CozyGen backend endpoint (e.g., `POST /cozygen/api/queue`) that accepts `{workflow_name, form_values, overrides?}`.
   - Backend loads the workflow JSON, injects values, expands aliases using the server-side alias store, stores prompt-raw data, and then enqueues the prompt.
   - The endpoint should call the existing ComfyUI `/prompt` API as-is (sanctioned interaction), avoiding any changes to ComfyUI internals. I cannot confirm from this repo how to call `/prompt` server-side; this requires using ComfyUI’s server APIs or HTTP client from `api.py` (`js/src/services/api.js:61-69`).
4. **Client changes**
   - Remove client-side workflow cloning/injection and alias expansion in `useExecutionQueue` and send the form payload only.
   - Keep alias expansion for preview in the composer if needed, but not for final queue payloads.
5. **Server changes**
   - Implement the new route in `api.py` and port the minimal alias expansion and workflow injection logic (currently only in JS).
   - Store prompt-raw metadata as part of the queue request instead of a separate client-side call (`api.py:833-853`).
6. **Acceptance criteria**
   - Queue submission time (client-side measure from click → `/prompt` response) improves by a measurable margin on large workflows.
   - Client JS profiling shows reduced time in alias expansion and JSON cloning during “Generate”.
7. **Evidence**
   - `js/src/features/workflow/hooks/useExecutionQueue.js:369-489`
   - `js/src/features/workflow/utils/workflowGraph.js:7-74`
   - `js/src/utils/promptAliases.js:35-161`
   - `api.py:833-853`
8. **Edge cases & failure modes**
   - Server-side alias expansion must match existing client semantics (weighted aliases, category-aware tokens).
   - If alias expansion differs, prompt outputs will change; mitigate by reusing the same tests/fixtures.

### 2) P1 — Server-side gallery search/filtering and pagination
1. **What happens today**
   - Client fetches gallery items (paged) and then filters by hidden/type/name query in memory (`js/src/features/gallery/hooks/useGallery.js:54-175`).
   - Server supports `kind`, `show_hidden`, `recursive`, and paging, but does not expose `q` filtering (`api.py:765-815`).
2. **Why it’s expensive on the client**
   - Client may receive many items and then discard most; this scales poorly for large output folders.
   - Client-side filtering invalidates pagination accuracy for search; users can get empty pages while matches exist elsewhere.
3. **Offload design**
   - Add an optional `q` parameter to `/cozygen/api/gallery` and filter filenames server-side before pagination.
   - Keep `kind` and `show_hidden` enforced server-side so the client doesn’t re-filter.
4. **Client changes**
   - Remove or simplify in-memory filtering for `query` and rely on server results.
   - Use server-reported `total_pages` for accurate pagination.
5. **Server changes**
   - Add `q` support in `gallery_list` and apply filtering within `_collect_*` or before `_slice_items`.
   - Optionally cache by query string in `_gallery_cache_key`.
6. **Acceptance criteria**
   - Query searches return correct paged results without client-side filtering.
   - Network payloads for gallery requests shrink when `q` is used.
7. **Evidence**
   - `js/src/features/gallery/hooks/useGallery.js:54-175`
   - `api.py:765-815`
   - `js/src/services/api.js:82-107`
8. **Edge cases & failure modes**
   - Ensure case-insensitive matching matches current client behavior (`toLowerCase()` in client).
   - For recursive searches, consider server-side path normalization to avoid path traversal issues.

### 3) P1 — Server-side video preview for gallery feed
1. **What happens today**
   - Gallery feed uses `/view` for video playback, which implies full-resolution video transfer and decode in the browser (`js/src/features/gallery/components/GalleryItem.jsx:145-223`).
   - Server has thumbnail generation using ffmpeg but only returns a single JPEG thumbnail (`api.py:1492-1579`).
2. **Why it’s expensive on the client**
   - Full video downloads increase bandwidth and decoding costs, slowing feed scroll and increasing memory usage.
3. **Offload design**
   - Add a lightweight preview endpoint (e.g., `/cozygen/video_preview`) that transcodes a short, low-res preview clip or lower-bitrate proxy using ffmpeg.
   - Reuse the existing thumbnail cache directory structure to store previews.
4. **Client changes**
   - Use preview URLs in the feed for `<video>` sources and reserve `/view` for full-screen playback.
   - Keep existing poster thumbnails via `/cozygen/thumb`.
5. **Server changes**
   - Implement preview generation using ffmpeg (already in deps via `imageio-ffmpeg`, and `ffmpeg` path checks already used in `_make_video_thumb`).
6. **Acceptance criteria**
   - Feed video requests transfer significantly less data (measurable via DevTools network totals).
   - Scroll and autoplay responsiveness improves on large video-heavy folders.
7. **Evidence**
   - `js/src/features/gallery/components/GalleryItem.jsx:145-223`
   - `api.py:1492-1579`
   - `requirements.txt:1-3`
8. **Edge cases & failure modes**
   - If ffmpeg is unavailable, fall back to `/view` or static poster to avoid breaking the feed.

### 4) P2 — Server-side workflow input schema endpoint (post-P0 optimization)
1. **What happens today**
   - Client fetches full workflow JSON and extracts input nodes and choices on every workflow switch (`js/src/features/workflow/hooks/useWorkflowForm.js:62-177`).
2. **Why it’s expensive on the client**
   - Large workflow graphs require JSON parsing and filtering in the browser, even though only input schema is needed for the UI.
3. **Offload design**
   - Add a server endpoint that returns a compact list of input definitions and defaults (schema) derived from the workflow JSON.
   - If P0 is implemented, the client no longer needs the full workflow graph for queueing.
4. **Client changes**
   - Replace `getWorkflow` usage with `getWorkflowSchema` for rendering controls.
5. **Server changes**
   - Add schema extraction logic in `api.py` to parse the workflow and return only CozyGen input nodes and choices.
6. **Acceptance criteria**
   - Workflow switch reduces downloaded bytes and JS parse time (measure with DevTools).
7. **Evidence**
   - `js/src/features/workflow/hooks/useWorkflowForm.js:62-177`
   - `js/src/services/api.js:42-107`
8. **Edge cases & failure modes**
   - Schema must include all data required by UI (default values, choice lists) to avoid regressions.

## E) Optional Appendix: Measurement & Verification Plan
- **Browser profiling**: Capture Performance profiles for “Generate” before/after P0, focusing on JS self-time in alias expansion and JSON cloning.
- **Network baselines**: Record payload size for workflow fetches and gallery list responses (`/cozygen/workflows/*`, `/cozygen/api/gallery`).
- **User metrics**: Track time from “Generate” click to status update, and gallery first-paint timing markers already in the code (`cozygen:gallery:fetch/ready`).
- **Server logs**: Add simple timing logs around new server endpoints (queueing, gallery filtering, preview generation).
