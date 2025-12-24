# 60 - Troubleshooting

## UI shows "Build not found"

- Cause: ComfyUI could not find `js/dist/index.html`.
- Fix: Run `npm run build` inside `js/`.

## 401 Unauthorized from `/cozygen/api/*`

- Cause: Auth is enabled and the token is missing/expired.
- Fix:
  - Check `.env` for `COZYGEN_AUTH_USER` and `COZYGEN_AUTH_PASS`.
  - Log in via the UI.
  - If you changed credentials, restart ComfyUI.

## Gallery thumbnails look stale

- Cause: Thumbnails are cached in `data/thumbs/`.
- Fix:
  - Use "Clear cache" in the gallery filters sheet (mobile) or toolbar (desktop).
  - This calls `/cozygen/api/clear_cache` and regenerates thumbs.

## Tag library shows no results

- Cause: `data/danbooru_tags.md` is missing or unreadable.
- Fix:
  - Ensure the file exists in `data/`.
  - Restart ComfyUI after updating the file.

## Vite dev server cannot reach the API

- Cause: ComfyUI is not running or not on the default port.
- Fix:
  - Start ComfyUI first.
  - Verify the proxy target in `js/vite.config.js`.

## Prompt queueing fails

- Cause: `/prompt` endpoint is unavailable or auth blocked.
- Fix:
  - Check ComfyUI logs for errors.
  - Ensure auth tokens are valid.

