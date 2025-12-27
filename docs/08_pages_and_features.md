# Pages and Features (Current State)

## Login (`/login`)
- **What users can do:** Enter username/password and submit to log in; see idle-timeout notice; see error messages for invalid login. (`js/src/features/auth/pages/Login.jsx`:13-109)
- **UI components:** `Button`, `LogoMark`. (`js/src/features/auth/pages/Login.jsx`:4-5, 56-109)
- **Events/actions:** `handleSubmit` calls `login` from `useAuth`; redirects to last route or `/studio` on success. (`js/src/features/auth/pages/Login.jsx`:37-44)
- **Backend calls:** `login` uses `/cozygen/api/login`. (`js/src/features/auth/hooks/useAuth.jsx`:38-50; `js/src/services/api.js`:212-214)
- **Failure modes:** Sets error text for invalid credentials or generic failures. (`js/src/features/auth/pages/Login.jsx`:45-49)

## Studio Landing (`/studio`)
- **What users can do:** View a static landing section describing CozyGen Studio. No interactive controls in this component. (`js/src/features/studio/pages/StudioLanding.jsx`:1-55)
- **UI components:** Layout uses `ui-card` and decorative elements. (`js/src/features/studio/pages/StudioLanding.jsx`:5-52)

## Workflow Controls (`/controls`)
- **What users can do:** Select a workflow, edit parameters, manage image inputs, apply presets, open composer, and queue a render. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:17-220)
- **UI components:** `WorkflowSelectorSection`, `WorkflowFormLayout`, `ImageInput`, `BottomBar`, `RunLogsSheet`, `FieldSpotlight`. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:4-10)
- **Events/actions:**
  - Workflow selection saves current form state and resets preset state. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:65-74)
  - Preset selection applies saved values into the current form and persists them. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:84-105)
  - Preset save creates/updates presets via API. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:186-219)
  - Render action uses `handleGenerate` from context. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:19-38, 134-136)
- **Backend calls:** Presets use `/cozygen/api/workflow_presets`. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:15-16, 164-217; `js/src/services/api.js`:197-209)
- **Data storage:** Per-workflow form state is stored in session storage. (`js/src/features/workflow/utils/storage.js`:171-203)
- **Failure modes:** Preset load/save shows status text when API fails. (`js/src/features/workflow/pages/WorkflowControlsPage.jsx`:175-179, 218-219)

## Composer (`/compose`)
- **What users can do:** Edit prompt text for a selected field, insert aliases/tags, and trigger a render. (`js/src/features/composer/pages/Composer.jsx`:6-55; `js/src/features/composer/components/PromptComposer.jsx`:740-840)
- **UI components:** `PromptComposer` in page mode. (`js/src/features/composer/pages/Composer.jsx`:45-54)
- **Events/actions:**
  - The composer field is chosen from the URL `field` query param or the detected prompt field. (`js/src/features/composer/pages/Composer.jsx`:21-23)
  - The composer listens for `cozygen:request-render` to trigger `handleGenerate`. (`js/src/features/composer/pages/Composer.jsx`:35-42)
- **Backend calls:** Render queue occurs via `useExecutionQueue` and `/prompt`. (`js/src/features/workflow/hooks/useExecutionQueue.js`:392-507; `js/src/services/api.js`:61-69)

## Gallery (`/gallery`)
- **What users can do:** Browse output folders, filter media, open a media viewer, delete items, and refresh the gallery cache. (`js/src/features/gallery/pages/Gallery.jsx`:154-200, 230-350)
- **UI components:** `GalleryNav`, `GalleryItem`, `MediaViewerModal`, filter controls. (`js/src/features/gallery/pages/Gallery.jsx`:3-12)
- **Events/actions:**
  - `useGallery` fetches items via `/cozygen/api/gallery` and maintains paging, filters, and path state. (`js/src/features/gallery/hooks/useGallery.js`:55-129)
  - The media viewer loads prompt metadata via `/cozygen/api/gallery/prompt`. (`js/src/features/gallery/components/MediaViewerModal.jsx`:623-672)
  - Delete actions call `/cozygen/api/gallery/delete` and `/cozygen/api/gallery/delete_all`. (`js/src/features/gallery/pages/Gallery.jsx`:12-13; `js/src/services/api.js`:136-149)
  - Clear cache calls `/cozygen/api/clear_cache`. (`js/src/features/gallery/pages/Gallery.jsx`:12-13; `js/src/services/api.js`:223-224)
