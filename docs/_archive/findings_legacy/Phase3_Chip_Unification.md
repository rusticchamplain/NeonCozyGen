# Phase 3 — Chip Unification

## Summary

- Introduced canonical chip styling (`.ui-chip`) and migrated tag chips + tag suggestions to use `ui-chip` or `Button` `variant="chip"`.
- Migrated StringInput token chips to `ui-chip` + `Button` `variant="danger"` for removal.
- Removed legacy tag chip CSS blocks from feature styles and centralized touch sizing in `ui-kit.css`.
- Updated collected-tag chips to use canonical chip styling and Button primitives for removal actions.

## Files touched

- `js/src/styles/ui-kit.css`
- `js/src/features/aliases/pages/Aliases.jsx`
- `js/src/features/tags/components/TagLibrarySheet.jsx`
- `js/src/features/workflow/inputs/StringInput.jsx`
- `js/src/styles/overlays.css`
- `js/src/styles/tags.css`
- `docs/STRUCTURE.md`
- `AGENTS.md`
