Node Expansion Plan for Stable Workflow UX
==========================================

Goals
-----
- Make core parameters (Prompt, Negative Prompt, Width, Height, Seed, etc.) explicit and reliable.
- Reduce heuristic parsing and ambiguous mapping in the UI and re-run logic.
- Preserve compatibility with existing workflows while enabling predictable defaults and validation.

Proposed Core Node Types
------------------------
1) Prompt + Conditioning
   - CozyGenPromptInput
     - text: string (supports multiline)
     - role: "positive"
   - CozyGenNegativePromptInput
     - text: string (supports multiline)
     - role: "negative"

2) Size + Resolution
   - CozyGenWidthInput
     - value: int, min/max/step
     - role: "generation"
   - CozyGenHeightInput
     - value: int, min/max/step
     - role: "generation"
   - Optional: CozyGenAspectRatioInput (if you want ratio-first workflows)

3) Seed + Sampling
   - CozyGenSeedInput
     - value: int
     - allow_random: boolean
   - CozyGenStepsInput
   - CozyGenCfgInput
   - CozyGenSamplerInput
   - CozyGenSchedulerInput
   - Optional: CozyGenClipSkipInput

4) Batch and Output
   - CozyGenBatchSizeInput
   - CozyGenOutputFolderInput (if output routing is a top-level concern)

5) Optional: Model Routing
   - CozyGenCheckpointInput
   - CozyGenLoraInput
   - CozyGenVaeInput

Design Notes
------------
- Each node has a stable, explicit type and a well-defined schema.
- Where needed, include a "role" field to disambiguate (e.g., width/height for generation vs upscaling).
- Use standardized property names (value, text, min, max, step, allow_random) to simplify UI binding.
- Allow multiple nodes of the same type if they serve different roles (e.g., "generation", "preview", "upscale").

Cross-App Changes to Support These Nodes
----------------------------------------
- Workflow schema: formalize the new node types and fields in docs and validators.
- UI control rendering: map node types to specific UI inputs (prompt textarea, size inputs, dropdowns).
- Prompt composer: bind to CozyGenPromptInput + CozyGenNegativePromptInput nodes.
- Re-run options: target CozyGenSeedInput, CozyGenWidthInput, CozyGenHeightInput directly.
- Graph analyzers: replace heuristic detection with explicit type checks.
- Overrides logic: update promptOverrides to read/write these nodes first, then fallback to legacy.
- Metadata display: display prompt and sizing from explicit nodes; fallback to prior parsing.
- Testing: add unit tests for node analysis, overrides, and UI rendering.
- Migration: add migration/fallback logic for old workflows; avoid hard breaks.

Phased Roadmap (Actionable)
---------------------------
Phase 0 - Alignment and Audit (1-2 weeks)
  Deliverables:
  - Inventory of existing workflows and parameter patterns (prompt, size, seed, models).
  - Minimum viable node set for v1 (explicit list with names and roles).
  - Naming and schema conventions (value/text, min/max/step, allow_random, role).
  Owners:
  - Workflow lead, frontend lead, backend lead.
  Exit criteria:
  - Approved node list and schema draft.

Phase 1 - Node Specs and Backend Support (1-2 weeks)
  Deliverables:
  - Formal schema definitions for each node type.
  - Updated graph validators and serialization support.
  - Capabilities registry mapping node type -> feature (seed, size, prompt, model).
  Owners:
  - Backend lead, workflow lead.
  Exit criteria:
  - New node types load/serialize without errors in dev tooling.

Phase 2 - Frontend UI Binding (2-3 weeks)
  Deliverables:
  - Form renderer maps new node types to specific UI components.
  - Prompt composer binds to CozyGenPromptInput and CozyGenNegativePromptInput.
  - Re-run options: compact Size row (width x height) tied to explicit nodes.
  - Mobile layout validation for new fields.
  Owners:
  - Frontend lead, design/UX.
  Exit criteria:
  - New node types render reliably and are editable in UI.

Phase 3 - Overrides, Rerun, and Fallbacks (1-2 weeks)
  Deliverables:
  - promptOverrides reads/writes explicit nodes first, then legacy heuristics.
  - Deterministic resolution rules for multiple nodes of same type (role precedence).
  - Saved rerun payloads include width/height overrides when present.
  Owners:
  - Frontend lead, backend lead.
  Exit criteria:
  - Rerun works with explicit nodes and legacy workflows.

Phase 4 - Migration + Compatibility (2-3 weeks)
  Deliverables:
  - Migration routine to map legacy dynamic inputs to explicit nodes where safe.
  - Feature flag to toggle explicit-first vs legacy-first behavior.
  - Workflow conversion tool (CLI or UI) with dry-run reports.
  Owners:
  - Workflow lead, backend lead.
  Exit criteria:
  - At least one pilot workflow fully migrated with parity validation.

Phase 5 - QA, Regression, and Rollout (2-3 weeks)
  Deliverables:
  - Unit tests for analysis and overrides (seed, size, prompt).
  - Integration tests for prompt composer, rerun options, and new node UI.
  - Regression suite for legacy workflows.
  - Pilot rollout with monitoring and feedback loop.
  Owners:
  - QA lead, frontend lead.
  Exit criteria:
  - Pilot workflows pass regression; no critical UX regressions found.

Phase 6 - General Availability and Deprecation (ongoing)
  Deliverables:
  - Documentation updates for workflow authors.
  - Deprecation timeline and warnings for legacy nodes.
  - Metrics dashboard for field-level errors and rerun success rates.
  Owners:
  - Product lead, engineering leads.
  Exit criteria:
  - New workflows default to explicit nodes; legacy conversion is supported.

Risk Mitigations
----------------
- Keep explicit-first behavior behind a flag until parity is confirmed.
- Maintain fallback heuristics for non-conforming graphs.
- Add analytics to identify workflows missing explicit nodes.

Acceptance Criteria (for v1)
----------------------------
- The UI renders prompts, size, and seed reliably from explicit nodes.
- Re-run options can edit width/height without relying on heuristics.
- Legacy workflows still function without changes.
- Tests cover explicit node behavior and legacy fallback logic.
