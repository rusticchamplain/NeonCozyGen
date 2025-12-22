# Phase 2 — Next Major Steps (Assessment)

## Evidence

- Large files remain: `PromptComposer.jsx` (1314 lines), `Aliases.jsx` (1188), `MediaViewerModal.jsx` (857),
  `DynamicForm.jsx` (659), `StringInput.jsx` (762).
- UI unification and card/surface consolidation already completed per prior Phase 2 findings.

## Recommended next steps (major)

1) **Split “god files” into focused subcomponents (PR6)**  
   - Extract logical panels/sections with local state kept in the parent.  
   - Benefits: clearer ownership, faster onboarding, less accidental cross-change.

2) **Finish UI primitive consolidation**  
   - Audit remaining feature-level control variants (inputs, sheets, toasts, tabs).  
   - Replace with primitives/composites; deprecate leftover one-off CSS blocks.

3) **CSS sanity cleanup pass**  
   - Remove unused selectors and enforce feature-prefixed styles.  
   - Verify `ui-kit.css` remains the single owner of `ui-*` classes.

4) **Verification and stabilization**  
   - Run `npm run test:run` and `npm run build` in `js/`.  
   - Validate a quick UI smoke pass for pages touched by splits.

5) **Final cleanup and documentation check**  
   - Remove newly-identified legacy files (unused).  
   - Update `docs/STRUCTURE.md` if new primitives/composites are introduced.
