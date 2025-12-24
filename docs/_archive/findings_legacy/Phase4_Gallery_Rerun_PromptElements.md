## Phase 4 - Gallery Re-run Prompt Elements

Summary:
- Integrated a Prompt Composer-inspired elements list into the gallery re-run sheet so tags/aliases can be adjusted before re-running.
- Added prompt-target detection and prompt text overrides to update graph text nodes safely during re-run.
- Enabled per-element strength adjustment and removal via the shared TokenStrengthSheet.
- Adjusted prompt element parsing so weighted alias expansions with commas stay grouped as a single element.
- Limited prompt element selection to targets that actually contain elements.
- Made rerun option sections collapsible with only Seed open by default.
- Enabled drag-and-drop reordering of prompt elements in the rerun sheet.
- Added touch drag support (long-press handle) for reordering prompt elements on mobile.
- Added prompt element tabs (Elements/Aliases/Tags) so rerun edits can add new aliases/tags from the same canonical pickers used in Prompt Composer.
- Added alias/tag search and category filters in the rerun sheet and prevented duplicate inserts with quick status feedback.

Files touched:
- `js/src/features/gallery/components/MediaViewerModal.jsx`
- `js/src/features/workflow/utils/promptOverrides.js`
- `js/src/__tests__/promptOverrides.test.jsx`
- `js/src/utils/tokenWeights.js`
- `js/src/__tests__/tokenWeights.test.js`
- `js/src/__tests__/MediaViewerModal.test.jsx`
