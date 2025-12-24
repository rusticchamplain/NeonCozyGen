# 70 - Future Experiments (Ideas Playground)

This document defines a safe way to prototype without polluting core flows.

## Experiment rules

- Prototypes must be isolated and easy to delete.
- No new global primitives during experimentation.
- Do not break or override existing UI flows.
- Keep experiments behind explicit flags or routes.

## Suggested experiment boundaries

- Use a temporary route under `js/src/features/studio/pages/StudioLanding.jsx` or a local toggle in a feature page.
- Keep experimental components in a single folder and remove them before merge.
- If the experiment requires a new API, stub it in the UI first and validate the direction.

## What good experiments look like

- A new layout of the Prompt Composer that still uses existing primitives.
- A revised gallery browsing flow using existing filters and tiles.
- A new preset management UX built on `Select`, `Button`, and `BottomSheet`.

## How to propose a new primitive (rare)

A new primitive must solve a repeated problem and be used by at least two features.

Checklist:
- Define it in `js/src/ui/primitives/`.
- Style it in `js/src/styles/ui-kit.css`.
- Document it in `docs/30-UI-DESIGN-SYSTEM.md`.
- Replace any duplicated feature-level implementations.

