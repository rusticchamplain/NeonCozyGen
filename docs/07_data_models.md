# Data Models (Current State)

## Local JSON Files (server-side)

### `data/aliases.json`
- Stored and retrieved directly by `/cozygen/api/aliases` without schema enforcement. (`api.py`:1093-1101)
- The UI saves alias data as `{ items, categories, categoryList }` when using the alias editor. (`js/src/features/aliases/hooks/usePromptAliases.js`:135-168)
- `items` is a map of alias key -> string value; `categories` is a map of alias key -> category string; `categoryList` is a list of category names. (`js/src/features/aliases/hooks/usePromptAliases.js`:135-168)
- Because the server accepts any JSON payload, the file may also contain arbitrary JSON if written by other clients. (`api.py`:1098-1101)

### `data/workflow_types.json`
- Stored as `{ "version": 1, "workflows": { [workflowName]: mode } }`. (`api.py`:230-238)
- Valid modes are limited to: `text-to-image`, `text-to-video`, `image-to-image`, `image-to-video`. (`api.py`:33-38, 1386-1388)

### `data/workflow_presets.json`
- Normalized to `{ "version": 2, "users": { [user]: { "workflows": { [workflowName]: [preset...] }}}}`. (`api.py`:240-257, 1397-1482)
- Preset entries include `id`, `name`, `values`, `updated`, `created`. (`api.py`:1465-1471)

### `data/prompt_raw_store.json`
- Stored as `{ "version": 1, "prompts": { [promptId]: { "raw": <map>, "ts": <timestamp> } }, "files": { [fileKey]: { "prompt_id": <id>, "ts": <timestamp> } } }`. (`prompt_raw_store.py`:16-37, 121-142)
- Prompt entries are capped at 2000 and file entries at 4000. (`prompt_raw_store.py`:10-99)

### `data/danbooru_tags.md`
- Parsed into categories and tag items by `_parse_danbooru_tags_md` for tag browsing and validation. (`api.py`:108-187)

## PNG Prompt Metadata
- The backend reads PNG metadata fields `prompt`, `extra_pnginfo`, and `cozygen_prompt_raw` when serving gallery prompt data. (`api.py`:535-591)
- The structure of `prompt` JSON is not defined in this repository; it is parsed as JSON and returned as-is when present. (`api.py`:535-544, 582-589)

## Client-Side Storage
- Workflow form state is persisted per workflow name under session storage key `${workflowName}_formData`. (`js/src/features/workflow/utils/storage.js`:171-203)
- Last edited param is stored under `cozygen_last_param` in session storage. (`js/src/features/workflow/utils/storage.js`:262-305)
- Gallery view mode and autoplay preferences are stored under `cozygen_gallery_view_mode` and `cozygen_gallery_feed_autoplay`. (`js/src/features/gallery/pages/Gallery.jsx`:26-200)
- Gallery path and pagination preferences are stored under `galleryPath` and `galleryPageSize`. (`js/src/features/gallery/hooks/useGallery.js`:30-43, 122-124)
