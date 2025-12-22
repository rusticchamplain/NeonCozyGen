# Phase 2 — UI Unification Pass

## Summary

- Consolidated gallery chip + pagination buttons onto `ui/primitives/Button.jsx`.
- Added `ui-button.is-chip` as the canonical pill/chip variant.
- Removed unused CSS blocks and legacy utilities to reduce UI bloat.

## Code & Markup Changes

- `js/src/features/gallery/components/GalleryNav.jsx`
  - Replaced `gallery-chip-btn` buttons with `Button` using `variant="chip"` + `size="xs"`.
- `js/src/features/gallery/pages/Gallery.jsx`
  - Pagination arrows now use `Button` (`size="icon"`, `variant="ghost"`).
  - Filter button uses shared `mobile-only` utility class.
- `docs/STRUCTURE.md`
  - Documented `is-chip` button variant and removed mobile-helpers reference.

## CSS Unification

- `js/src/styles/ui-kit.css`
  - Added `.ui-button.is-chip` variant.
  - Removed unused gallery UI blocks: `gallery-kind-toggle`, `gallery-view-toggle`, `gallery-pagination-mini`,
    `gallery-chip-row`, `gallery-pills`, `gallery-pill`, `gallery-option-btn`, `gallery-page-btn`,
    `gallery-topbar*`, `gallery-controls*`, and related duplicates.
  - Removed unused floating action button styles and `section-chip-button`.
- `js/src/styles/gallery.css`
  - Removed unused `.media-btn` variants.
- `js/src/styles/studio.css`
  - Removed unused `.btn-hero` variants.
- `js/src/styles/utilities.css`
  - Removed unused toast styles.
  - Added `.mobile-only` utility for shared mobile-only controls.
- `js/src/styles/base.css`
  - Centralized `.btn-touch` sizing + radius.

## Files Removed

- `js/src/styles/utilities/mobile.css` (no usages found).
