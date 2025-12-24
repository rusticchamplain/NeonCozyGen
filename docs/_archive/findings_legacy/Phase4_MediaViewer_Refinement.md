## Phase 4 - MediaViewer Modal Refinement

Summary:
- Added a `media-viewer-dialog` class to the modal container to enable gallery-specific sizing and layout control.
- Ensured the modal panel can flex to the available height without clipping by tightening flex/min-size constraints.
- Refined stage padding to scale across viewport sizes and stacked metadata rows on mobile for readability.
- Swapped the MediaViewer top-bar delete and re-run actions to smaller icon-only controls for a cleaner header.
- Reordered the MediaViewer action buttons to: Open → Metadata → Re-run → Delete.
- Aligned the delete icon button height to the text actions and restored the re-run control to match the text button style.

Files touched:
- `js/src/features/gallery/components/MediaViewerModal.jsx`
- `js/src/features/gallery/components/MediaViewerHeader.jsx`
- `js/src/styles/gallery.css`
