# Phase 3 — Button Unification (Top Bar, Dock, Tags, Composer)

## Summary

- Replaced custom button classes with the `Button` primitive in the composer, tag collection, dock bar, top bar, controls status, library popover, image preview, and string input underbar actions.
- Added `lg` and `mini` sizes for `ui-button` to support large CTAs and micro actions without one-off styles.
- Added `is-bare` for unstyled click targets and removed legacy button CSS blocks (including unused workflow bar and context buttons).

## Files touched

- `js/src/features/composer/components/PromptComposer.jsx`
- `js/src/features/tags/components/TagLibrarySheet.jsx`
- `js/src/features/workflow/components/BottomBar.jsx`
- `js/src/features/workflow/components/ImageInput.jsx`
- `js/src/features/workflow/pages/WorkflowControlsPage.jsx`
- `js/src/features/workflow/inputs/StringInput.jsx`
- `js/src/ui/layout/TopBar.jsx`
- `js/src/ui/layout/BottomNav.jsx`
- `js/src/ui/primitives/Button.jsx`
- `js/src/styles/ui-kit.css`
- `js/src/styles/composer.css`
- `js/src/styles/tags.css`
- `js/src/styles/studio.css`
- `js/src/styles/base.css`
- `js/src/styles/workflow.css`
- `js/src/styles/overlays.css`
- `docs/STRUCTURE.md`
