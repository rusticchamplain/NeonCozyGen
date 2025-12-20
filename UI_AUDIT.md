# UI Audit - CozyGen (Static Code Review)

## Executive Summary
- Coverage: 7 routes and all reusable UI components in `js/src/components` were reviewed via static code inspection.
- Critical: workflow preset loading fails due to an undefined setter, preventing presets from populating.
- Accessibility: focus trapping is missing on overlays, SegmentedTabs lacks keyboard semantics, and several interactive elements lack labels or keyboard focus.
- Consistency: multiple button and select styles fragment "buttonology" and sizing; typography scales vary across cards and lists.

## Dropdown Deep Dive

### Canonical Spec (Proposed)
- Interaction: single, canonical dropdown with predictable keyboard and screen-reader behavior.
- Variants:
  - `native` for short lists (<=10 options) with low density.
  - `popover` for desktop lists with search, grouping, and long options.
  - `sheet` for mobile with search and touch-first layout.
- Behavior:
  - Opening: click, Enter/Space, or ArrowDown focuses the first selectable item.
  - Navigation: ArrowUp/ArrowDown moves focus, Home/End jump, typeahead search.
  - Selection: Enter selects, Escape closes and restores focus.
  - States: disabled options are skipped in keyboard nav; empty state shows "No matches".
  - Long lists: virtualization or capped height with scroll.
  - Search: optional; shows "No results" when empty.
- Accessibility:
  - `aria-expanded`, `aria-controls`, `role=listbox` and `role=option` for custom menus.
  - Active item uses `aria-activedescendant` or roving `tabIndex`.
  - `aria-label` or `<label>` for every control; `aria-describedby` for helper text.
- Touch targets: min 44x44px.

### Current Variants (Inventory)
| Variant | Locations | Notes |
| --- | --- | --- |
| Native select with `ui-select` | `js/src/components/inputs/DropdownInput.jsx:103` | Two-tier folder filter + options, no search |
| Native select with custom class | `js/src/pages/MainPage.jsx:42` | `controls-context-select`, unique sizing |
| Native select (gallery) | `js/src/pages/Gallery.jsx:404` | `gallery-page-size`, unique styling |
| Native select (filters) | `js/src/pages/Aliases.jsx:858`, `js/src/components/PromptComposer.jsx:786`, `js/src/components/TagLibrarySheet.jsx:322` | Multiple compact variants |
| Popover menu | `js/src/pages/MainPage.jsx:82` | Preset menu uses `role=menu` but lacks keyboard handling |

## Inventory Tables

### Pages and Routes
| Route | File | Major Sections | Primary Components |
| --- | --- | --- | --- |
| `/login` | `js/src/pages/Login.jsx` | Login form, alerts | `ui-button`, `ui-input` |
| `/studio` | `js/src/pages/StudioLanding.jsx` | Hero, info cards | Static layout |
| `/controls` | `js/src/pages/MainPage.jsx` | Workflow selector, parameters, images, status | `WorkflowFormLayout`, `DynamicForm`, `BottomBar`, `RunLogsSheet` |
| `/compose` | `js/src/pages/Composer.jsx` | Composer page | `PromptComposer`, `TokenStrengthSheet` |
| `/gallery` | `js/src/pages/Gallery.jsx` | Filters, grid/feed, viewer | `GalleryItem`, `MediaViewerModal`, `GalleryNav` |
| `/aliases` | `js/src/pages/Aliases.jsx` | Toolbar, list, editor | `BottomSheet`, alias editor UI |
| `/tags` | `js/src/pages/TagLibrary.jsx` | Tag browser | `TagLibrarySheet` |

### Components by Category
| Category | Components |
| --- | --- |
| Navigation | `TopBar`, `BottomNav`, `GalleryNav` |
| Overlays/Sheets | `BottomSheet`, `MediaViewerModal`, `FieldSpotlight`, `RunLogsSheet`, `TokenStrengthSheet`, `TextAreaSheet`, `UrlViewerSheet`, `ImagePickerSheet`, `TagLibrarySheet` |
| Inputs/Forms | `DynamicForm`, `FieldRow`, `StringInput`, `NumberInput`, `BooleanInput`, `DropdownInput`, `LoraPairInput`, `ImageInput`, `PromptComposer` |
| Media/Gallery | `GalleryItem`, `MediaViewerModal`, `GalleryNav` |
| Utilities | `Icons`, `useMediaQuery` |

## Findings (Grouped by Component Family)

### Navigation and Shell

