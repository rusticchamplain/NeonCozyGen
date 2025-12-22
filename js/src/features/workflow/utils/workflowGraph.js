// js/src/utils/workflowGraph.js

/**
 * Deep clone of the workflow graph.
 * The graph is assumed to be a plain JSON structure (no functions, Dates, etc).
 */
export function cloneWorkflow(workflow) {
  if (!workflow) return {};
  return JSON.parse(JSON.stringify(workflow));
}

/**
 * Injects form values into workflow input nodes.
 *
 * - workflow: object keyed by nodeId -> node
 * - dynamicInputs: array of nodes (CozyGen* input nodes)
 * - formData: { [param_name]: any }
 *
 * Returns:
 *   { workflow: updatedWorkflow, formData: updatedFormData }
 */
export function injectFormValues(workflow, dynamicInputs, formData) {
  const finalWorkflow = cloneWorkflow(workflow);
  const updatedForm = { ...(formData || {}) };
  if (!dynamicInputs || !Array.isArray(dynamicInputs)) {
    return { workflow: finalWorkflow, formData: updatedForm };
  }

  for (const dn of dynamicInputs) {
    if (!dn || !dn.id || !dn.inputs) continue;
    if (!finalWorkflow[dn.id]) continue;

    const pn = dn.inputs.param_name;
    if (!pn) continue;

    // Image inputs are handled elsewhere (ImageInput component)
    if (dn.class_type === 'CozyGenImageInput') continue;

    let v = updatedForm[pn];

    const nodeToUpdate = finalWorkflow[dn.id];
    if (!nodeToUpdate || !nodeToUpdate.inputs) continue;

    const cls = dn.class_type;

    // Determine fallback defaults per type
    if (v === undefined) {
      if (cls === 'CozyGenChoiceInput') {
        v =
          dn.inputs.value ??
          dn.inputs.default_choice ??
          (dn.inputs.choices && dn.inputs.choices[0]) ??
          '';
      } else {
        v = dn.inputs.default_value;
      }
    }

    if (v === undefined) v = '';
    updatedForm[pn] = v;

    if (
      cls === 'CozyGenFloatInput' ||
      cls === 'CozyGenIntInput' ||
      cls === 'CozyGenStringInput' ||
      cls === 'CozyGenDynamicInput'
    ) {
      nodeToUpdate.inputs.default_value = v;
    } else if (cls === 'CozyGenChoiceInput') {
      nodeToUpdate.inputs.value = v;
    }
  }

  return { workflow: finalWorkflow, formData: updatedForm };
}
