# Phase 2 — Card/Surface Consolidation

## Summary

- Consolidated shared surfaces onto `.ui-card` / `.ui-panel`.
- Removed legacy card variants that had no usage.
- Simplified feature markup to use canonical surfaces + minimal layout classes.

## Markup changes

- `js/src/features/studio/pages/StudioLanding.jsx`
  - Replaced `home-info-card` with `.ui-card` and inline utility typography.
- `js/src/features/auth/pages/Login.jsx`
  - Replaced `neon-card` with `.ui-card` and moved sizing to utility classes.
- `js/src/features/workflow/pages/WorkflowControlsPage.jsx`
  - Replaced `neon-card` with `.ui-card` for empty workflows notice.
  - Dock panel now uses `.ui-card` (`dock-panel ui-card`).
- `js/src/features/workflow/components/ImageInput.jsx`
  - Replaced `asset-card` with `.ui-card`.
- `js/src/features/tags/components/TagLibrarySheet.jsx`
  - Replaced `tag-library-page` with `.ui-card` for inline tag library.
- `js/src/features/composer/components/PromptComposer.jsx`
  - Composer page container uses `.ui-card` instead of `composer-shell.is-page`.
- `js/src/features/workflow/components/CollapsibleSection.jsx`
  - Removed unused `sectioned-card` class.

## CSS cleanup

- Removed legacy card classes:
  - `home-info-card`, `neon-card`, `login-card`, `asset-card`, `tag-library-page`, `stack-card`, `synth-panel`,
    `landing-card*`, `wizard-*`, `lora-card*`, `lora-editor*`, `studio-preview-card*`,
    `gallery-feed-card`, `control-card*`, `guide-*`.
- Removed composer-specific overrides tied to `sectioned-card` / `control-card`.
- Dock panel now relies on `.ui-card` for surface styling (kept layout-only rules).

## Files touched

- `js/src/styles/workflow.css`
- `js/src/styles/studio.css`
- `js/src/styles/base.css`
- `js/src/styles/tags.css`
- `js/src/styles/composer.css`
- `docs/STRUCTURE.md`
