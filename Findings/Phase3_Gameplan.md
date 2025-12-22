# Phase 3+ — Repo Restructure & UI Unification Gameplan

This plan builds on Phase 1 audit and Phase 2 unification work already captured in:
- `Findings/Phase1_Audit.md`
- `Findings/Phase2_UI_Unification.md`
- `Findings/Phase2_Card_Unification.md`
- `Findings/Phase2_Docs_Update.md`
- `Findings/Phase2_NextSteps.md`

The intent here is to provide a multi-phase, high-detail roadmap with clear scope, verification, and rollback steps.

## Guiding constraints

- Preserve behavior and visual presentation unless explicitly approved for change.
- Prefer pure moves or localized refactors; avoid sweeping rewrites.
- Use primitives/composites; prevent new one-off UI variants.
- Legacy removal rule applies: if a file has no usage, remove it.

## Phase 3 — “God file” decomposition (high impact, localized refactors)

**Goal:** reduce cognitive load and make UI primitives/composites reuse more obvious.

**Targets (current sizes):**
- `js/src/features/composer/components/PromptComposer.jsx` (~1314 lines)
- `js/src/features/aliases/pages/Aliases.jsx` (~1188 lines)
- `js/src/features/gallery/components/MediaViewerModal.jsx` (~857 lines)
- `js/src/features/workflow/components/DynamicForm.jsx` (~659 lines)
- `js/src/features/workflow/inputs/StringInput.jsx` (~762 lines)

**Approach (per file):**
1. **Extract read-only presentational sections** into local subcomponents (same folder).
2. **Move isolated UI blocks** into `ui/composites/` if reused across features.
3. **Keep state in parent**, pass down callbacks and derived props to reduce cross-dependencies.
4. **Flatten props** and use clear naming (e.g., `onConfirm`, `onCancel`, `isOpen`).
5. **Update tests** for any structural changes (snapshot/test ids).

**Verification:**
- `npm run test:run` in `js/`
- `npm run build` in `js/`
- UI smoke: open Composer, Aliases, Gallery viewer, Workflow form input.

**Rollback:**
- Revert the per-file refactor commits only; no cross-cutting moves in this phase.

## Phase 4 — UI primitive consolidation (remaining variants)

**Goal:** eliminate remaining style variants and enforce design-system primitives.

**Workstream A: Inputs & controls**
- Audit for custom input styles in feature CSS.
- Replace with `.ui-control` or shared `Select`, `Button`, `SegmentedTabs` primitives.
- Move any reusable input layouts into `ui/composites/`.

**Workstream B: Overlays & sheets**
- Verify all modals/sheets use `BottomSheet` primitives or canonical overlay styles.
- Consolidate any sheet-like layouts into shared composites.

**Workstream C: Toasts & notifications**
- Identify remaining toast variants and keep a single canonical path.
- Remove redundant CSS blocks once all call sites are migrated.

**Verification:**
- Run the same tests/build as Phase 3.
- Manual smoke for controls, overlays, notifications.

**Rollback:**
- Revert each component migration commit individually.

## Phase 5 — CSS hygiene and guardrails

**Goal:** ensure styles are discoverable, predictable, and do not leak.

**Tasks:**
- Remove unused selectors based on `rg` checks and call-site audits.
- Enforce feature-prefixed selectors in feature styles.
- Confirm `ui-kit.css` is the sole owner of `ui-*` classes.
- Ensure `styles/index.css` import order still matches dependencies (tokens → base → ui kit → features → utilities).

**Verification:**
- `npm run build` to catch missing selectors.
- Visual smoke on core screens.

**Rollback:**
- Revert CSS cleanup commits in isolation.

## Phase 6 — Ownership/documentation hardening

**Goal:** codify conventions so new contributors don’t reintroduce entropy.

**Tasks:**
- Update `docs/STRUCTURE.md` only if new primitives/composites were added.
- Add or refine examples: “where to put X” + “what not to do.”
- Ensure `AGENTS.md` highlights any new guardrails.

**Verification:**
- Spot-check new placement examples against actual file paths.

## Phase 7 — Optional optimizations (only if requested)

**Potential areas:**
- Extract shared layout patterns (e.g., standard headers) into `ui/layout/`.
- Create a minimal UI checklist for PRs.
- Add lint rules if there is a clear value and no new dependencies are needed.

## Sequencing summary (PR-sized steps)

1. **PR-A**: Split one “god file” (lowest-risk, pick the most isolated).
2. **PR-B**: Split next two “god files” (keep per-feature separation).
3. **PR-C**: Finish remaining splits + any reusable composite extractions.
4. **PR-D**: UI primitive consolidation for remaining control variants.
5. **PR-E**: CSS hygiene cleanup.
6. **PR-F**: Docs + guardrails refresh.

## Open questions (need confirmation)

- Which of the large files should be split first (Composer vs Aliases vs MediaViewer)?
- Are there any UI variants you want to preserve as intentional exceptions?
- Do we want to enforce new naming conventions for feature CSS beyond prefixing?
