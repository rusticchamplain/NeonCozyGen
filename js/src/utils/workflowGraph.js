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
 * Apply bypass rules to the workflow graph.
 *
 * - workflow: object keyed by nodeId -> node
 * - dynamicInputs: array of nodes (CozyGen* input nodes)
 * - bypassedState: { [param_name]: boolean }
 *
 * Returns a NEW workflow object with:
 *  - bypassed target nodes rewired
 *  - bypassed nodes removed
 */
export function applyBypasses(workflow, dynamicInputs, bypassedState) {
  const finalWorkflow = cloneWorkflow(workflow);
  if (!dynamicInputs || !Array.isArray(dynamicInputs)) return finalWorkflow;

  const BYPASSABLE = ['CozyGenDynamicInput', 'CozyGenChoiceInput'];

  const bypassedNodes = dynamicInputs.filter((dn) => {
    const paramName = dn?.inputs?.param_name;
    return (
      paramName &&
      bypassedState?.[paramName] &&
      BYPASSABLE.includes(dn.class_type)
    );
  });

  for (const bypassedNode of bypassedNodes) {
    if (!bypassedNode || !bypassedNode.inputs) continue;

    const targetNodeId = bypassedNode.inputs.target_node_id;
    if (!targetNodeId || !finalWorkflow[targetNodeId]) continue;

    const targetNode = finalWorkflow[targetNodeId];

    // Collect upstream connections from the target node
    const upstream = {};
    for (const inputName in targetNode.inputs) {
      const val = targetNode.inputs[inputName];
      if (Array.isArray(val)) {
        upstream[inputName] = val;
      }
    }
    if (!Object.keys(upstream).length) continue;

    // Find all downstream nodes that take output from targetNodeId
    const downstream = [];
    for (const nodeId in finalWorkflow) {
      const node = finalWorkflow[nodeId];
      if (!node || !node.inputs) continue;

      for (const inputName in node.inputs) {
        const val = node.inputs[inputName];
        if (Array.isArray(val) && val[0] === targetNodeId) {
          downstream.push({ nodeId, inputName });
        }
      }
    }

    // Rewire downstream nodes to the same upstream sources
    for (const conn of downstream) {
      const src = upstream[conn.inputName];
      if (src) {
        finalWorkflow[conn.nodeId].inputs[conn.inputName] = src;
      }
    }

    // Remove the bypassed target node and the bypass controller node
    delete finalWorkflow[targetNodeId];
    if (bypassedNode.id) {
      delete finalWorkflow[bypassedNode.id];
    }
  }

  return finalWorkflow;
}

/**
 * Injects form values into workflow input nodes and applies randomization.
 *
 * - workflow: object keyed by nodeId -> node
 * - dynamicInputs: array of nodes (CozyGen* input nodes)
 * - formData: { [param_name]: any }
 * - randomizeState: { [param_name]: boolean }
 *
 * Returns:
 *   { workflow: updatedWorkflow, formData: updatedFormData }
 */
export function injectFormValues(
  workflow,
  dynamicInputs,
  formData,
  randomizeState
) {
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

    const shouldRandomize = !!randomizeState?.[pn];
    if (shouldRandomize) {
      const min =
        typeof dn.inputs.min_value === 'number' ? dn.inputs.min_value : 0;
      const max =
        typeof dn.inputs.max_value === 'number' ? dn.inputs.max_value : 1;

      const type = String(dn.inputs.param_type || '').toUpperCase();

      if (type === 'FLOAT') {
        const range = max - min;
        v = min + Math.random() * range;
      } else {
        // INT or anything else treated as integer
        const low = Math.ceil(min);
        const high = Math.floor(max);
        const span = Math.max(high - low, 0);
        const rand = Math.floor(Math.random() * (span + 1));
        v = low + rand;
      }
    }

    // If value was never set and randomization didn't assign one, fall back to default_value
    if (v === undefined) {
      v = dn.inputs.default_value;
    }

    updatedForm[pn] = v;

    const nodeToUpdate = finalWorkflow[dn.id];
    if (!nodeToUpdate || !nodeToUpdate.inputs) continue;

    const cls = dn.class_type;
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
