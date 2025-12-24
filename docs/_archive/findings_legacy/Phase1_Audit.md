# Phase 1 Audit + UI Unification Strategy (ComfyUI_CozyGen)

Note: `AGENTS.md` not found in this repo.

## 1) Current Structure (as-is)

### Directory tree (build artifacts/deps excluded)

```text
ComfyUI_CozyGen/
├── api.py
├── auth.py
├── nodes.py
├── __init__.py
├── data/
│   ├── aliases.json
│   ├── danbooru_tags.md
│   ├── workflow_presets.json
│   ├── workflow_types.json
│   └── thumbs/...
├── js/
│   ├── src/
│   │   ├── __tests__/
│   │   ├── components/
│   │   │   ├── inputs/
│   │   │   ├── ui/
│   │   │   ├── workflow/
│   │   │   └── <misc components>
│   │   ├── config/
│   │   ├── contexts/
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── test/
│   │   ├── utils/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── web/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── scripts/
│   └── reclassify_danbooru_tags.py
├── workflows/
│   ├── Smooth I2V-2.json
│   └── Text 2 Image.json
├── NodeExpansionPlan.md
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
└── LICENSE
```

### Major directories: what they contain, what they should contain, and boundary violations

- `data/`
  - Contains: `aliases.json`, `workflow_*`, `danbooru_tags.md`, runtime output `thumbs/output/...`.
  - Should contain: canonical data/config only.
  - Boundary violations: runtime/generated thumbnails mixed with canonical data.

- `js/`
  - Contains: Vite app source (`src`), ComfyUI web extension scripts (`web`), build output (`dist`), npm config.
  - Should contain: frontend source and build config; build output should be optional/ignored; ComfyUI web extensions should be clearly separated.
  - Boundary violations: `js/web` (ComfyUI web extension) co-located with app source but different purpose; build output mixed with source.

- `js/src/components/`
  - Contains: primitives (`components/ui`), feature components (gallery/composer/workflow), layout (TopBar/BottomNav), inputs.
  - Should contain: clearly separated UI primitives, composites, and feature-owned components.
  - Boundary violations: mixed responsibilities and empty placeholder dirs (`components/lora`, `components/presets`, `components/wizard`).

- `js/src/pages/`
  - Contains: route-level pages with heavy feature logic.
  - Should contain: thin page shells that compose feature modules.
  - Boundary violations: feature logic and UI variants live directly in pages.

- `js/src/styles/` vs `js/src/index.css`
  - Contains: only `mobile-helpers.css`, while `index.css` is a 9.5k line monolith.
  - Should contain: cohesive, discoverable style system.
  - Boundary violations: tokens, base, primitives, layouts, and feature styles all in one file.

- `scripts/`, `workflows/`
  - Clear responsibilities; no major issues.

### Confusion hotspots

- `js/src/index.css` (~9494 lines) contains tokens, base, primitives, layout, feature styles, utilities, and animations in one file.
- `js/src/components` mixes primitives, layout, and feature components; empty dirs indicate stale or unclear feature ownership.
- Duplicate UI patterns in CSS: `.toast` and `.toast-notification` both exist; `.btn-touch` is defined in both `index.css` and `styles/mobile-helpers.css`.
- `components/ui/Toast.jsx` is not referenced in `js/src` (no usage found), and `.btn-hero`/`.composer-tabs` styles exist without `js/src` matches.
- Data naming collision: `data/` and `js/src/data/` are unrelated but similarly named.
- Tests split between `js/src/__tests__` and `js/src/test` (setup file), which hides conventions.

## 2) UI Inventory: primitives + variants

### Primitives / reusable UI components

- **Button**: `js/src/components/ui/Button.jsx` with `.ui-button` variants in `js/src/index.css`.
- **Select**: `js/src/components/ui/Select.jsx` uses `.ui-control` + `.ui-select`.
- **Segmented Tabs**: `js/src/components/ui/SegmentedTabs.jsx` + `.segmented-tabs` styles.
- **BottomSheet**: `js/src/components/ui/BottomSheet.jsx` + `.bottom-sheet-*` styles.
- **FieldRow**: `js/src/components/ui/FieldRow.jsx` (composite; label + trailing UI).
- **Toast**: `js/src/components/ui/Toast.jsx` + `.toast-notification` styles.
- **Inputs**: `js/src/components/inputs/*` use `.ui-control`, `.ui-input`, `.ui-textarea`, `.ui-switch`.

### Existing variants and where they live

- **Buttons** (variants via CSS classes):
  - `ui-button` variants: `.ui-button`, `.is-primary`, `.is-ghost`, `.is-muted`, `.is-danger`, `.is-icon` in `js/src/index.css`.
  - Feature-specific buttons: `.wizard-btn`, `.gallery-chip-btn`, `.gallery-option-btn`, `.gallery-page-btn`, `.dock-primary-btn`, `.page-bar-btn`, `.media-btn`, `.composer-add-btn`, `.desktop-render-btn`, `.floating-render-button`, `.bottom-nav-link`, `.btn-hero`.

