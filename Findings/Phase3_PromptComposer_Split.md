# Phase 3 — Prompt Composer Decomposition

## Summary

- Extracted `TagComposerRow` and `ComposerSelectionBar` into feature components to reduce `PromptComposer.jsx` size.
- Kept data flow and virtualization behavior unchanged by passing the visibility style through.

## Files touched

- `js/src/features/composer/components/PromptComposer.jsx`
- `js/src/features/composer/components/TagComposerRow.jsx`
- `js/src/features/composer/components/ComposerSelectionBar.jsx`
