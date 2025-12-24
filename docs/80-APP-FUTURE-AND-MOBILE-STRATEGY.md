# 80 - App Future and Mobile Strategy

This document is future-focused and may include ideas that require significant refactoring. It is grounded in what exists today and proposes two paths forward: incremental and overhaul.

## A) Current mobile experience analysis (grounded in code)

Based on the current UI and layout code:

- Navigation is split between a top bar (`js/src/ui/layout/TopBar.jsx`) and a bottom nav (`js/src/ui/layout/BottomNav.jsx`).
  - Bottom nav is always on mobile and includes a Render action plus a Library popover.
  - Top bar still includes a hamburger menu on mobile for the same routes.
  - This creates redundancy and consumes vertical space.

- Dense screens:
  - Prompt Composer (`js/src/features/composer/components/PromptComposer.jsx`) uses multiple tabs, filters, and large lists.
  - Alias and tag libraries can show long lists with filters and search.

- Touch targets:
  - Some controls use `size="mini"` in dense lists (e.g., reorder controls) which are small even with coarse pointer adjustments.
  - Icon-only actions are numerous and can cluster tightly on mobile.

- Layout overflow and readability:
  - Token chips, alias names, and tags can be long. Truncation is used in some places, but long content still risks wrapping.
  - Gallery directory chips are horizontally scrollable; this is functional but can feel hidden.

- Scrolling behavior:
  - Bottom sheets (used widely) can create nested scroll regions; ensure the sheet body scrolls rather than the page.
  - Gallery uses sticky header plus grid feed; combined with bottom nav this can reduce available view height.

- Performance hotspots:
  - Gallery uses virtualization and content-visibility, but thumbnails and video previews are still heavy on mobile.
  - Live updates use SSE with polling fallback in `useGallery`, which can be expensive on slow devices.
  - Prompt composer and tag library can render many list rows if not virtualized.

Most mobile-sensitive screens:
- Gallery (grid feed, media previews, video thumbnails, re-run sheet).
- Prompt Composer (long alias/tag lists, reordering, strength sheets).
- Controls page (dynamic form inputs and workflow panels).

## B) Mobile-first design goals (measurable outcomes)

- One-handed ergonomics:
  - Primary actions placed within thumb reach (bottom nav or bottom sheet actions).
  - Avoid critical actions at the top right on mobile.

- Navigation strategy:
  - Single source of navigation truth on mobile (prefer bottom nav).
  - Remove redundant mobile menu when bottom nav is present.

- Typography and spacing:
  - Minimum 14px for body text on mobile, 12px only for metadata.
  - 36px minimum touch targets for icon buttons.

- Safe-area handling:
  - Respect `env(safe-area-inset-bottom)` for bottom nav and sheets.
  - Bottom sheets must account for the keyboard and scroll the content, not the page.

- Viewport safety:
  - Menus and sheets should not overflow the viewport; scroll content instead.
  - Prevent horizontal scrolling unless it is explicitly a chip row.

- Accessibility:
  - All mobile controls reachable by keyboard and screen reader.
  - Icon-only buttons must have `aria-label`.

## C) Two-path strategy

### 1) Incremental path (low risk)

Goal: improve mobile usability without changing architecture.

Prioritized improvements (effort / impact):

1) Navigation cleanup (medium / high)
   - On mobile, hide the top-bar menu when bottom nav is visible.
   - Keep the bottom nav as the single navigation surface.

2) Touch target uplift (low / high)
   - Increase size for `mini` buttons in mobile contexts.
   - Add spacing around icon clusters in headers and bottom sheets.

3) Gallery performance guardrails (medium / high)
   - Reduce video preview auto-play on mobile (already toggleable).
   - Use smaller thumbnail sizes for small screens.

4) Sheet usability (medium / medium)
   - Ensure all sheet content is scrollable with a visible internal scrollbar.
   - Add in-sheet subheaders for long sections to reduce cognitive load.

