# Ambiguous Names Normalization Report

This document lists names that are currently overloaded or unclear and should be normalized for clarity. Each item cites evidence from the repo and suggests a clearer naming convention. These are naming-only recommendations; no behavior change implied.

## Candidate Normalizations

| Name | Where (evidence) | Why it is ambiguous | Suggested normalization |
| --- | --- | --- | --- |
| `type` | Gallery items and view URLs (`js/src/features/gallery/components/GalleryItem.jsx:145-155`), thumbnail endpoint (`api.py:1544-1549`), choices endpoint (`api.py:1073-1078`) | `type` represents different domains: media type (image/video), source area (input/output), and model choice type. | Use distinct names per domain, e.g. `media_type`, `source_type`, `choice_type`. |
| `kind` | Gallery filter and API param (`js/src/features/gallery/hooks/useGallery.js:157-170`, `api.py:765-771`) | `kind` overlaps with `type` semantics and is only used for media filtering. | Rename to `media_kind` or `media_filter`. |
| `subfolder` | Gallery and prompt endpoints (`api.py:767-826`), thumb endpoint (`api.py:1546-1549`), client media URLs (`js/src/features/gallery/components/GalleryItem.jsx:150-154`) | `subfolder` refers to different roots (output dir vs thumb base vs view base). | Use `output_subdir` or `relative_output_dir` where rooted in outputs. |
| `path` | Gallery path state (`js/src/features/gallery/hooks/useGallery.js:182-203`), server path calculation (`api.py:779-781`) | `path` alternates between relative subfolder and absolute filesystem path in different layers. | Use `relative_path` in client and `abs_path` on server. |
| `items` | Gallery lists, tag lists, and other payloads (`js/src/features/gallery/hooks/useGallery.js:31-175`, `api.py:807-812`) | Generic list name makes it unclear what the items represent without reading context. | Use domain-specific list names, e.g. `gallery_items`, `tag_items`, `dir_items`. |
| `data` | Workflow fetch result in client (`js/src/features/workflow/hooks/useWorkflowForm.js:62-78`), multiple server payloads (`api.py:807-812`) | `data` is a catch-all name for different payload types, hiding intent. | Rename to `workflow_graph`, `gallery_payload`, `tags_payload` as appropriate. |
| `node` | Workflow graph traversal (`js/src/features/workflow/hooks/useWorkflowForm.js:67-73`, `js/src/features/workflow/utils/workflowGraph.js:29-44`) | `node` can mean graph node, DOM node, or list item in other contexts. | Use `graph_node` or `workflow_node` in workflow-specific code paths. |
| `param_name` / `paramName` | Workflow inputs (`js/src/features/workflow/hooks/useExecutionQueue.js:420-434`, `js/src/features/workflow/hooks/useWorkflowForm.js:66-90`) | Mixed casing and ambiguous whether this is a UI label or workflow key. | Normalize to `param_key` (id) vs `param_label` (display). |
| `workflowData` | Context and queueing logic (`js/src/features/workflow/hooks/useExecutionQueue.js:369-401`, `js/src/features/studio/contexts/StudioContext.jsx:31-201`) | `workflowData` can mean raw graph, derived schema, or a UI state. | Rename to `workflow_graph` for raw graph and `workflow_schema` for UI inputs. |

## Notes
- I did not modify code. This is a naming normalization guide only.
- If you want, I can turn any subset into concrete refactors scoped to CozyGen (no ComfyUI changes).
