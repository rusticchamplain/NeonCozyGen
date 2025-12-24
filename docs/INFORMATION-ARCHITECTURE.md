# Information Architecture (Contract)

This defines navigation, visibility, and interaction rules for desktop and mobile.

## Global navigation model

Primary routes:
- Controls (`/controls`)
- Compose (`/compose`)
- Gallery (`/gallery`)
- Library (`/library`)
- Studio (`/studio`) is a landing overview, not a primary workflow.

Mobile:
- Bottom navigation is the single navigation surface.
- No hamburger menu. No popover nav.
- Render is a primary action on the relevant screens (Controls/Compose), not hidden.

Desktop:
- Left rail (BottomNav in desktop layout) is the primary navigation.
- TopBar provides brand, user session, and system actions only (no nav links).

## Visibility rules

Always visible:
- Page title
- Primary action for the current task (Render, Save, Apply)
- Navigation surface (bottom nav or left rail)

Progressive disclosure (allowed):
- Advanced filters or settings in a sheet
- Destructive confirmations
- Fullscreen editors replacing the current surface

## Mobile ergonomics

- Primary actions should be reachable within thumb range.
- Action rows are pinned to the bottom when possible.
- Avoid actions in top-right for critical tasks.
- Ensure safe-area spacing for bottom nav and sheets.

## Library model

Library is a unified surface for Tags and Aliases:
- Tags and Aliases are presented as tabs (SegmentedTabs).
- The last selected tab is remembered.
- Deep links (`/tags`, `/aliases`) redirect to Library with the correct tab.

## Gallery model

- View mode and key filters are visible in the header.
- Advanced filters live in a sheet only if they are secondary.

## Prompt editing model

- Prompt edits happen in a full editor surface.
- Quick actions link directly to the editor (no stacked sheets).
