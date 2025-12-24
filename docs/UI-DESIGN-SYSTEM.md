# UI Design System (Contract)

This document defines the canonical UI primitives and their usage rules. Feature code must compose these primitives; do not invent one-off styles.

## Canonical primitives

Primitives (components):
- Button: `js/src/ui/primitives/Button.jsx`
- SegmentedTabs: `js/src/ui/primitives/SegmentedTabs.jsx`
- Select: `js/src/ui/primitives/Select.jsx`
- BottomSheet: `js/src/ui/primitives/BottomSheet.jsx`
- Icons: `js/src/ui/primitives/Icons.jsx`

Surfaces (CSS classes in `js/src/styles/ui-kit.css`):
- `.ui-card` (standard surface)
- `.ui-panel` (large centered surface)
- `.ui-control`, `.ui-input`, `.ui-select` (form controls)

Composites (reusable, composed from primitives):
- `FieldRow`
- `TokenStrengthSheet`
- `TextAreaSheet`
- `UrlViewerSheet`

## Button variants and sizes

Variants: `primary`, `muted`, `ghost`, `danger`  
Sizes: `lg`, `md`, `sm`, `xs`, `mini`, `icon`

Rules:
- Use `icon` size for icon-only actions.
- Avoid `mini` on mobile unless the action is low-risk and adjacent to a larger target.
- Primary actions use `primary`, destructive actions use `danger`.
- Icon-only buttons require `aria-label` and must not replace labeled primary actions.

## Dropdown/menu policy

Default to inline controls. Use dropdowns only when strictly necessary.

Use SegmentedTabs or button groups when:
- The option set is <= 5 choices, and
- The choice affects the current view or output.

Use Select when:
- The option set is long (> 7), or
- The choice is metadata or infrequent.

Mobile-specific:
- Prefer inline segmented controls or button rows.
- Avoid nested menus or popovers.
- If a Select is required, keep it near its effect (no hidden “settings” panels).

## Overlays and sheets

BottomSheet is the only overlay pattern.
- “Sheet” for compact settings.
- “Fullscreen” for editors and complex tasks.
- No stacked sheets or modal chains.

All overlays must:
- Fit the viewport and scroll internally.
- Provide a focusable close action.
- Restore focus to the triggering control.

## Layout and density

Typography and spacing:
- Minimum touch targets: 44x44 (36x36 only for low-risk icons).
- Use existing `page-bar` and `dock` patterns for headers and primary actions.

Do not:
- Create new card styles in feature CSS.
- Style ad-hoc icon-only buttons in feature code.
- Introduce new navigation surfaces without updating `docs/INFORMATION-ARCHITECTURE.md`.