**TopBar** (`js/src/components/TopBar.jsx:159`)
- Expected: drawer closes on outside click or Escape; focus remains within open drawer; menu supports keyboard navigation.
- Actual: toggle-only open/close; no outside click or Escape handling; focus not trapped; `role=menu` without keyboard management.
- States: no explicit loading/disabled states for menu; active link state only.
- Responsiveness: desktop nav vs mobile drawer is wired; mobile uses `role=menu` but lacks menu semantics.
- Design: button styling differs from `ui-button` in other contexts.

**BottomNav** (`js/src/components/BottomNav.jsx:130`)
- Expected: library popover behaves like a menu with keyboard support and Escape dismissal.
- Actual: popover closes on pointer down only; no keyboard handling or `role=menu`.
- States: render action is always clickable; no disabled state while rendering.
- Responsiveness: desktop shows full nav, mobile shows popover.

**GalleryNav** (`js/src/components/GalleryNav.jsx:51`)
- Expected: back/root controls are visible if handlers are provided.
- Actual: `onBack` and `onRoot` are passed in but no UI renders those actions.
- States: no empty state for crumbs; fine for default.

### Overlays and Sheets

**BottomSheet** (`js/src/components/ui/BottomSheet.jsx:32`)
- Expected: focus trap, restore focus on close, Escape behavior (optional), `aria-labelledby` or `aria-label`.
- Actual: Escape is supported, but no focus trap or focus restore.
- States: no loading/empty/error handling; depends on slot content.
- Accessibility: `aria-modal` present; lacks `aria-labelledby` for title.

**MediaViewerModal** (`js/src/components/MediaViewerModal.jsx:45`)
- Expected: focus trap, Escape to close, keyboard navigation (prev/next), focus restore on close.
- Actual: Escape and Arrow navigation work; focus is set to Close on open, but no focus trap or restore.
- States: handles missing metadata by omitting button; no explicit empty/error state.
- Accessibility: dialog uses `aria-modal` and label; no `aria-controls` for metadata toggle.

**FieldSpotlight** (`js/src/components/FieldSpotlight.jsx:24`)
- Expected: modal semantics with Escape close and focus trap.
- Actual: no Escape handler or focus trap; backdrop click closes.

**TextAreaSheet** (`js/src/components/ui/TextAreaSheet.jsx:31`)
- Expected: textarea labeled via `label` or `aria-labelledby`.
- Actual: no label or `aria-label` on textarea.

**RunLogsSheet** (`js/src/components/RunLogsSheet.jsx:1`)
- Expected: copy action provides success feedback; scrollable log list.
- Actual: copy is silent; log list is plain `pre` with line divs.

**TokenStrengthSheet** (`js/src/components/ui/TokenStrengthSheet.jsx:1`)
- Expected: range input with labeled value, plus increment/decrement.
- Actual: range is labeled; buttons are present; no explicit disabled state.

**UrlViewerSheet** (`js/src/components/ui/UrlViewerSheet.jsx:1`)
- Expected: media preview with safe scaling, Open and Close actions.
- Actual: present; no error state if media fails to load.

**ImagePickerSheet** (`js/src/components/ImagePickerSheet.jsx:132`)
- Expected: searchable list with accessible inputs and clear labels.
- Actual: search input lacks `aria-label`; checkbox has label text.

**TagLibrarySheet** (`js/src/components/TagLibrarySheet.jsx:548`)
- Expected: collected tags are keyboard reachable; remove actions have focusable controls.
- Actual: collected tags are clickable `span` elements with no role or tabIndex; remove button is focusable.

### Forms and Inputs

**Workflow Selector Bar** (`js/src/pages/MainPage.jsx:15`)
- Expected: preset loading succeeds; menu closes on outside click/Escape; keyboard menu navigation.
- Actual: preset loading fails due to undefined `setPresetMenuOpen`, leading to empty preset list and error state. `js/src/pages/MainPage.jsx:279`.
- Accessibility: `role=menu` without keyboard navigation; `aria-haspopup` set.

**SegmentedTabs** (`js/src/components/ui/SegmentedTabs.jsx:26`)
- Expected: tabs use roving tabIndex, ArrowLeft/ArrowRight, and `aria-controls`/`aria-labelledby`.
- Actual: static buttons with `role=tab` but no keyboard behavior or tabpanel association.

**DynamicForm / FieldRow** (`js/src/components/DynamicForm.jsx:1`, `js/src/components/ui/FieldRow.jsx:1`)
- Expected: expandable rows with consistent keyboard focus and accessible labels.
- Actual: FieldRow uses button header for collapsible rows; semantics are sound. No issues found in code.

