# Implementation Plan (Contract)

This plan maps the required UX changes to implementation phases. Each phase has a definition of done (DoD) and is actionable.

## Phase 0: Docs-as-contract

Deliverables:
- `docs/UX-PRINCIPLES.md`
- `docs/UI-DESIGN-SYSTEM.md`
- `docs/INFORMATION-ARCHITECTURE.md`
- `docs/IMPLEMENTATION-PLAN.md`

DoD:
- Principles and UI rules are prescriptive.
- Navigation model is defined for mobile and desktop.

## Phase 1: Audit the current experience

Scope:
- List all routes and primary flows from the codebase.
- Identify click depth hotspots and nested surfaces.
- Identify UI drift and duplicated patterns.

Audit findings (from current code):
- Mobile uses both BottomNav and TopBar hamburger (`TopBar.jsx`, `BottomNav.jsx`), causing redundant nav.
- Library access is nested behind a popover in BottomNav (extra click).
- Gallery filters are split between inline toolbar (desktop) and a sheet (mobile).
- Prompt re-run options are now surfaced inline in the MediaViewer with metadata-style rows.
- Rerun prompt replacements are inline via element chips; full editor remains for deep edits.
- Prompt composer alias/tag insertion uses selection + Insert bar even for single items (extra tap for quick inserts).
- Multiple action affordances for render exist (BottomNav, Controls dock).
- Routes today: `/login`, `/studio`, `/controls`, `/compose`, `/gallery`, `/aliases`, `/tags`.
- Primary flows: workflow selection + controls + render; compose + insert tags/aliases + render; gallery browse + viewer + rerun; tag search + collect + copy; alias CRUD + validation + categories.
- Hotspots: bottom-nav popover for Library on mobile, TopBar drawer on desktop (extra taps), rerun sheet nesting for prompt edits, small icon-only actions in dense lists.
- Inconsistencies: page headers and action placement vary per route, mixed button sizes (`mini` vs `xs`), and duplicate nav entry points for tags/aliases.

DoD:
- Findings are captured in docs.
- Target end state is defined per screen.

## Phase 2: Overhaul UI to match the docs

Targets:
- Navigation: remove mobile hamburger, remove library popover, introduce `/library` with tabs; TopBar is brand/session only.
- Prompt editing: use inline rerun edits for frequent tweaks; full editor handles advanced edits.
- Rerun editor: metadata-style rows in-frame with interactive prompt chips and inline Replace/Strength.
- Mobile actions: make primary actions visible without navigation hops.
- Composer: support single-tap tag/alias insert when no multi-select is active.

Per-screen end state:
- Controls: render action always visible (dock bar).
- Compose: render action visible in page header or dock.
- Gallery: view mode and filters visible in header; rerun is one tap.
- Library: single page with Tags/Aliases tabs and remembered state.
- Routes: `/tags` and `/aliases` redirect to `/library` with the correct tab.

DoD:
- BottomNav reflects the new nav model.
- Mobile flows avoid nested menus for primary actions.

## Phase 3: Consolidate global UI elements

Targets:
- Remove redundant nav surfaces and popovers.
- Use canonical primitives only (Button, SegmentedTabs, Select, BottomSheet).
- Remove legacy CSS blocks for deprecated patterns.

DoD:
- No library popover styles or logic remain.
- No mobile menu drawer in TopBar.

## Phase 4: Performance and mobile expense reduction

Targets:
- Pause background updates when hidden.
- Avoid unbounded DOM in heavy lists.
- Reduce image/video decode churn in gallery feeds.
- Defer prompt parsing work until the rerun editor is open.

DoD:
- Visibility-aware data refresh in gallery.
- Virtualized lists for > 80 items.
- No excessive re-renders in heavy flows.
- Prompt element parsing runs only when rerun options or the prompt editor are visible.
