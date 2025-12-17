// js/src/hooks/useWorkflowForm.js
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getChoices, getWorkflow } from '../api';
import {
  loadFormState,
  saveFormState,
  flushFormState,
} from '../utils/storage';

// Map known param names to choice types for dynamic dropdowns
const choiceTypeMapping = {
  clip_name1: 'clip',
  clip_name2: 'clip',
  unet_name: 'unet',
  vae_name: 'vae',
  sampler_name: 'sampler',
  scheduler: 'scheduler',
};

const COZYGEN_INPUT_TYPES = [
  'CozyGenDynamicInput',
  'CozyGenImageInput',
  'CozyGenFloatInput',
  'CozyGenIntInput',
  'CozyGenStringInput',
  'CozyGenChoiceInput',
];

export function useWorkflowForm(selectedWorkflow) {
  const [workflowData, setWorkflowData] = useState(null);
  const [dynamicInputs, setDynamicInputs] = useState([]);

  const [formData, setFormData] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load workflow + inputs whenever the selected workflow changes
  useEffect(() => {
    if (!selectedWorkflow) {
      setWorkflowData(null);
      setDynamicInputs([]);
      setFormData({});
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (typeof performance !== 'undefined' && performance.mark) {
          performance.mark('cozygen:workflow:load');
        }
      } catch {
        // ignore perf marker errors
      }

      try {
        const data = await getWorkflow(selectedWorkflow, { signal: controller.signal });
        if (cancelled) return;

        // Normalize ids & ensure param_name for image nodes
        for (const nodeId in data) {
          const node = data[nodeId];
          if (node.class_type === 'CozyGenImageInput' && !node.inputs.param_name) {
            node.inputs.param_name = 'Image Input';
          }
          data[nodeId].id = nodeId;
        }

        setWorkflowData(data);

        const allInputs = Object.values(data).filter((node) =>
          COZYGEN_INPUT_TYPES.includes(node.class_type)
        );

        // Fetch choices for dynamic dropdown/choice nodes
        const inputsWithChoices = await Promise.all(
          allInputs.map(async (input) => {
            const isDynamicDropdown =
              input.class_type === 'CozyGenDynamicInput' &&
              input.inputs.param_type === 'DROPDOWN';
            const isChoiceNode = input.class_type === 'CozyGenChoiceInput';

            if (isDynamicDropdown || isChoiceNode) {
              const pn = input.inputs.param_name;
              let choiceType =
                input.inputs.choice_type ||
                (input.properties && input.properties.choice_type);

              if (!choiceType && isDynamicDropdown) {
                choiceType = choiceTypeMapping[pn];
              }

              if (choiceType) {
                try {
                  const choicesData = await getChoices(choiceType, { signal: controller.signal });
                  input.inputs.choices = choicesData.choices || [];
                } catch (err) {
                  if (err?.name !== 'AbortError') {
                    console.error(`Choices for ${pn} failed`, err);
                  }
                  input.inputs.choices = [];
                }
              }
            }
            return input;
          })
        );

        if (cancelled) return;

        setDynamicInputs(inputsWithChoices);

        // Restore per-workflow state
        const storedForm = loadFormState(selectedWorkflow);

        const initialForm = {};
        inputsWithChoices.forEach((input) => {
          const pn = input.inputs.param_name;
          if (!pn) return;

          if (storedForm[pn] !== undefined) {
            initialForm[pn] = storedForm[pn];
            return;
          }

          let defv;
          if (
            [
              'CozyGenDynamicInput',
              'CozyGenFloatInput',
              'CozyGenIntInput',
              'CozyGenStringInput',
            ].includes(input.class_type)
          ) {
            defv = input.inputs.default_value;
            if (input.class_type === 'CozyGenIntInput') {
              const n = parseInt(defv, 10);
              defv = Number.isNaN(n) ? 0 : n;
            } else if (input.class_type === 'CozyGenFloatInput') {
              const n = parseFloat(defv);
              defv = Number.isNaN(n) ? 0 : n;
            }
          } else if (input.class_type === 'CozyGenChoiceInput') {
            const choices = input.inputs.choices || [];
            defv = choices.length ? choices[0] : '';
          } else if (input.class_type === 'CozyGenImageInput') {
            defv = '';
          } else {
            defv = '';
          }

          initialForm[pn] = defv;
        });

        setFormData(initialForm);
        try {
          if (typeof performance !== 'undefined' && performance.measure) {
            performance.mark('cozygen:workflow:ready');
            performance.measure(
              `cozygen:workflow:ready:${selectedWorkflow || 'unknown'}`,
              'cozygen:workflow:load',
              'cozygen:workflow:ready'
            );
          }
        } catch {
          // ignore perf marker errors
        }
      } catch (e) {
        if (cancelled) return;
        console.error('Failed to load workflow', e);
        setError(e);
        setWorkflowData(null);
        setDynamicInputs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      // Session-only persistence uses debounced writes; flush on unmount/workflow switch
      // so quick navigation (e.g., Studio -> Gallery -> Studio) doesn't drop dropdown changes.
      flushFormState(selectedWorkflow);
      cancelled = true;
      controller.abort();
    };
  }, [selectedWorkflow]);

  // Derived sets
  const imageInputs = useMemo(
    () =>
      dynamicInputs.filter((i) => i.class_type === 'CozyGenImageInput'),
    [dynamicInputs]
  );
  const primaryImageInput = imageInputs[0] || null;

  // Handlers that also persist to localStorage via utils/storage

  const handleFormChange = useCallback(
    (name, value) => {
      setFormData((prev) => {
        const next = { ...prev, [name]: value };
        if (selectedWorkflow) {
          saveFormState(selectedWorkflow, next);
        }
        return next;
      });
    },
    [selectedWorkflow]
  );

  return {
    // raw workflow
    workflowData,

    // all CozyGen input nodes
    dynamicInputs,

    // image-specific inputs
    imageInputs,
    primaryImageInput,

    // state
    formData,

    // setters (for UI helpers, etc.)
    setFormData,

    // helpers
    handleFormChange,

    // status
    loading,
    error,
  };
}
