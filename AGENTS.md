# AGENTS.md — CozyGen Repo Guide

This file is the shared guide for contributors and agents working in this repo.

## Repo map (high level)

- `api.py`, `auth.py`, `nodes.py`, `__init__.py`: Python backend + ComfyUI entrypoint.
- `data/`: canonical data files used by the backend (plus runtime thumbs if generated locally).
- `js/`: React + Vite frontend.
  - `js/src`: app source.
  - `js/web`: ComfyUI web extension scripts.
  - `js/dist`: built frontend assets (served by the backend).
- `workflows/`: example workflows.

## Global rules

- Preserve behavior and UI. Avoid stylistic drift or feature redesign.
- If you cannot find a use for a file, assume it is legacy and remove it.
- Prefer incremental, low-risk changes. Keep paths stable unless there is a clear benefit.
- Avoid new dependencies unless absolutely necessary.

## Frontend placement rules (current structure)

- App shell + routing live in `js/src/app/`.
- UI primitives live in `js/src/ui/primitives/`.
- Shared composites live in `js/src/ui/composites/`.
- Global layout lives in `js/src/ui/layout/`.
- Feature code lives in `js/src/features/<feature>/` (pages/components/hooks/utils).
- Shared hooks live in `js/src/hooks/`.
- Shared utilities live in `js/src/utils/`.
- API clients live in `js/src/services/`.
- App entry points are `js/src/app/main.jsx` and `js/src/app/App.jsx`.

## UI consistency guardrails

- Do not introduce new one-off button, input, chip, or card styles in feature code.
- Use existing primitives and variants (`.ui-button`, `.ui-control`, `.segmented-tabs`, `.bottom-sheet-*`, `.ui-card`, `.ui-panel`, `.ui-chip`).
- Canonical surfaces are `.ui-card` (standard) and `.ui-panel` (large centered). Do not reintroduce legacy card classes.
- If a new surface pattern is required, add it to `js/src/styles/ui-kit.css` and document it in `docs/STRUCTURE.md`.
- If a new UI pattern is truly needed, define it once in `js/src/ui/primitives/` and style it consistently.
- Follow `docs/UI_STANDARDS.md` for canonical primitives, dropdown rules, and button variants.

## Styling rules

- Global styles are composed in `js/src/styles/index.css`.
- `js/src/styles/ui-kit.css` owns all `ui-*` class definitions.
- Prefer CSS variables already defined in `:root` for color/spacing/radius.
- Feature-specific selectors should use a feature prefix to avoid leaking styles.

## Testing and build

- Frontend tests: `npm test` or `npm run test:run` in `js/`.
- Frontend build: `npm run build` in `js/`.

## Planned restructure

A Phase 1 audit and restructure strategy exists in `Findings/Phase1_Audit.md`. Follow its guidance when reorganizing code or unifying UI patterns.
Structure conventions are documented in `docs/STRUCTURE.md`.
Phase 2 UI unification notes live in `Findings/Phase2_UI_Unification.md` and `Findings/Phase2_Card_Unification.md`.
