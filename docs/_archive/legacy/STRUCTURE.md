# Repo Structure and Conventions

This document is the source of truth for where code lives and how to extend the UI without drift.

## UI standards

The canonical UI system is documented in `docs/UI_STANDARDS.md`. Follow it before introducing new components or styles.

## Mental model (top-level)

- `js/src/app/`: app shell, routing, and providers. No feature logic.
- `js/src/ui/`:
  - `ui/primitives/`: canonical design-system components.
  - `ui/composites/`: shared compositions built from primitives.
  - `ui/layout/`: global layout pieces (TopBar/BottomNav).
- `js/src/features/<feature>/`: feature-owned pages, components, hooks, and utils.
- `js/src/services/`: API clients and external IO.
- `js/src/hooks/`: shared hooks only (cross-feature).
- `js/src/utils/`: shared helpers only (cross-feature).
- `js/src/styles/`: global CSS split by intent (see below).

## Placement rules

- **New UI primitives** → `js/src/ui/primitives/` + styles in `js/src/styles/ui-kit.css`.
- **Reusable composites** (built from primitives) → `js/src/ui/composites/`.
- **Feature UI** → `js/src/features/<feature>/components/`.
- **Route pages** → `js/src/features/<feature>/pages/`.
- **Feature hooks/utils** → `js/src/features/<feature>/hooks|utils/`.
- **Shared hooks/utils** → `js/src/hooks/` or `js/src/utils/` only.
- **External IO** (API, storage adapters) → `js/src/services/`.

## Naming conventions

- Components: `PascalCase.jsx`.
- Hooks: `useThing.js`.
- CSS files: `kebab-case.css`.
- CSS classes:
  - `ui-*` reserved for primitives.
  - `feature-*` or `<feature>-*` for feature-specific styling.

## Canonical UI primitives

- `ui/primitives/Button.jsx` → `.ui-button` variants (including `is-chip` for breadcrumb/chip buttons, `is-bare` for unstyled click targets).
  - Sizes: `mini`, `xs`, `sm`, `md` (default), `lg`, `icon`.
- `ui/primitives/Select.jsx` → `.ui-control`, `.ui-select`.
  - Searchable dropdowns use `.ui-select-stack` (auto-added) and opt-in `searchable`/`searchThreshold`.
- `ui/primitives/SegmentedTabs.jsx` → `.segmented-tabs`.
- `ui/primitives/BottomSheet.jsx` → `.bottom-sheet-*`.
- `ui/primitives/Icons.jsx` → shared icon set.
- Surfaces: only `.ui-card` for standard cards and `.ui-panel` for large centered panels.
- Chips: use `.ui-chip` for static chips and `Button` with `variant="chip"` for interactive chips.

### Surfaces and cards

- `.ui-card` and `.ui-panel` are the only global surface classes; avoid adding new card/surface classes in feature CSS.
- If a new surface variant is truly required, define it in `js/src/styles/ui-kit.css` and update this document.

## Shared composites

- `ui/composites/FieldRow.jsx`
- `ui/composites/TextAreaSheet.jsx`
- `ui/composites/TokenStrengthSheet.jsx`
- `ui/composites/UrlViewerSheet.jsx`

## Styling system

`js/src/app/main.jsx` imports `js/src/styles/index.css`, which in turn imports:

- `styles/tailwind.css`: Tailwind directives.
- `styles/tokens.css`: design tokens (`:root` variables).
- `styles/base.css`: base layout, global resets, shell scaffolding.
- `styles/palette.css`: legacy Tailwind color mapping.
- `styles/ui-kit.css`: global UI primitives + shared patterns.
- `styles/studio.css`: studio landing and hero styling.
- `styles/workflow.css`: workflow/controls styling.
- `styles/overlays.css`: modal/sheet styling.
- `styles/aliases.css`: alias manager styling.
- `styles/tags.css`: tag library styling.
- `styles/gallery.css`: gallery + media viewer styling.
- `styles/composer.css`: prompt composer styling.
- `styles/utilities.css`: skeletons, animations, global helpers.

### Styling guardrails

- Do **not** create new one-off component styles inside features; update primitives instead.
- Only `ui-kit.css` should define or change `ui-*` classes.
- Feature CSS must use feature-prefixed selectors to avoid leakage.
- Prefer design tokens for spacing, radii, and colors.
- Avoid new card/surface classes in features; use `.ui-card`/`.ui-panel` plus minimal layout utilities.

## Legacy removal rule

If a file has no usage, assume it is legacy and remove it.
