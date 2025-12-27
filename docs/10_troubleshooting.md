# Troubleshooting (Current State)

This section lists error states and messages that are explicitly present in the code. No additional guidance is inferred beyond what the repository provides.

## Backend
- **Frontend build missing:** The server returns `500` with message “CozyGen: Build not found. Please run `npm run build` in the `js` directory.” when `js/dist/index.html` is missing. (`__init__.py`:41-49)
- **Auth disabled:** `/cozygen/api/login` returns `{"error":"auth_disabled"}` when auth is not enabled. (`api.py`:1601-1605)
- **Invalid login:** `/cozygen/api/login` returns `{"error":"invalid_credentials"}` with 401 on bad credentials. (`api.py`:1614-1616)
- **Gallery errors:** `/cozygen/api/gallery` returns errors for bad paging, forbidden paths, or missing directories. (`api.py`:773-784)
- **Prompt metadata not found:** `/cozygen/api/gallery/prompt` returns `{"error":"prompt metadata not found"}` with 404 when metadata is missing. (`api.py`:825-828)
- **Tag reference unavailable:** `/cozygen/api/tags/categories` and `/cozygen/api/tags/search` return errors if `danbooru_tags.md` cannot be loaded. (`api.py`:1155-1157, 1175-1177)

## Frontend
- **Login errors:** UI shows “Invalid username or password.” or “Unable to sign in. Please try again.” based on login failure. (`js/src/features/auth/pages/Login.jsx`:45-49)
- **Gallery load error:** UI shows “Unable to load gallery right now.” if the gallery fetch fails. (`js/src/features/gallery/hooks/useGallery.js`:101-108)
- **Tag library search/load errors:** UI shows “Unable to load tags right now.” or “Unable to load more tags.” on search failures. (`js/src/features/tags/components/TagLibrarySheet.jsx`:363-428)
- **Alias save errors:** UI shows “Unable to save right now.” on alias save failure. (`js/src/features/aliases/pages/Aliases.jsx`:196-198)
