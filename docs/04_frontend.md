# Frontend (Current State)

## Entry and Bootstrapping
- React mounts `App` at `#root` in `js/src/app/main.jsx`. (`js/src/app/main.jsx`:1-9)
- App uses `HashRouter` and `AuthProvider` wrappers. (`js/src/app/App.jsx`:127-134)

## Routing and Layout
- Routes include `/login`, `/studio`, `/controls`, `/compose`, `/gallery`, `/library`, `/aliases` (redirect), `/tags` (redirect). (`js/src/app/App.jsx`:95-118)
- `TopBar` and `BottomNav` are rendered on non-login routes. (`js/src/app/App.jsx`:81-122)
- Protected routes require auth via `RequireAuth`, which redirects to `/login` when unauthenticated. (`js/src/app/App.jsx`:31-51, 98-105)

## Authentication State
- Frontend auth state is held in `useAuth`, which calls `/cozygen/api/auth_status` and stores the token in `localStorage`. (`js/src/features/auth/hooks/useAuth.jsx`:13-56; `js/src/features/auth/utils/auth.js`:1-33)
- Idle timeout logs the user out after 30 minutes of inactivity. (`js/src/features/auth/hooks/useAuth.jsx`:68-101; `js/src/features/auth/hooks/useAuthConstants.js`:1-2)
- `Login` posts credentials to `/cozygen/api/login` through `useAuth`. (`js/src/features/auth/pages/Login.jsx`:37-52; `js/src/features/auth/hooks/useAuth.jsx`:38-50)

## Studio Context and Data Sources
- `StudioContext` aggregates workflows, form data, alias catalog, and execution status for pages. (`js/src/features/studio/contexts/StudioContext.jsx`:1-215)
- Workflow list and selection are managed by `useWorkflows`. (`js/src/features/workflow/hooks/useWorkflows.js`:14-99)
- Workflow JSON and dynamic inputs are loaded by `useWorkflowForm`, which also restores session-stored form data. (`js/src/features/workflow/hooks/useWorkflowForm.js`:30-185)
- Alias data is loaded by `usePromptAliases` and converted into a lookup for prompt expansion. (`js/src/features/aliases/hooks/usePromptAliases.js`:68-177)

## Prompt Composition
- `ComposerPage` uses `PromptComposer` to edit the currently selected prompt field. (`js/src/features/composer/pages/Composer.jsx`:6-55)
- `PromptComposer` parses prompt elements, manages alias/tag insertion, and updates the prompt value. (`js/src/features/composer/components/PromptComposer.jsx`:338-840)
- Token weight parsing and updates use utilities in `js/src/utils/tokenWeights.js`. (`js/src/utils/tokenWeights.js`:1-244)
- Alias expansion logic is implemented in `js/src/utils/promptAliases.js`. (`js/src/utils/promptAliases.js`:35-137)

## Workflow Execution
- `useExecutionQueue` expands aliases, injects form data into the workflow graph, stores raw prompt metadata, and queues the request to `/prompt`. (`js/src/features/workflow/hooks/useExecutionQueue.js`:392-507)
- Form state is persisted in session storage with debounced writes. (`js/src/features/workflow/utils/storage.js`:49-207)

## Gallery
- `Gallery` uses `useGallery` to load items via `/cozygen/api/gallery` and manage filters. (`js/src/features/gallery/pages/Gallery.jsx`:154-200; `js/src/features/gallery/hooks/useGallery.js`:55-129)
- Media viewer uses prompt metadata from `/cozygen/api/gallery/prompt` and allows prompt editing actions. (`js/src/features/gallery/components/MediaViewerModal.jsx`:2010-2088; `js/src/services/api.js`:109-128)

## Library (Aliases and Tags)
- `Library` is a unified page that toggles between `Aliases` and `TagLibrary`. (`js/src/features/library/pages/Library.jsx`:21-83)
- `Aliases` loads and persists aliases via `/cozygen/api/aliases` and validates tags using `/cozygen/api/tags/validate`. (`js/src/features/aliases/pages/Aliases.jsx`:37-199; `js/src/services/api.js`:152-185)
- `TagLibrary` is backed by `TagLibrarySheet`, which fetches tag categories and search results. (`js/src/features/tags/pages/TagLibrary.jsx`:1-53; `js/src/features/tags/components/TagLibrarySheet.jsx`:336-456)
