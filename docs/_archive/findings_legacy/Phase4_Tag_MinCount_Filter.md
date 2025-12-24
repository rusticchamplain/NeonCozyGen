## Phase 4 - Tag Minimum Count Filter

Summary:
- Added a minimum count filter for tag searches in both Prompt Composer and Tag Library, presented inline with sort controls.
- Wired the filter through frontend search caching and API requests.
- Added backend support for filtering tags by minimum count.
- Right-aligned the minimum count control within the sort row.

Files touched:
- `js/src/features/composer/components/PromptComposer.jsx`
- `js/src/features/tags/components/TagLibrarySheet.jsx`
- `js/src/styles/composer.css`
- `js/src/services/api.js`
- `api.py`
