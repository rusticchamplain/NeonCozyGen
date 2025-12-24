# 50 - Contributing Guide

## Quality bar

- Preserve behavior and UI unless the change is explicitly approved.
- Reuse existing UI primitives and composites.
- Prefer small, low-risk changes with clear boundaries.
- Add tests when logic changes are non-trivial.

## How to add a feature without UI drift

1) Start with the placement rules in `docs/20-REPO-STRUCTURE.md`.
2) Use primitives from `js/src/ui/primitives/`.
3) If you need a new UI pattern:
   - Add it once in `js/src/ui/primitives/` or `js/src/ui/composites/`.
   - Style it in `js/src/styles/ui-kit.css`.
   - Document it in `docs/30-UI-DESIGN-SYSTEM.md`.
4) Do not add new one-off styles in feature CSS unless there is no shared alternative.

## Reuse over reinvent

- Buttons: always use `Button`.
- Toggle groups: always use `SegmentedTabs`.
- Lists and dropdowns: always use `Select` or list components already in the feature.
- Sheets: always use `BottomSheet`.

## Code conventions

- Keep feature code inside its feature folder.
- Keep shared utilities in `js/src/utils/`.
- Keep cross-feature hooks in `js/src/hooks/`.
- Avoid circular dependencies between features.

## Contribution workflow (lightweight)

1) Create a focused change (one feature or concern at a time).
2) Update or add tests if behavior changes.
3) Validate UI on desktop and mobile.
4) Update docs if you introduce new patterns or change workflows.

## Tests and verification

- Run `npm run test:run` before shipping logic changes.
- If you modify API routes, verify the UI flows that depend on them.
- If you change CSS in `ui-kit.css`, validate at least one mobile and one desktop layout.
