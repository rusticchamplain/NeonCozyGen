# 20 - Repo Structure

## Top-level layout

- `api.py`, `auth.py`, `nodes.py`, `__init__.py`: CozyGen backend and ComfyUI integration.
- `data/`: backend data files and generated thumbnails.
- `js/`: frontend source and build output.
  - `js/web/`: ComfyUI web extension scripts for custom nodes.
- `workflows/`: example workflows.
- `scripts/`: helper scripts (if any).
- `docs/`: current documentation (this directory).

## Frontend structure (preferred)

```
js/src/
  app/            App shell, routing, entry setup
  features/       Feature modules (pages, components, hooks, utils)
  hooks/          Shared hooks used across features
  services/       API clients and network wrappers
  styles/         CSS tokens, base, ui-kit, feature styles
  ui/             Global UI primitives and composites
  utils/          Shared utilities and formatting helpers
```

### Directory charters and placement rules

- `js/src/app/`
  - App root only: routing, providers, layout wiring.
  - Example: `js/src/app/App.jsx`.

- `js/src/ui/primitives/`
  - Canonical UI building blocks: Button, Select, SegmentedTabs, BottomSheet, Icons.
  - Never reimplement these in feature code.

- `js/src/ui/composites/`
  - Composed UI blocks built from primitives.
  - Example: `js/src/ui/composites/TokenStrengthSheet.jsx`.

- `js/src/ui/layout/`
  - Global layout components used across pages.
  - Example: `js/src/ui/layout/TopBar.jsx`.

- `js/src/features/<feature>/`
  - Feature-scoped pages, components, hooks, and utils.
  - Example: `js/src/features/gallery/pages/Gallery.jsx`.

- `js/src/hooks/`
  - Cross-feature hooks that are not specific to one feature.
  - Example: `js/src/hooks/useVirtualList.js`.

- `js/src/services/`
  - Network API functions.
  - Example: `js/src/services/api.js`.

- `js/src/utils/`
  - Shared, domain-agnostic utilities.
  - Example: `js/src/utils/tokenWeights.js`.

- `js/src/styles/`
  - `tokens.css`, `base.css`, `ui-kit.css` are global foundations.
  - Feature-specific styles live in `gallery.css`, `composer.css`, etc.

### Placement examples from this repo

- `js/src/features/gallery/components/GalleryItem.jsx` is a feature component.
- `js/src/features/gallery/hooks/useGallery.js` is a feature hook.
- `js/src/features/workflow/utils/promptOverrides.js` is a feature utility.
- `js/src/ui/primitives/Button.jsx` is a global primitive.
- `js/src/styles/ui-kit.css` defines global UI styling.

## When to split vs when to merge

Split a file when:
- It has more than one responsibility (state + rendering + helpers in a single file).
- A block of logic is reused in another feature and can be shared cleanly.
- The file exceeds roughly 250-400 lines with multiple unrelated sections.

Merge or inline when:
- A file only exports a single trivial helper used once.
- The indirection makes it harder to understand the feature flow.
- The abstraction forces callers to re-wire the same data repeatedly.

## CSS placement rules

- Global primitives and design tokens belong in `js/src/styles/ui-kit.css` and `tokens.css`.
- Base element styles belong in `js/src/styles/base.css`.
- Feature-specific selectors belong in the feature stylesheet (`gallery.css`, `composer.css`, etc).
- Avoid global, unscoped selectors that leak into other features.
