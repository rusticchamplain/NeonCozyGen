## Phase 4 - Gallery Delete Action

Summary:
- Added a backend endpoint to delete output files safely from the gallery.
- Added a delete action in the MediaViewer header with confirmation and refresh.
- Added a delete action on gallery tiles with confirmation and per-item busy state.
- Tuned the gallery delete control to a smaller trash icon aligned with the gallery surface.
- Removed the metadata badge from thumbnails so the delete icon is the only overlay.

Files touched:
- `api.py`
- `js/src/services/api.js`
- `js/src/features/gallery/components/MediaViewerModal.jsx`
- `js/src/features/gallery/components/MediaViewerHeader.jsx`
- `js/src/features/gallery/components/GalleryItem.jsx`
- `js/src/features/gallery/pages/Gallery.jsx`
- `js/src/styles/workflow.css`
