import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import DynamicForm from '../DynamicForm';
import ParameterMiniMap from '../workflow/panels/ParameterMiniMap';

function normalizeInputs(inputs) {
  return (inputs || []).map((input) => {
    if (
      [
        'CozyGenFloatInput',
        'CozyGenIntInput',
        'CozyGenStringInput',
        'CozyGenChoiceInput',
      ].includes(input.class_type)
    ) {
      let param_type = input.class_type
        .replace('CozyGen', '')
        .replace('Input', '')
        .toUpperCase();
      if (param_type === 'CHOICE') param_type = 'DROPDOWN';
      return {
        ...input,
        inputs: {
          ...input.inputs,
          param_type,
          Multiline: input.inputs?.display_multiline || false,
        },
      };
    }
    return input;
  });
}

export default function WizardParameterStep({
  dynamicInputs,
  formData,
  onFormChange,
}) {
  const [miniMapItems, setMiniMapItems] = useState([]);
  const [activeParamId, setActiveParamId] = useState(null);
  const formWrapperRef = useRef(null);
  const observedNodesRef = useRef([]);
  const activeParamRef = useRef(null);

  const allInputs = useMemo(
    () =>
      normalizeInputs(
        (dynamicInputs || []).filter(
          (input) => input.class_type !== 'CozyGenImageInput'
        )
      ),
    [dynamicInputs]
  );

  useEffect(() => {
    activeParamRef.current = activeParamId;
  }, [activeParamId]);

  useEffect(() => {
    const wrapper = formWrapperRef.current;
    if (!wrapper) return;
    const nodes = Array.from(
      wrapper.querySelectorAll('[data-param-name]')
    );
    observedNodesRef.current = nodes;
    const nextItems = nodes.map((node) => ({
      id: node.getAttribute('data-param-name'),
      label:
        node.getAttribute('data-param-label') ||
        node.getAttribute('data-param-name') ||
        'Parameter',
    }));
    setMiniMapItems(nextItems);

    const currentActive = activeParamRef.current;
    if (nextItems.length && !nextItems.find((item) => item.id === currentActive)) {
      setActiveParamId(nextItems[0].id);
    }
  }, [allInputs]);

  useEffect(() => {
    const handleScroll = () => {
      const nodes = observedNodesRef.current;
      if (!nodes.length) return;

      const anchorOffset = 150;
      let candidate = nodes[0];
      let bestDistance = Number.POSITIVE_INFINITY;

      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.top - anchorOffset);
        if (rect.top <= anchorOffset && distance <= bestDistance) {
          candidate = node;
          bestDistance = distance;
        }
      });

      if (candidate) {
        const nextId = candidate.getAttribute('data-param-name');
        if (nextId && nextId !== activeParamRef.current) {
          setActiveParamId(nextId);
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMiniMapJump = useCallback((paramId) => {
    const nodes = observedNodesRef.current;
    const target = nodes.find(
      (node) => node.getAttribute('data-param-name') === paramId
    );
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const yOffset = window.scrollY + rect.top - 80;
    window.scrollTo({ top: yOffset, behavior: 'smooth' });
    setActiveParamId(paramId);
  }, []);

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div>
          <h2 className="wizard-title">Parameters</h2>
          <p className="wizard-subtitle">
            Tweak what matters—CozyGen keeps the rest.
          </p>
        </div>
      </div>

      {miniMapItems.length > 0 && (
        <ParameterMiniMap
          items={miniMapItems}
          activeId={activeParamId}
          onJump={handleMiniMapJump}
          variant="inline"
          title="Jump to control"
          subtitle={`${miniMapItems.length} controls`}
        />
      )}

      <div ref={formWrapperRef} className="wizard-parameter-scroll mt-3">
        <DynamicForm
          inputs={allInputs}
          formData={formData}
          onFormChange={onFormChange}
        />
      </div>
    </div>
  );
}
