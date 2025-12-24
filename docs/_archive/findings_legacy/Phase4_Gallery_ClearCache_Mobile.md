# Phase 4 — Gallery Clear Cache (Mobile + Thumb Busting)

Summary:
- Exposed the Clear Cache action inside the mobile gallery filters sheet so it is available on small screens.
- Added a cache-busting `v=` param to thumbnail URLs based on the file timestamp to avoid stale thumbs when filenames are reused.

Files touched:
- `js/src/features/gallery/pages/Gallery.jsx`
- `js/src/features/gallery/components/GalleryItem.jsx`
