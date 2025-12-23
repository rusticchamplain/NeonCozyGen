# UI Standards

This document defines the canonical UI primitives and usage rules. The goal is to prevent drift by making the default path the consistent path.

## Canonical primitives

- `Button` (`js/src/ui/primitives/Button.jsx`)
  - **Variants:** `primary`, `muted`, `ghost`, `danger`, `chip`, `bare`.
  - **Sizes:** `mini`, `xs`, `sm`, `md` (default), `lg`, `icon`.
  - **Rules:** Use `Button` instead of `className="ui-button"`; use `size="icon"` or `iconOnly` for icon-only actions; always include an `aria-label` for icon-only buttons.

- `Select` (`js/src/ui/primitives/Select.jsx`)
  - Canonical dropdown for all selection controls.
- Uses `.ui-control` + `.ui-select` styling.
  - Use `wrapperClassName` for layout/spacing so searchable selects keep the same footprint.

- `SegmentedTabs` (`js/src/ui/primitives/SegmentedTabs.jsx`)
  - Canonical segmented control.

- `BottomSheet` (`js/src/ui/primitives/BottomSheet.jsx`)
  - Canonical sheet/modal surface.
  - Use `variant="sheet"` for short action lists and `variant="fullscreen"` for long content.

- `FieldRow` (`js/src/ui/composites/FieldRow.jsx`)
  - Canonical labeled form row with optional collapse/preview.

- **Surfaces**
  - `.ui-card` for standard cards.
  - `.ui-panel` for large centered panels.

- **Chips**
  - `.ui-chip` for static chips.
  - `Button` with `variant="chip"` for interactive chips.

## Dropdown / menu standard

**Labeling**
- Provide a visible label whenever possible.
- If no visible label, set `aria-label` on the `Select`.

**Grouping**
- Use `<optgroup>` via the `children` prop if you must group options.

**Long lists**
- Search is opt-in: set `searchable` or a non-zero `searchThreshold` when a list truly benefits.

**Empty / loading / disabled**
- Use `emptyLabel` for empty lists (e.g., `"No matches"`).
- Use `disabled` for read-only states and show a contextual hint.

**Truncation**
- Favor short labels (`formatFileBaseName`) and add `title` for full values when needed.

**Keyboard & focus**
- Native select handles keyboard selection.
- Search input uses `aria-label="Search options"` by default; override when context-specific.

**Viewport safety**
- For long, dense action lists on mobile, prefer a `BottomSheet` with `sheet-section` groups.

## Form controls

- Use `.ui-control` for all input-like elements (`input`, `textarea`, `select`).
- Use `.ui-input` and `.ui-textarea` for text fields.
- Use `.ui-select-stack` for searchable selects (applied automatically).

## Guardrails

- Do not create new UI primitives inside feature folders.
- If a new variant is required, add it to the primitive and document it here.
- Remove unused or duplicated UI styles rather than creating new one-offs.
