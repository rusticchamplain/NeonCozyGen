# Phase 4 — UI Standards + Primitive Consolidation

## Summary

- Added `docs/UI_STANDARDS.md` to codify canonical primitives, dropdown rules, and guardrails.
- Converted all remaining `ui-button` usages to the `Button` primitive across features and sheets.
- Standardized selects by removing legacy `sheet-select` classes and adding `ui-select-stack` to support searchable dropdowns.
- Removed legacy/unused CSS blocks (context bar/select, once-done menu, slim-chip, sheet-select).
- Centralized shared `ui-*` control styles in `js/src/styles/ui-kit.css`.
- Moved global textarea baseline rules into `js/src/styles/base.css`.
- Added select text truncation to prevent long labels from overflowing.

## Files touched

- `docs/UI_STANDARDS.md`
- `docs/STRUCTURE.md`
- `AGENTS.md`
- `js/src/ui/primitives/Select.jsx`
- `js/src/styles/workflow.css`
- `js/src/styles/overlays.css`
- `js/src/styles/ui-kit.css`
- `js/src/features/aliases/pages/Aliases.jsx`
- `js/src/features/auth/pages/Login.jsx`
- `js/src/features/composer/components/PromptComposer.jsx`
- `js/src/features/gallery/components/MediaViewerModal.jsx`
- `js/src/features/gallery/pages/Gallery.jsx`
- `js/src/features/tags/components/TagLibrarySheet.jsx`
- `js/src/features/workflow/components/FieldSpotlight.jsx`
- `js/src/features/workflow/components/ImageInput.jsx`
- `js/src/features/workflow/components/ImagePickerSheet.jsx`
- `js/src/features/workflow/components/RunLogsSheet.jsx`
- `js/src/features/workflow/components/WorkflowSelectorSection.jsx`
- `js/src/features/workflow/inputs/StringInput.jsx`
- `js/src/features/workflow/inputs/StringInputAliasPicker.jsx`
- `js/src/ui/composites/TextAreaSheet.jsx`
- `js/src/ui/composites/TokenStrengthSheet.jsx`
- `js/src/ui/composites/UrlViewerSheet.jsx`