- **Select/Input variants**:
  - Base `.ui-control`, `.ui-select`, `.ui-input`, `.ui-textarea` in `js/src/index.css`.
  - Feature-specific variants: `.context-select`, `.workflow-bar-select`, `.composer-subcategory-select`, `.chip-select`, `.gallery-search-input`, `.context-input`, `.workflow-bar-input`, `.tag-quick-input`.

- **Switch**:
  - `.ui-switch` used by `js/src/components/inputs/BooleanInput.jsx`.

- **Tabs**:
  - `SegmentedTabs` primitive uses `.segmented-tabs`.
  - `.composer-tabs` exists in CSS without `js/src` usage.

- **Cards/Surfaces**:
  - Many styles in `js/src/index.css`: `.ui-card`, `.collapsible-card`, `.control-card`, `.sectioned-card`, `.synth-panel`, `.stack-card`, `.wizard-card`, `.lora-card`, `.landing-card`, `.login-card`, `.gallery-feed-card`, `.studio-preview-card`.

- **Modals/Sheets**:
  - `BottomSheet` (`.bottom-sheet-*`).
  - React Modal styles `.react-modal-*` used by `MediaViewerModal`.
  - Specialized sheets: `TextAreaSheet`, `TokenStrengthSheet`, `UrlViewerSheet`.

- **Toasts**:
  - `.toast-notification` (used by `Toast.jsx`).
  - `.toast` (no `js/src` usage found).

- **Chips/Pills/Badges**:
  - Global: `.ui-pill`, `.slim-chip`, `.badge-dot`.
  - Feature: `.gallery-pill`, `.context-chip`, `.token-chip`, `.tag-chip`, `.lora-card-chip`, `.composer-category-pill`.

### Canonical selections (for unification)

- **Buttons**: `ui-button` + `Button` component are canonical; map feature-specific button styles to variants.
- **Inputs/Selects**: `ui-control` + `Select` are canonical; consolidate input variants around size + intent classes.
- **Switch**: `ui-switch` is canonical.
- **Tabs**: `SegmentedTabs` is canonical; deprecate `.composer-tabs` if unused.
- **Cards/Surfaces**: define canonical `Card` + `CollapsibleCard` composites; map feature cards to these.
- **Modals/Sheets**: `BottomSheet` is canonical for mobile sheets; add a canonical dialog variant for desktop to replace ad-hoc modal styles.
- **Toasts**: keep `Toast` + `.toast-notification`; deprecate `.toast` if unused.
- **Chips/Pills**: define a canonical `Chip/Pill` primitive for tag/pill patterns.

### Re-implementation hotspots

- `GalleryNav`, `MediaViewerModal`, `PromptComposer`, and other feature components use bespoke CSS classes for buttons/inputs instead of primitives.
- Multiple button styles and chip/pill patterns defined directly in feature CSS.

## 3) Target Mental Model

Top-level categories:

- `app/`: app shell, routing, top-level providers.
- `ui/primitives/`: canonical design-system components only.
- `ui/composites/`: reusable components built from primitives.
- `ui/layout/`: global layout (TopBar/BottomNav/etc).
- `features/<feature>/`: feature-owned components, hooks, utils, feature styles.
- `services/`: API + storage adapters.
- `hooks/`, `utils/`: shared-only, cross-feature.
- `styles/`: tokens/base/primitives/layout/utilities + feature styles.

Placement rules:

- If it defines a new global UI pattern: `ui/primitives`.
- If it composes primitives across features: `ui/composites`.
- If it only serves one domain: `features/<feature>`.
- If it talks to network/storage: `services/`.
- If it is shared-only logic: `hooks/` or `utils/`.

Naming conventions:

- Components: `PascalCase.jsx`.
- Hooks: `useX.js`.
- Styles: `kebab-case.css`.
- Classes: `ui-*` reserved for primitives; `feature-*` prefix for feature styles.

## 4) Proposed Target Structure (enforces UI reuse)

```text
js/src/
├── app/
│   ├── App.jsx
│   ├── main.jsx
│   ├── router.jsx
│   └── providers/
├── ui/
│   ├── primitives/
│   ├── composites/
│   └── layout/
├── features/
│   ├── gallery/
│   ├── workflow/
│   ├── composer/
│   ├── aliases/
│   ├── tags/
│   ├── studio/
│   └── auth/
├── services/
├── hooks/
├── contexts/
├── utils/
├── styles/
│   ├── index.css
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── primitives/
│   ├── utilities/
│   └── features/
└── assets/
```

Charters:

- `ui/primitives/`: the only place allowed to define global UI patterns; no feature logic.
- `ui/composites/`: shared composite components only; feature ownership not allowed.
- `features/`: feature-owned UI, hooks, utils, and styles; no new primitives.
- `styles/`: structure for tokens/base/primitives/feature styles to keep the system discoverable.

Rules to prevent UI drift:

- Pages/features must import primitives rather than creating custom button/input/dropdown styles.
- New UI patterns must update `ui/primitives` and corresponding `styles/primitives` files.
- Feature CSS must not define `ui-*` classes; use feature-prefix classes only.

## 5) Styling system restructuring plan

### Diagnosis of `js/src/index.css`

- Contains: tokens, base, layout, primitives, utilities, animations, and a large amount of feature-specific styling.
- Duplicated patterns: `.toast` vs `.toast-notification`, `.btn-touch` repeated.
- Many feature-specific selectors with broad scope; risk of leaky styles.

### Proposed structure

- `styles/index.css`: only `@import` statements.
- `styles/tokens.css`: CSS variables for colors, spacing, radii, shadows.
- `styles/base.css`: `html`, `body`, element resets, base typography.
- `styles/layout.css`: app shell, nav layout, top bar/bottom nav.
- `styles/primitives/`:
  - `buttons.css`, `forms.css`, `tabs.css`, `cards.css`, `overlays.css`, `chips.css`, `feedback.css`.
- `styles/utilities/`:
  - `animations.css`, `helpers.css`, `mobile.css` (move `mobile-helpers.css` here).
- `styles/features/`:
  - `gallery.css`, `composer.css`, `tags.css`, `aliases.css`, `workflow.css`, `studio.css`, `auth.css`.

Guardrails:

- Tokens only in `styles/tokens.css`.
- `ui-*` classes only in `styles/primitives/*`.
- Feature styles must use `<feature>-*` class prefix.
- Avoid base element styling in feature CSS.

## 6) Split vs Condense: criteria and candidates

Criteria:

- Split if: multiple responsibilities, unrelated UI sections, or distinct interactions in one file.
- Merge if: tiny files only re-export or add indirection without clarity.

Split candidates:

- `js/src/components/PromptComposer.jsx` (1315 lines): split into token list, alias panel, tag panel, preview.
- `js/src/pages/Aliases.jsx` (1189 lines): split into alias list, editor, toolbar.
- `js/src/components/MediaViewerModal.jsx` (858 lines): split modal shell, meta panel, actions.
- `js/src/components/inputs/StringInput.jsx` (763 lines): split editor + alias picker + tokens.
- `js/src/components/DynamicForm.jsx` (660 lines): split renderer, inputs registry, control layout.

Merge candidates:

- Auth hooks: `useAuth.jsx`, `useAuthContext.js`, `useAuthConstants.js` could be consolidated under `features/auth`.
- Sheets in `components/ui` could be grouped under `ui/composites` or feature folders.

## 7) Incremental Roadmap (PR-sized)

- **PR1 (pure moves)**: create `ui/` and `app/` folders, move primitives/layout components, update imports; verify `npm test` and `npm run build`.
- **PR2 (pure moves)**: move pages + feature components into `features/*`, update routes; verify tests.
- **PR3 (pure moves)**: move feature hooks/utils/data into feature folders; create `services/` and move `api.js`.
- **PR4 (touch code)**: split `index.css` into `styles/*` and update `main.jsx` import.
- **PR5 (touch code, UI unification)**: map feature-specific buttons/inputs to primitives, deprecate redundant CSS (`.toast` vs `.toast-notification`).
- **PR6 (refactor)**: split large files into subcomponents.
- **PR7 (cleanup/docs)**: remove empty dirs, prune dead CSS, add `docs/STRUCTURE.md`.

Rollback strategy: each PR is scoped to either pure moves or localized refactors; reverting a PR should restore previous paths/styles without functional changes.

## 8) Mapping Table (current path -> proposed path)

