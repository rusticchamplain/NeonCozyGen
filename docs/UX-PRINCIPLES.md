# UX Principles (Contract)

These principles are the binding contract for the CozyGen overhaul. If a decision is ambiguous, choose the path that reduces user friction on mobile while preserving full functionality and the visual identity.

## Core principles

1) Fewest clicks possible (mobile principle #1)
- Default to visible, in-context controls over hidden menus.
- A task should not require more than one navigation hop unless it is an advanced or destructive action.
- Example: prompt edits happen in a single full editor surface, not a chain of sheets.

2) Show, don’t tell
- Reveal the next action in the place where the user is already focused.
- Replace “go to settings” with inline toggles or immediate actions.
- Example: gallery view mode and filters are visible in the header, not only in a modal.

3) Avoid nesting
- Do not stack menus/sheets/modals unless unavoidable.
- If a flow requires a second surface, it must be fullscreen or replace the current one.
- Allowed exceptions: destructive confirmations, contextual help, long-form editors.

4) Direct manipulation over indirection
- Prefer taps on items to adjust or replace instead of opening a separate list first.
- Example: tap a prompt element -> adjust or replace in the strength sheet.
- Example: rerun prompt editor defaults to Replace mode; tap an element to choose its replacement directly.

5) One product, one vocabulary
- Labels and concepts are identical across desktop and mobile.
- “Controls”, “Compose”, “Gallery”, “Library”, “Render”, “Aliases”, “Tags” are canonical.

6) Clarity over icon-only
- Icon-only controls are reserved for low-risk, secondary actions.
- Primary actions must include text labels.
- Example: Render/Save/Apply are labeled; icon-only is acceptable for inline delete when confirmation exists.

## Avoid nesting: rules and exceptions

Rules:
- No “menu -> sheet -> modal -> sheet” chains.
- If a sheet is used, it is the only surface on screen for that task.
- Do not hide primary actions behind overflow menus.

Allowed exceptions:
- Confirmations for deletion or irreversible actions.
- Fullscreen editors that replace the current surface (not stack on top).
- Authentication and blocking error states.

## “Show, don’t tell” implementation rules

- Every page exposes its primary action without scrolling.
- Inline toggles or segmented controls replace dropdowns on mobile when <= 5 options.
- Use a single, visible action rail for key tasks (Render, Save, Apply).
- When a task is ongoing (render/queue), surface status inline, not only in logs.

## Examples tied to CozyGen

- Bottom navigation is the primary navigation on mobile; no hamburger menu.
- Library entry is a single tap and shows tags/aliases as tabs (not a popover).
- Prompt edits live in the full editor; the re-run sheet links directly to it.
- Token strength edits open a single sheet with adjust, replace, delete actions.
