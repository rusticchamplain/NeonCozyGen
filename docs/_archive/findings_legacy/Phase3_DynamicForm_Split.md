# Phase 3 — DynamicForm FieldRow Extraction

## Summary

- Extracted LoRA pair rows and standard parameter rows into dedicated components to reduce inline JSX in `DynamicForm`.
- Kept spotlight rendering logic in `DynamicForm` while delegating row rendering to the new components.

## Files touched

- `js/src/features/workflow/components/DynamicForm.jsx`
- `js/src/features/workflow/components/LoraPairFieldRow.jsx`
- `js/src/features/workflow/components/ParamFieldRow.jsx`