**StringInput** (`js/src/components/inputs/StringInput.jsx:520`)
- Expected: trailing icon button has accessible name; alias tokens keyboard reachable.
- Actual: trailing icon button lacks `aria-label`; alias tokens are focusable and keyboard-operable.

**NumberInput** (`js/src/components/inputs/NumberInput.jsx:1`)
- Expected: number input with min/max hints; keyboard increment works.
- Actual: ArrowUp/ArrowDown handlers are implemented; label via `aria-label`.

**BooleanInput** (`js/src/components/inputs/BooleanInput.jsx:1`)
- Expected: switch semantics with keyboard toggle.
- Actual: uses `role=switch`, handles Enter/Space.

**DropdownInput** (`js/src/components/inputs/DropdownInput.jsx:100`)
- Expected: consistent select design and optional search.
- Actual: two native selects with distinct styling; no search; options are sorted and filtered.

**LoraPairInput** (`js/src/components/inputs/LoraPairInput.jsx:1`)
- Expected: unified selection of paired LoRA plus strength controls.
- Actual: split/linked strengths handled; no keyboard issues found.

**PromptComposer** (`js/src/components/PromptComposer.jsx:680`)
- Expected: token list keyboard-operable (focusable tokens, strength modal) and labeled inputs.
- Actual: token elements are `span` with click/drag only (no role/tabIndex); alias search input lacks `aria-label`.

**ImageInput** (`js/src/components/ImageInput.jsx:47`)
- Expected: dropzone supports drag/drop and keyboard alternatives.
- Actual: drag/drop is supported; keyboard alternatives exist (Choose/Upload). No direct dropzone focus.

### Galleries and Lists

**Gallery Page** (`js/src/pages/Gallery.jsx:339`)
- Expected: toolbar icon buttons have accessible names; clear error state on fetch failure.
- Actual: icon-only buttons use `title` only (no `aria-label`); errors display as empty state because `useGallery` clears items on error.

**GalleryItem** (`js/src/components/GalleryItem.jsx:96`)
- Expected: tiles are focusable and clickable; metadata badge has accessible label.
- Actual: tiles use `<button>`; metadata badge uses `role=img` and `aria-label`.

**Aliases List** (`js/src/pages/Aliases.jsx:906`)
- Expected: loading state distinct from empty state; keyboard list navigation.
- Actual: no explicit loading skeleton; empty and loading can appear similar when rows are empty.

**Tag Library** (`js/src/components/TagLibrarySheet.jsx:307`)
- Expected: infinite list with clear loading and error states; keyboard reachability.
- Actual: loading/error text exists; collected tag chips are not keyboard focusable.

### Feedback and Status

**Controls Status Strip** (`js/src/pages/MainPage.jsx:207`)
- Expected: progress and status reflect run state; disabled Render when busy.
- Actual: progress meter is shown; render button can still be clicked in BottomNav while active.

**Login Alerts** (`js/src/pages/Login.jsx:36`)
- Expected: clear error messages and accessible alerts.
- Actual: error and idle notices render as text blocks; no `role=alert`.

## Standardization Roadmap (PR-Sized)

### Phase 0 - Critical UX Bugs
1. Fix preset loading error (`setPresetMenuOpen` undefined) and verify presets render. `js/src/pages/MainPage.jsx:279`.
2. Add explicit error state for gallery fetch failures instead of empty state. `js/src/hooks/useGallery.js:96`, `js/src/pages/Gallery.jsx:430`.
3. Disable Render action while rendering across all entry points. `js/src/components/BottomNav.jsx:146`.

### Phase 1 - Accessibility Baseline
1. Add focus trap and restore focus for `BottomSheet`, `MediaViewerModal`, and `FieldSpotlight`.
2. Implement SegmentedTabs keyboard semantics and `aria-controls` mapping. `js/src/components/ui/SegmentedTabs.jsx:26`.
3. Add missing labels for icon-only buttons and search inputs.
4. Convert interactive `span` tags to `button` or add `role=button`, `tabIndex=0`, and keyboard handlers.

### Phase 2 - Component Standardization
1. Introduce canonical `Button` with variants (`primary`, `ghost`, `compact`, `icon-only`) and migrate `page-bar-btn`, `controls-context-btn`, `gallery-option-btn`, `media-btn`.
2. Introduce canonical `Select` component with consistent sizing, search, and empty states.
3. Normalize typography scale (small text usage) and spacing tokens across cards and toolbars.

### Phase 3 - Quality and Visual Consistency
1. Add automated UI tests for dropdowns, modals, and gallery states.
2. Consolidate iconography (replace raw glyphs like "..." and "x" with icon components).
3. Review touch targets and hit areas for all icon-only buttons and chip controls.