5) Prompt composer usability (medium / high)
   - Keep aliases/tags in a consistent, searchable pattern.
   - Ensure element lists support a compact but readable layout.

6) UI primitive consolidation (medium / medium)
   - Continue eliminating one-off patterns and funnel all controls through primitives.

### 2) Overhaul path (high impact)

Goal: redesign mobile to be a first-class experience, even if it requires refactors.

Proposal:
- New navigation model:
  - Bottom nav with 4 core destinations (Controls, Compose, Gallery, Library).
  - Replace top-bar hamburger on mobile with a compact header bar.

- Screen layout model:
  - Use persistent "action rails" at the bottom for actions like Render, Apply, Clear.
  - Convert dense pages into stepped flows (progressive disclosure).

- Design system upgrade:
  - Introduce a single, standardized header component.
  - Move all filter controls into a consistent filter sheet pattern.

- State management:
  - Keep current local state and contexts if they remain manageable.
  - If state entanglement grows, consider a dedicated store (only after a clear need).

- Routing and page structure:
  - Evaluate a mobile-first route structure (e.g., dedicated Compose subroutes).
  - Consolidate repeated filter panels into shared components.

- Migration plan:
  - Build the new mobile header and filter sheet first.
  - Migrate screens one-by-one while keeping the old layout for desktop.

## D) Library/tooling recommendations (only if justified)

Consider only if the incremental path cannot meet goals:

- Virtualization: `react-window` or `react-virtuoso` if custom list hooks are insufficient.
- Popover positioning: `@floating-ui` if native selects are replaced with custom menus.
- Accessibility: `react-aria` if more complex keyboard interactions are introduced.

Trade-offs:
- Larger bundle sizes and more dependencies.
- Additional styling work to match existing UI.
- Increased maintenance cost.

## E) Mobile performance strategy

Likely root causes of excess resource usage:
- Large lists rendering without virtualization.
- Heavy image/video decoding in gallery views.
- Polling or SSE updates while the page is backgrounded.

Tactics:
- Enforce virtualization for lists above 100 items.
- Use `srcSet` and smaller thumbnails for mobile.
- Pause auto-play and background updates when `document.hidden`.
- Batch state updates in heavy flows (gallery, prompt composer).

Performance budgets (suggested):
- First interaction within 200ms on mobile.
- Gallery scroll at 50-60fps on mid-tier devices.
- Max 2 active network requests during idle view.

## F) Phased roadmap

Phase 1 (0-30 days)
- Remove redundant mobile navigation.
- Increase touch target sizes for mini actions in mobile contexts.
- Add a mobile-specific thumbnail size rule for the gallery.
- Definition of done: mobile navigation has a single source of truth; no touch targets under 36px.

Phase 2 (31-60 days)
- Consolidate filter sheets across screens.
- Normalize headers across Controls, Compose, Gallery.
- Add performance instrumentation (basic timing logs).
- Definition of done: common filters use a shared component and performance logs exist for gallery + composer.

Phase 3 (61-90 days)
- Optional: re-architecture mobile flows into progressive steps.
- Optional: redesign the prompt composer for one-handed use.
- Definition of done: mobile UX scorecard improves on navigation, speed, and readability.

Risks and mitigations:
- Risk: UI drift from large refactors.
  - Mitigation: lock primitives and update UI standards first.
- Risk: feature slowdowns during migration.
  - Mitigation: keep desktop unchanged while mobile is iterated.

## G) Think outside the box

Curated ideas aligned with CozyGen:

- "Quick Tune" mode for the gallery: a single sheet for seed, prompt elements, and size.
- A one-handed "Render Drawer" that exposes render controls without switching pages.
- A contextual "Recent Aliases" tray based on the last 10 alias inserts.
- Offline-safe browsing for the gallery grid with cached thumbnails.

Rules for experimentation:
- Prototype behind a flag or dedicated route.
- Measure impact with a basic checklist (time to find, time to edit, time to render).
- Remove prototypes that do not improve at least one target metric.

