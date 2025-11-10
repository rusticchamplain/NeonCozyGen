import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import DynamicForm from '../../DynamicForm';

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
    // Dynamic inputs keep their server-provided param_type
    return input;
  });
}

export default function AllParametersPanel({
  dynamicInputs,
  formData,
  onFormChange,
  sectionRef,
  onParameterNavReady,
  walkthroughMode,
  guideActive,
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

      const anchorOffset = 130;
      let candidate = nodes[0];
      let bestDistance = Number.POSITIVE_INFINITY;

      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.top - anchorOffset);
        const isAboveViewport = rect.bottom < 80;
        if (isAboveViewport) {
          candidate = node;
          bestDistance = -1;
          return;
        }
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
  }, [miniMapItems]);

  const handleMiniMapJump = useCallback((paramId) => {
    const nodes = observedNodesRef.current;
    const target = nodes.find(
      (node) => node.getAttribute('data-param-name') === paramId
    );
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const yOffset = window.scrollY + rect.top - 96;
    window.scrollTo({ top: yOffset, behavior: 'smooth' });
    setActiveParamId(paramId);
  }, []);

  useEffect(() => {
    if (!onParameterNavReady) return;
    onParameterNavReady({
      items: miniMapItems,
      activeId: activeParamId,
      onJump: handleMiniMapJump,
    });
  }, [miniMapItems, activeParamId, handleMiniMapJump, onParameterNavReady]);

  useEffect(
    () => () => {
      onParameterNavReady?.(null);
    },
    [onParameterNavReady]
  );

  const sectionClass = [
    'control-arena scroll-mt-24',
    walkthroughMode ? 'guide-surface' : '',
    walkthroughMode && guideActive ? 'guide-focus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const totalParams = allInputs.length;
  const advancedParams = allInputs.filter((inp) => inp.inputs?.advanced_only).length;
  const boardStats = [
    { label: 'Controls', value: totalParams },
    { label: 'Advanced', value: advancedParams },
  ];

  const quickNavItems = miniMapItems.slice(0, 5);

  const handleJumpActive = () => {
    const targetId = activeParamId || miniMapItems[0]?.id;
    if (targetId) handleMiniMapJump(targetId);
  };

  return (
    <section className={sectionClass} ref={sectionRef}>
      <div className="control-board">
        <div className="control-metrics">
          {boardStats.map((stat) => (
            <div key={stat.label} className="control-chip">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
        <div className="control-actions">
          <button type="button" className="control-action primary" onClick={handleJumpActive}>
            Jump active
          </button>
          <button
            type="button"
            className="control-action"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Top
          </button>
          <button
            type="button"
            className="control-action"
            onClick={() => formWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Stack
          </button>
        </div>
        {quickNavItems.length > 0 && (
          <div className="control-nav">
            {quickNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="control-nav-btn"
                onClick={() => handleMiniMapJump(item.id)}
              >
                <span className="control-nav-dot" />
                {item.label}
              </button>
            ))}
            {miniMapItems.length > quickNavItems.length && (
              <span className="control-nav-more">+{miniMapItems.length - quickNavItems.length}</span>
            )}
          </div>
        )}
      </div>

      <div className="control-stack">
        <div className="control-spine" />
        <div ref={formWrapperRef} className="control-stack-inner">
          <DynamicForm
            inputs={allInputs}
            formData={formData}
            onFormChange={onFormChange}
          />
        </div>
      </div>
    </section>
  );
}
