# 30 - UI Design System

## Design philosophy (the why)

- Small, canonical UI set. Every screen should be built from the same primitives.
- Consistency beats novelty. Avoid one-off styling or ad-hoc components.
- Fast scanning and compact layout, but never at the cost of touch targets or readability.
- Mobile-first in behavior: sheets, menus, and layouts must remain usable on small screens.

## Canonical UI primitives

These are the only primitives allowed in feature code:

- Button: `js/src/ui/primitives/Button.jsx`
  - Variants: `primary`, `muted`, `ghost`, `danger`.
  - Sizes: `lg`, `md`, `sm`, `xs`, `mini`, `icon`.
- SegmentedTabs: `js/src/ui/primitives/SegmentedTabs.jsx`
  - Use for toggle sets and compact view switching.
- Select: `js/src/ui/primitives/Select.jsx`
  - Native select with optional search input.
- BottomSheet: `js/src/ui/primitives/BottomSheet.jsx`
  - Primary overlay pattern for mobile and dense settings.
- Icons: `js/src/ui/primitives/Icons.jsx`
  - Central icon registry.

Global style primitives (classes in `js/src/styles/ui-kit.css`):

- Surfaces: `.ui-card`, `.ui-panel`.
- Controls: `.ui-control`, `.ui-input`, `.ui-select`.
- Pills and chips: `.ui-pill`, `.ui-chip` (via Button `is-chip`).

Composites (reusable but composed from primitives):

- `TokenStrengthSheet`
- `TextAreaSheet`
- `UrlViewerSheet`
- `FieldRow`

## Usage rules (prevent UI drift)

- Do not create new button styles in feature CSS.
- If a control looks like a button, it must be a `Button`.
- If a UI is a selection set, use `SegmentedTabs`.
- If it is a list of choices, use `Select`.
- Use `.ui-card` or `.ui-panel` for surfaces. Do not reintroduce legacy card classes.
- If a new primitive is truly needed, add it to `js/src/ui/primitives/` and document it here.

## Responsiveness and polish requirements

- No overflow: headings, chips, and labels must truncate or wrap safely.
- Touch targets: icon buttons must be at least 36px square; ensure spacing on mobile.
- Sheets and modals must fit the viewport and allow scrolling of their content.
- Lists with many rows should use virtualization or progressive loading.
- Images must use appropriate `sizes` and `srcSet` to avoid waste on mobile.

## Dropdown and menu spec

The `Select` primitive is a native select with an optional search input.

Rules:
- Search is opt-in: `searchable` or `searchThreshold > 0`.
- Use `searchThreshold` for long lists (example: tags or large model lists).
- Provide clear labels for category and subcategory filters (avoid cryptic values).
- If the list is large, prefer:
  - A category filter first
  - Then search
  - Then a paged or virtualized list
- For long labels, truncate with ellipsis and preserve a full title in `title` attributes.

States:
- Disabled: use the native `disabled` attribute.
- Empty list: use `emptyLabel` to explain why.
- Loading: show a loading row outside the select (do not disable the select without context).

Keyboard + focus:
- Search input should accept typing without stealing focus from the select.
- Always include `aria-label` when the label is not visible.

## Accessibility baseline

- All interactive elements must be keyboard reachable.
- Buttons and icon buttons must include `aria-label` when text is not visible.
- Use `role="dialog"` and `aria-modal` for modal containers.
- Always provide a focusable close action for sheets and modals.

