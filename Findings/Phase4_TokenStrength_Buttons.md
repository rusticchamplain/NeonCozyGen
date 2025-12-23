## Phase 4 - Token Strength Buttons Simplification

Summary:
- Removed the "Remove strength" action from the TokenStrengthSheet.
- Kept only two actions in the button row: Reset and Delete.
- Forced a horizontal "Reset | Delete" layout with a visible divider between the two buttons.
- Tuned button widths to avoid horizontal overflow.

Files touched:
- `js/src/ui/composites/TokenStrengthSheet.jsx`
- `js/src/styles/ui-kit.css`
