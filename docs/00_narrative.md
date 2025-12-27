# CozyGen Narrative (As-Built)

This document describes the current application as it exists in the repository today. It is an as-built description and not a roadmap. Anything I could not verify directly in the repository is explicitly marked as unconfirmed.

## What the application does today
CozyGen provides a dedicated user interface for assembling and running image-generation workflows, writing and refining prompts, and reviewing output media. It presents a studio landing page, a workflow controls page, a prompt composer, a gallery, and a unified library for aliases and tags. The interface is meant to keep prompt work, workflow controls, and outputs in one place, so a user can select a workflow, adjust parameters, author prompts, and then review results from prior runs.

From the UI text and route structure, the intended experience is a “studio” where a user can pick a workflow, tune inputs, compose prompts with aliases and tags, and then view and manage generated results in the gallery. The application includes a login screen when authentication is enabled on the backend, and it shows a warning if the server still uses default credentials.

## Who uses it (as confirmed)
The repository does not contain a user role model or explicit user types. I cannot confirm specific user personas or organizational roles. The interface copy refers to “people who sketch with words” and a “studio,” but that is a description of the interface tone rather than a verified user profile. (Unconfirmed beyond UI copy.)

## Main user-visible workflows
1) **Open the studio and select a workflow.** Users land on the studio page and can navigate to the controls page. The controls page displays the available workflows and renders inputs defined by the selected workflow. The UI includes sections for workflow selection, parameter editing, and image inputs.

2) **Compose prompts with aliases and tags.** The composer page opens a full-screen prompt editor for the selected prompt field. It supports inserting aliases, collecting tags, and editing prompt elements, including weighted tokens. The library page provides access to aliases and tags, and the tag library supports browsing and collecting tags.

3) **Generate outputs.** When the user runs a workflow from the controls view (or triggers a render from the composer), the application queues the request to the backend and tracks status. The UI shows queueing and progress states and logs.

4) **Review outputs in the gallery.** The gallery view loads output files from the output directory, provides folder navigation, and shows metadata when available. Users can open a media viewer to inspect an item, navigate between items, and perform actions like delete. The gallery includes a stream mechanism to refresh when new files appear.

## How the system works end-to-end (conceptual)
At a high level, the user selects a workflow that defines a set of inputs. The UI loads these inputs and renders controls for them, including prompt text fields and image inputs. As the user edits fields, the form state is kept in session storage so navigation around the app does not lose entries. When the user initiates a generation, the UI expands any aliases in prompt-like fields, builds the final workflow payload, and submits it to the backend queue. The backend stores optional “raw prompt” values alongside a prompt id so the gallery can later show the original alias-based prompt for a generated image.

When outputs are created, the gallery reads from the output folder and displays images and videos. For PNG files, the server reads embedded prompt metadata when present and returns it to the client. The gallery and media viewer use this metadata to show prompt information and allow the user to tweak or re-run prompts with the editor.

Aliases and tags are a major part of the authoring flow. Alias definitions are stored in a JSON file. The UI can validate tags against a reference tag list and help the user identify invalid tags. The tag library reads from a static tag list and provides searchable lists with counts and categories.

## Dependencies and runtime prerequisites (non-technical description)
This application is integrated with the ComfyUI server runtime. It registers routes and serves the UI through that server, which implies that the application runs inside a ComfyUI environment. The frontend is a separate build that must exist on disk for the UI to load. The backend reads and writes several local data files for aliases, presets, and prompt metadata. I cannot confirm any external services or cloud dependencies; there is no evidence of external network integrations in the repository.

## Evidence (repo references)
- App routes and pages: `js/src/app/App.jsx`:95-118
- Studio landing copy and framing: `js/src/features/studio/pages/StudioLanding.jsx`:12-49
- Composer page and prompt flow wiring: `js/src/features/composer/pages/Composer.jsx`:6-54
- Controls page and workflow orchestration: `js/src/features/workflow/pages/WorkflowControlsPage.jsx`:17-220
- Gallery list and viewer wiring: `js/src/features/gallery/pages/Gallery.jsx`:1-200
- Backend UI serving and route registration: `__init__.py`:28-63
- Workflow submission and alias expansion: `js/src/features/workflow/hooks/useExecutionQueue.js`:392-507
- Prompt metadata extraction: `api.py`:571-591
- Alias storage and validation hooks: `js/src/features/aliases/pages/Aliases.jsx`:37-199
- Tag search and validation endpoints: `api.py`:1153-1279