```text
js/src/components/ui/Button.jsx -> js/src/ui/primitives/Button.jsx
js/src/components/ui/Select.jsx -> js/src/ui/primitives/Select.jsx
js/src/components/ui/SegmentedTabs.jsx -> js/src/ui/primitives/SegmentedTabs.jsx
js/src/components/ui/BottomSheet.jsx -> js/src/ui/primitives/BottomSheet.jsx
js/src/components/ui/FieldRow.jsx -> js/src/ui/composites/FieldRow.jsx
js/src/components/ui/Toast.jsx -> js/src/ui/primitives/Toast.jsx
js/src/components/ui/TextAreaSheet.jsx -> js/src/ui/composites/TextAreaSheet.jsx
js/src/components/ui/TokenStrengthSheet.jsx -> js/src/ui/composites/TokenStrengthSheet.jsx
js/src/components/ui/UrlViewerSheet.jsx -> js/src/ui/composites/UrlViewerSheet.jsx
js/src/components/Icons.jsx -> js/src/ui/primitives/Icons.jsx

js/src/components/BottomNav.jsx -> js/src/ui/layout/BottomNav.jsx
js/src/components/TopBar.jsx -> js/src/ui/layout/TopBar.jsx

js/src/components/DynamicForm.jsx -> js/src/features/workflow/components/DynamicForm.jsx
js/src/components/WorkflowSelectorSection.jsx -> js/src/features/workflow/components/WorkflowSelectorSection.jsx
js/src/components/FieldSpotlight.jsx -> js/src/features/workflow/components/FieldSpotlight.jsx
js/src/components/BottomBar.jsx -> js/src/features/workflow/components/BottomBar.jsx
js/src/components/RunLogsSheet.jsx -> js/src/features/workflow/components/RunLogsSheet.jsx
js/src/components/ImageInput.jsx -> js/src/features/workflow/components/ImageInput.jsx
js/src/components/ImagePickerSheet.jsx -> js/src/features/workflow/components/ImagePickerSheet.jsx
js/src/components/workflow/WorkflowFormLayout.jsx -> js/src/features/workflow/components/WorkflowFormLayout.jsx
js/src/components/workflow/panels/AllParametersPanel.jsx -> js/src/features/workflow/components/AllParametersPanel.jsx
js/src/components/inputs/*.jsx -> js/src/features/workflow/inputs/*.jsx

js/src/components/PromptComposer.jsx -> js/src/features/composer/components/PromptComposer.jsx
js/src/components/TagLibrarySheet.jsx -> js/src/features/tags/components/TagLibrarySheet.jsx
js/src/components/GalleryItem.jsx -> js/src/features/gallery/components/GalleryItem.jsx
js/src/components/GalleryNav.jsx -> js/src/features/gallery/components/GalleryNav.jsx
js/src/components/MediaViewerModal.jsx -> js/src/features/gallery/components/MediaViewerModal.jsx

js/src/pages/MainPage.jsx -> js/src/features/workflow/pages/WorkflowControlsPage.jsx
js/src/pages/Gallery.jsx -> js/src/features/gallery/pages/Gallery.jsx
js/src/pages/Composer.jsx -> js/src/features/composer/pages/Composer.jsx
js/src/pages/Aliases.jsx -> js/src/features/aliases/pages/Aliases.jsx
js/src/pages/TagLibrary.jsx -> js/src/features/tags/pages/TagLibrary.jsx
js/src/pages/StudioLanding.jsx -> js/src/features/studio/pages/StudioLanding.jsx
js/src/pages/Login.jsx -> js/src/features/auth/pages/Login.jsx

js/src/api.js -> js/src/services/api.js
js/src/utils/auth.js -> js/src/features/auth/utils/auth.js
js/src/hooks/useAuth.jsx -> js/src/features/auth/hooks/useAuth.jsx
js/src/hooks/useAuthContext.js -> js/src/features/auth/hooks/useAuthContext.js
js/src/hooks/useAuthConstants.js -> js/src/features/auth/hooks/useAuthConstants.js
js/src/hooks/useGallery.js -> js/src/features/gallery/hooks/useGallery.js
js/src/hooks/useImagePicker.js -> js/src/features/workflow/hooks/useImagePicker.js
js/src/hooks/useWorkflows.js -> js/src/features/workflow/hooks/useWorkflows.js
js/src/utils/promptOverrides.js -> js/src/features/composer/utils/promptOverrides.js
js/src/utils/workflowGraph.js -> js/src/features/workflow/utils/workflowGraph.js
js/src/config/loraPairs.js -> js/src/features/workflow/data/loraPairs.js
js/src/data/workflowPresets.js -> js/src/features/workflow/data/workflowPresets.js

js/src/index.css -> js/src/styles/index.css (split into structured imports)
js/src/styles/mobile-helpers.css -> js/src/styles/utilities/mobile.css
```

## Why this is better

- **Onboarding speed**: clear mental model (app/ui/features/services/styles) reduces searching and guesswork.
- **Predictable placement**: feature-owned code stays in feature folders; shared UI only in primitives/composites.
- **Reduced UI inconsistency**: all UI patterns flow through primitives, making variants explicit and controlled.

## Unclear intent / need confirmation

- Empty dirs: `js/src/components/lora`, `js/src/components/presets`, `js/src/components/wizard`.
- `js/src/data/workflowPresets.js` appears unused; confirm whether it is still intended.
- `js/src/components/ui/Toast.jsx` exists but is unused; `.toast` styles also appear unused.
- `data/thumbs/output/CozyGen` appears runtime-generated; should it live outside the repo or be gitignored?
- `js/dist` is served by `__init__.py`; confirm whether it should be committed or built locally.
