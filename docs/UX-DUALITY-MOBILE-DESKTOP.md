# UX Duality: Mobile + Desktop Strategy (CozyGen)

This document defines a single UX system that serves mobile and desktop without splitting the product. It is grounded in the current CozyGen UI and codebase and is intended to preserve feature parity while respecting platform constraints.

References: `docs/30-UI-DESIGN-SYSTEM.md`, `docs/80-APP-FUTURE-AND-MOBILE-STRATEGY.md`, `js/src/app/App.jsx`, `js/src/ui/layout/TopBar.jsx`, `js/src/ui/layout/BottomNav.jsx`, `js/src/features/*`, `js/src/styles/*`.

## 1) Shared mental model (unified product truth)

### Core objects and vocabulary (canonical labels)

| Object | Canonical label | Description | Primary surfaces |
| --- | --- | --- | --- |
| Workflow | "Workflow" | A workflow file that defines inputs and generation graph. | Controls page (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`) |
| Preset | "Preset" | Saved parameter sets for a workflow. | Controls page (workflow selector section) |
| Prompt | "Prompt" | The editable text used to render. | Composer page (`js/src/features/composer/pages/Composer.jsx`), Controls prompt fields |
| Prompt elements | "Tags", "Aliases" | Tokens that build a prompt. | Composer, Tag Library, Aliases |
| Alias | "Alias" | Named prompt macro with optional category. | Aliases page (`js/src/features/aliases/pages/Aliases.jsx`) |
| Tag | "Tag" | Searchable tags from the reference set. | Tag Library (`js/src/features/tags/pages/TagLibrary.jsx`) |
| Gallery item | "Gallery" | Rendered output with metadata and rerun actions. | Gallery page (`js/src/features/gallery/pages/Gallery.jsx`) |
| Render queue | "Render" | The action and status of generation. | BottomNav render button, Controls dock bar |
| Media viewer | "Viewer" | Modal for viewing and re-running media. | `js/src/features/gallery/components/MediaViewerModal.jsx` |

Vocabulary rules:
- Use the same labels on all platforms: Controls, Compose, Gallery, Aliases, Tag Library, Render, Workflow, Preset.
- Do not rename concepts per platform. Adapt presentation only.

### Key workflows (shared across platforms)

1) Select workflow -> adjust controls -> render.
2) Compose prompt -> insert tags/aliases -> render.
3) Browse gallery -> open viewer -> re-run with overrides.
4) Maintain aliases -> validate tags -> save.
5) Search tags -> collect -> copy into prompt or alias.

### Definition of "full functionality"

Mobile and desktop must both support the full set of capabilities already present:
- Workflow selection, dynamic inputs, and preset CRUD.
- Prompt composition with tags, aliases, and token strength adjustments.
- Gallery browse, viewer, rerun, delete, and metadata access.
- Tag library search, filter, collect, and copy.
- Alias library CRUD, validation, and category management.
- Render queue status, progress, and logs.

No "lite" flows are allowed; only progressive disclosure and density changes are permitted.

## 2) Two personas / two contexts, one system

| Dimension | Mobile context | Desktop context |
| --- | --- | --- |
| Session length | Short, interrupted bursts; quick edits and checks. | Longer, focused sessions; deep tuning and iteration. |
| Attention model | Multitask, notification prone, one-handed. | Focused, multi-window, precise. |
| Primary input | Touch, thumb reach, soft keyboard. | Mouse, trackpad, keyboard shortcuts. |
| Constraints | Limited viewport, keyboard occlusion, battery, limited GPU/CPU. | Large screens, higher input precision, more compute. |
| Common pitfalls | Accidental taps, nested scroll, keyboard overlays, modal overflow. | Over-dense UI, unclear hierarchy, sprawling layouts, inconsistent variants. |

Failure modes to guard against:
- Mobile: hidden actions in top-right, tap targets below 36px, sheets that trap scrolling, menus off-screen.
- Desktop: inconsistent toolbars, panels with no visual hierarchy, overly wide text lines, multi-pane clutter.

## 3) Layout strategy: responsive by intent, not by accident

### Information hierarchy rules

Always visible (all platforms):
- Page identity (page title or header).
- Primary action for the current task (Render, Save, Apply).
- Current workflow and render status (where relevant).

Progressively disclosed:
- Advanced filters and long lists (via BottomSheet or secondary panel).
- Secondary actions (export, copy, bulk actions).
- Metadata and logs.

Decision table (visibility and placement):

| UI element | Mobile placement | Desktop placement | Rule |
| --- | --- | --- | --- |
| Global nav | Bottom nav (`js/src/ui/layout/BottomNav.jsx`) | Left rail + top bar (`js/src/ui/layout/TopBar.jsx`) | One primary nav surface per platform; no duplicates. |
| Page title | `page-bar` or compact header | `page-bar` | Title always visible before first interaction. |
| Primary action | Bottom nav action or dock bar | Top bar or dock bar | Primary action must be reachable without scroll on mobile. |
| Filters | Sheet drawer | Toolbar + sheet | Same filters, same order, same defaults. |
| Logs | Sheet | Side panel or sheet | Logs must not block primary workflow. |

### Navigation model

- Desktop: BottomNav acts as the left rail with primary routes; TopBar is brand + session only (`js/src/styles/base.css`).
- Mobile: BottomNav is the single navigation surface; avoid parallel hamburger navigation (`docs/80-APP-FUTURE-AND-MOBILE-STRATEGY.md`).
- Keep routes consistent: `/controls`, `/compose`, `/gallery`, `/library`. Deep links `/tags` and `/aliases` redirect to `/library` (`js/src/app/App.jsx`).

### Progressive disclosure patterns

Use existing primitives and patterns:
- Bottom sheets for dense settings and lists (`js/src/ui/primitives/BottomSheet.jsx`).
- Sheet stacks with labeled sections for long forms (`js/src/styles/overlays.css`).
- Collapsible sections for optional groups (`js/src/features/workflow/components/CollapsibleSection.jsx`).
- Field spotlight for deep-edit on mobile without losing context (`js/src/features/workflow/components/FieldSpotlight.jsx`).

### Desktop density rules

- Prefer `page-shell` max width to avoid overly wide reading lanes (`js/src/styles/base.css`).
- Keep dense forms in columns only if it preserves scan order; otherwise stack.
- Use consistent `page-bar` headers and action clusters to reduce drift.
- Avoid long horizontal lists without scroll affordances (e.g., chip rows must show overflow cues).

## 4) Component behavior parity

Canonical behavior is identical; only presentation adapts. Options, order, and semantics must be the same on all platforms.

| Component category | Canonical behavior | Mobile adaptation | Desktop adaptation | Viewport safety rules |
| --- | --- | --- | --- | --- |
| Dropdowns and menus | Use `Select` and `SegmentedTabs` with consistent ordering (`docs/30-UI-DESIGN-SYSTEM.md`). | If long: searchable select or sheet list. Tap targets >= 36px. | Inline select or toolbar controls. | No off-screen menus; clamp to viewport or use sheet. |
| Forms and inputs | Use `FieldRow`, `ui-control`, and dynamic inputs (`js/src/features/workflow/*`). | Progressive sections, minimal columns. Keyboard-safe padding. | Inline with previews and helper text. | Inputs stay visible when keyboard opens. |
| Modals and sheets | Use `BottomSheet` for settings and lists; MediaViewer is modal (`js/src/features/gallery/components/MediaViewerModal.jsx`). | Sheets are default; modal adapts to bottom-sheet style on small screens (`js/src/styles/overlays.css`). | Centered modal or side-by-side layout. | No nested scroll traps; body scroll locked; close action always visible. |
| Cards and surfaces | `ui-card` and `ui-panel` only (`docs/30-UI-DESIGN-SYSTEM.md`). | Full-width cards, reduced padding. | Grid or masonry layouts with consistent gutters. | Prevent overflow; truncate long labels. |
| Lists and grids | Use virtualization when item count is high (`js/src/hooks/useVirtualList.js`). | Single or 2-column grid; sheet for filters. | Multi-column grid + toolbar (`js/src/styles/ui-kit.css`). | No unbounded DOM; keep scroll area in main content. |
| Toolbars and action rows | `page-bar` and dock bar as primary containers. | Actions moved to sheet footers or bottom dock. | Actions in toolbar with secondary groups. | Actions never overlap safe areas or bottom nav. |

## 5) Interaction and accessibility standards

Touch and spacing:
- Minimum 44x44 for primary buttons; never below 36x36 for icon-only actions (see `js/src/styles/base.css`).
- Maintain 8px minimum spacing between tap targets in clusters.
- Use `env(safe-area-inset-bottom)` for BottomNav and sheets (already in base and overlays CSS).

Keyboard and focus:
- All controls are keyboard reachable; `:focus-visible` must be visible (`js/src/styles/base.css`).
- Modal and sheet close buttons are always focusable (`docs/30-UI-DESIGN-SYSTEM.md`).
- Escape closes sheets and modals; focus returns to the invoking control.
- Support external keyboards on mobile by preserving tab order.

Error, empty, loading states:
- Use explicit text for empty states and recovery steps (e.g., gallery empty, workflow missing).
- Loading indicators must not block navigation unless required (e.g., auth gating).
- Errors provide a single clear action: retry, reload, or open settings.

Dual-mode QA checklist:
- [ ] One primary nav surface per platform (no duplicate mobile navs).
- [ ] Primary action reachable without scroll on mobile.
- [ ] Sheets and modals scroll internally and never overflow the viewport.
- [ ] No touch targets below 36px; primary actions at least 44px.
- [ ] Keyboard navigation works, focus returns on close, Escape dismisses overlays.
- [ ] Long lists and grids are virtualized or paged.

## 6) Performance and "expense" considerations by platform

Mobile: avoid
- Heavy image/video decoding in gallery feeds; prefer smaller `srcSet`/`sizes`.
- Auto-play video previews by default (`js/src/features/gallery/pages/Gallery.jsx`).
- Full list renders in sheets (use `useVirtualList` when item count is high).
- Background polling and SSE when the page is hidden (`js/src/hooks/usePageVisibility.js`).

Desktop: avoid
- Unbounded grid/list DOM sizes in gallery and libraries.
- Multiple component variants for the same role (e.g., custom buttons outside primitives).
- Oversized empty space that lowers information density.

Shared guardrails and measurement

| Metric | Target | Where to measure |
| --- | --- | --- |
| First interaction latency | <= 200ms on mobile | `useGallery` performance marks (`js/src/features/gallery/hooks/useGallery.js`) |
| Scroll performance | 50-60fps on gallery and long lists | Gallery grid, Tag Library, Aliases |
| Render feedback | Status visible within 250ms | BottomNav + dock bar |

Rules:
- Lists > 80 items must use virtualization or progressive loading.
- Pause or throttle background updates when hidden.
- Avoid state updates in tight loops; batch where possible.
- Defer prompt parsing and rerun token work until the editor or options sheet is open.

## 7) Concrete recommendations grounded in the current repo

### Most mobile-sensitive screens and flows

- Gallery grid + viewer + rerun sheet: `js/src/features/gallery/pages/Gallery.jsx`, `js/src/features/gallery/components/MediaViewerModal.jsx`.
- Prompt Composer with tag/alias lists and token strength: `js/src/features/composer/components/PromptComposer.jsx`.
- Controls page dynamic form and sheets: `js/src/features/workflow/pages/WorkflowControlsPage.jsx`.
- Tag Library sheet (search + collect): `js/src/features/tags/components/TagLibrarySheet.jsx`.
- Alias editor sheets (validation + categories): `js/src/features/aliases/pages/Aliases.jsx`.

### Most desktop-critical flows

- Workflow tuning and presets in Controls: `js/src/features/workflow/pages/WorkflowControlsPage.jsx`.
- Gallery browsing with toolbar and filters: `js/src/features/gallery/pages/Gallery.jsx`.
- Alias and tag management with large lists: `js/src/features/aliases/pages/Aliases.jsx`, `js/src/features/tags/pages/TagLibrary.jsx`.
- Prompt composition with multi-step edits: `js/src/features/composer/pages/Composer.jsx`.

### Top inconsistencies blocking unified UX

- Redundant navigation on mobile (TopBar drawer + BottomNav) and duplicated routes (`js/src/ui/layout/TopBar.jsx`, `js/src/ui/layout/BottomNav.jsx`).
- Library access is nested behind a BottomNav popover (extra tap) and Tags/Aliases are separate routes (`js/src/ui/layout/BottomNav.jsx`, `js/src/app/App.jsx`).
- Overlay patterns differ between BottomSheet and MediaViewer modal, risking inconsistent behaviors (`js/src/ui/primitives/BottomSheet.jsx`, `js/src/features/gallery/components/MediaViewerModal.jsx`, `js/src/styles/overlays.css`).
- Action density varies by page: `page-bar` styles live in `js/src/styles/workflow.css` and are used across pages without a single layout primitive.
- `size="mini"` buttons appear in dense lists (e.g., `js/src/features/gallery/components/GalleryItem.jsx`, `js/src/features/composer/components/PromptComposer.jsx`, `js/src/features/workflow/inputs/StringInput.jsx`) and risk small targets on mobile.
- Filters and list patterns differ between Gallery and Tag Library, increasing cognitive load (`js/src/features/gallery/pages/Gallery.jsx`, `js/src/features/tags/components/TagLibrarySheet.jsx`).

### Canonical UI primitives and patterns to lock

Keep and formalize the existing primitives:
- `Button`, `SegmentedTabs`, `Select`, `BottomSheet`, `Icons` (`js/src/ui/primitives/*`).
- `ui-card`, `ui-panel`, `ui-control` surfaces (`js/src/styles/ui-kit.css`).
- Composites: `FieldRow`, `TokenStrengthSheet`, `TextAreaSheet`, `UrlViewerSheet` (`js/src/ui/composites/*`).
- Layout primitives: `TopBar`, `BottomNav`, `page-bar`, and dock bar (`js/src/ui/layout/*`, `js/src/styles/workflow.css`, `js/src/features/workflow/components/BottomBar.jsx`).

## 8) Roadmap options (strategy only)

### Path A: Incremental dual-mode alignment (low risk)

Phase A1 (0-30 days)
- Remove redundant mobile navigation; keep BottomNav as the single mobile nav.
- Normalize page headers using `page-bar` on all routes.
- Bump touch targets for all `mini` buttons in mobile contexts.
- Definition of done: single mobile nav surface, no touch target below 36px.

Phase A2 (31-60 days)
- Standardize filter sheets (Gallery, Tag Library, Composer) with a shared section order.
- Align overlay behavior between BottomSheet and MediaViewer (close behavior, focus return, scroll locks).
- Definition of done: common filter structure and unified overlay rules.

Phase A3 (61-90 days)
- Performance guardrails: list virtualization for >80 items and pause updates on hidden pages.
- Add lightweight performance logging to heavy flows (Gallery, Composer, Aliases).
- Definition of done: measurable improvements in scroll and first interaction latency.

### Path B: Overhaul toward a unified dual-mode system (high impact)

Phase B1
- Redesign navigation with a single, route-driven nav model (bottom on mobile, left rail + top actions on desktop).
- Introduce a canonical header component for all pages and sheets.
- Definition of done: consistent navigation and header patterns across all screens.

Phase B2
- Re-architect dense flows into progressive steps (Controls -> Compose -> Review -> Render).
- Consolidate filter logic and list patterns into shared composites.
- Definition of done: common step-based flows with identical semantics across platforms.

Phase B3
- Optional: introduce new UI primitives only if existing ones cannot meet parity goals.
- Only add dependencies with a clear performance or accessibility gain.
- Definition of done: reduced component drift and verified parity across mobile and desktop.