- **Data storage:** Gallery preferences are stored in local storage (view mode, autoplay, path, page size). (`js/src/features/gallery/pages/Gallery.jsx`:26-200; `js/src/features/gallery/hooks/useGallery.js`:30-43, 122-124)
- **Failure modes:** Gallery load errors show “Unable to load gallery right now.” (`js/src/features/gallery/hooks/useGallery.js`:101-108)

## Media Viewer Prompt Tweaks (Gallery feature)
- **What users can do:** View prompt metadata for a media item, edit prompt elements, and save raw prompt overrides. (`js/src/features/gallery/components/MediaViewerModal.jsx`:623-700, 1556-1681)
- **UI components:** `MediaViewerModal` with prompt editor panel and token editing. (`js/src/features/gallery/components/MediaViewerModal.jsx`:2010-2090)
- **Events/actions:**
  - Loads prompt graph from `/cozygen/api/gallery/prompt`. (`js/src/features/gallery/components/MediaViewerModal.jsx`:623-672)
  - Stores raw prompt data using `/cozygen/api/prompt_raw` and saves last render payload locally. (`js/src/features/gallery/components/MediaViewerModal.jsx`:1556-1582; `js/src/features/workflow/utils/globalRender.js`:1-66)

## Library (`/library`, `/aliases`, `/tags`)
- **What users can do:** Switch between aliases and tags in a single library UI. (`js/src/features/library/pages/Library.jsx`:21-83)
- **UI components:** `SegmentedTabs`, `Aliases`, `TagLibrary`. (`js/src/features/library/pages/Library.jsx`:3-83)

### Aliases
- **What users can do:** Create/edit aliases, manage categories, validate tags, and save. (`js/src/features/aliases/pages/Aliases.jsx`:37-199)
- **UI components:** `AliasRow`, `TopicTabs`, `Select`, `BottomSheet`. (`js/src/features/aliases/pages/Aliases.jsx`:6-20)
- **Events/actions:**
  - Saves via `persistAliases` to `/cozygen/api/aliases`. (`js/src/features/aliases/pages/Aliases.jsx`:192-195; `js/src/features/aliases/hooks/usePromptAliases.js`:135-168)
  - Validates tags against `/cozygen/api/tags/validate` before saving. (`js/src/features/aliases/pages/Aliases.jsx`:140-189; `js/src/services/api.js`:183-185)
- **Failure modes:** Tag validation failures block saving with status text; save errors show “Unable to save right now.” (`js/src/features/aliases/pages/Aliases.jsx`:182-199)

### Tag Library
- **What users can do:** Search and browse tag categories, collect tags, and copy collected tags. (`js/src/features/tags/components/TagLibrarySheet.jsx`:320-470)
- **Backend calls:**
  - `getDanbooruTagCategories` to `/cozygen/api/tags/categories`. (`js/src/features/tags/components/TagLibrarySheet.jsx`:446-448; `js/src/services/api.js`:161-163)
  - `searchDanbooruTags` to `/cozygen/api/tags/search`. (`js/src/features/tags/components/TagLibrarySheet.jsx`:349-355; `js/src/services/api.js`:165-181)
- **Failure modes:** Tag search errors set “Unable to load tags right now.” and load-more errors set “Unable to load more tags.” (`js/src/features/tags/components/TagLibrarySheet.jsx`:363-428)
