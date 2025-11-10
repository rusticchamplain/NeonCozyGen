// js/src/pages/PersonalizeWorkflows.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import {
  getFieldPrefs,
  setFieldPrefs,
} from '../utils/fieldOrder';
import { LORA_PAIRS } from '../config/loraPairs';

function workflowId(wf) {
  return typeof wf === 'string' ? wf : wf?.name || '';
}

function workflowLabel(wf) {
  if (typeof wf === 'string') {
    return wf.replace(/\.json$/i, '');
  }
  return wf?.display_name || wf?.name || '';
}

export default function PersonalizeWorkflows() {
  const {
    workflows = [],
    selectedWorkflow,
    selectWorkflow,
  } = useWorkflows();

  const { dynamicInputs = [] } = useWorkflowForm(selectedWorkflow);

  const [localOrder, setLocalOrder] = useState([]);
  const [localHidden, setLocalHidden] = useState({});
  const [dragIndex, setDragIndex] = useState(null); // visual only

  const hasWorkflows = workflows && workflows.length > 0;

  // Map param_name -> input
  const byName = useMemo(() => {
    const map = new Map();
    (dynamicInputs || []).forEach((inp) => {
      const i = inp?.inputs || {};
      const name =
        i.param_name || i.name || i.key || i.id || `param_${inp?.id || 'unknown'}`;
      if (name) map.set(name, inp);
    });
    return map;
  }, [dynamicInputs]);

  // Determine LoRA pairs that actually exist in this workflow
  const activeLoraPairs = useMemo(() => {
    const result = [];
    LORA_PAIRS.forEach((pair) => {
      const highExists = byName.has(pair.highParam);
      const lowExists = byName.has(pair.lowParam);
      if (!highExists || !lowExists) return;
      result.push(pair);
    });
    return result;
  }, [byName]);

  // For quick lookup: highParam -> pair, and set of all names in any pair
  const loraPairByHighParam = useMemo(() => {
    const map = new Map();
    activeLoraPairs.forEach((pair) => {
      map.set(pair.highParam, pair);
    });
    return map;
  }, [activeLoraPairs]);

  const loraMemberNames = useMemo(() => {
    const set = new Set();
    activeLoraPairs.forEach((pair) => {
      set.add(pair.highParam);
      set.add(pair.lowParam);
      if (pair.highStrengthParam) set.add(pair.highStrengthParam);
      if (pair.lowStrengthParam) set.add(pair.lowStrengthParam);
    });
    return set;
  }, [activeLoraPairs]);

  // Initialize prefs when workflow or inputs change
  useEffect(() => {
    if (!selectedWorkflow || !dynamicInputs.length) {
      setLocalOrder([]);
      setLocalHidden({});
      return;
    }

    const prefs = getFieldPrefs(selectedWorkflow);
    const storedOrder = prefs.order || {};
    const storedHidden = prefs.hidden || {};

    const availableNames = dynamicInputs
      .map((inp) => inp?.inputs?.param_name)
      .filter(Boolean);

    const existing = storedOrder.filter((name) =>
      availableNames.includes(name)
    );
    const missing = availableNames.filter((name) => !existing.includes(name));
    const combined = [...existing, ...missing];

    const nextHidden = {};
    combined.forEach((name) => {
      nextHidden[name] = !!storedHidden[name];
    });

    setLocalOrder(combined);
    setLocalHidden(nextHidden);
  }, [selectedWorkflow, dynamicInputs]);

  // Persist prefs whenever they change
  useEffect(() => {
    if (!selectedWorkflow) return;
    setFieldPrefs(selectedWorkflow, {
      order: localOrder,
      hidden: localHidden,
    });
  }, [selectedWorkflow, localOrder, localHidden]);

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragEnd = () => setDragIndex(null);

  const moveField = (name, delta) => {
    setLocalOrder((prev) => {
      const idx = prev.indexOf(name);
      if (idx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      let target = idx + delta;
      if (target < 0 || target > next.length) return prev;
      next.splice(target, 0, moved);
      return next;
    });
  };

  // Build rows for UI: some are single params, some are LoRA pair groups
  const rows = useMemo(() => {
    const seen = new Set();
    const list = [];

    const addSingleRow = (name) => {
      if (seen.has(name)) return;
      const input = byName.get(name);
      if (!input) return;
      seen.add(name);
      list.push({ kind: 'single', name, input });
    };

    const addPairRow = (pair) => {
      const members = [
        pair.highParam,
        pair.lowParam,
        pair.highStrengthParam,
        pair.lowStrengthParam,
      ].filter(Boolean);
      members.forEach((m) => seen.add(m));
      list.push({
        kind: 'loraPair',
        pair,
        handle: pair.highParam,
        members,
      });
    };

    // Walk in localOrder so user-defined order drives the list
    localOrder.forEach((name) => {
      if (!name || seen.has(name)) return;

      const pair = loraPairByHighParam.get(name);
      if (pair) {
        addPairRow(pair);
      } else {
        addSingleRow(name);
      }
    });

    // Any remaining params that don't appear in localOrder (fallback)
    byName.forEach((_input, name) => {
      if (!seen.has(name)) {
        addSingleRow(name);
      }
    });

    return list;
  }, [localOrder, byName, loraPairByHighParam]);

  const resetLayout = () => {
    const names = dynamicInputs
      .map((inp) => inp?.inputs?.param_name)
      .filter(Boolean);
    setLocalOrder(names);
    setLocalHidden({});
    if (selectedWorkflow) {
      setFieldPrefs(selectedWorkflow, {
        order: names,
        hidden: {},
      });
    }
  };

  return (
    <div className="page-shell page-stack">
      <section className="ui-panel space-y-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="ui-section-text">
            <span className="ui-kicker">Layout studio</span>
            <h1 className="ui-title">Personalize your controls</h1>
            <p className="ui-hint">
              Reorder or hide parameters per workflow. Changes stay local.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 min-w-[200px]">
            <span className="ui-kicker text-[10px]">Active workflow</span>
            <select
              className="w-full sm:w-64 rounded-full border border-[#3D4270] bg-[#050716] px-3 py-1.5 text-[12px] text-[#E5E7FF] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
              value={selectedWorkflow || ''}
              onChange={(e) => selectWorkflow(e.target.value)}
            >
              <option value="" disabled>
                Choose a workflow…
              </option>
              {hasWorkflows &&
                workflows.map((wf) => {
                  const id = workflowId(wf);
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {workflowLabel(wf)}
                    </option>
                  );
                })}
            </select>
            <div className="text-[10px] text-[#6A6FA8] max-w-xs text-right">
              Layout preferences only change the UI.
            </div>
          </div>
        </header>

        {!hasWorkflows && (
          <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
            No workflows loaded yet. Drop JSON files into CozyGen/workflows.
          </div>
        )}

        {hasWorkflows && !selectedWorkflow && (
          <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
            Pick a workflow above to start rearranging.
          </div>
        )}

        {hasWorkflows && selectedWorkflow && dynamicInputs.length === 0 && (
          <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
            This workflow doesn&apos;t expose any dynamic inputs yet.
          </div>
        )}
      </section>

      {hasWorkflows && selectedWorkflow && dynamicInputs.length > 0 && (
        <section className="ui-panel space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="ui-kicker">
                {dynamicInputs.length} parameters
              </span>
              <p className="ui-hint">
                Use the arrows to nudge fields or hide what you rarely touch.
              </p>
            </div>
            <button
              type="button"
              className="hidden sm:inline-flex ui-button is-ghost is-compact"
              onClick={resetLayout}
            >
              Reset layout
            </button>
          </div>

          <div className="space-y-2 sm:space-y-2.5">
            {rows.map((row, idx) => {
                const isDragging = dragIndex === idx;

                if (row.kind === 'loraPair') {
                  const { pair, handle, members } = row;
                  const anyHidden = members.some((m) => localHidden[m]);
                  const allHidden = members.every((m) => localHidden[m]);

                  const globalIndex = localOrder.indexOf(handle);
                  const atTop = globalIndex <= 0;
                  const atBottom =
                    globalIndex === localOrder.length - 1 ||
                    localOrder.length <= 1;

                  return (
                    <div
                      key={`lora_pair_${pair.id}`}
                      className={
                        'rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2.5 text-[11px] ' +
                        'shadow-[0_0_16px_rgba(5,7,22,0.9)] ' +
                        (isDragging ? 'opacity-70 border-[#3EF0FF80] ' : '') +
                        (allHidden ? 'opacity-55' : '')
                      }
                      draggable={false}
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[#F8F4FF]">
                              {pair.label || `LoRA Pair ${pair.id}`}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-[#3D4270] px-2 py-[2px] text-[9px] tracking-[0.14em] uppercase text-[#9DA3FFCC]">
                              LoRA Pair
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-[#6A6FA8] truncate">
                            {members.join(' • ')}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="h-6 w-6 rounded-full border border-[#3D4270] bg-[#050716] flex items-center justify-center hover:border-[#3EF0FF80] disabled:opacity-40"
                              onClick={() => moveField(handle, -1)}
                              disabled={atTop}
                              aria-label="Move pair up"
                            >
                              <span className="leading-none text-[11px]">
                                ↑
                              </span>
                            </button>
                            <button
                              type="button"
                              className="h-6 w-6 rounded-full border border-[#3D4270] bg-[#050716] flex items-center justify-center hover:border-[#3EF0FF80] disabled:opacity-40"
                              onClick={() => moveField(handle, +1)}
                              disabled={atBottom}
                              aria-label="Move pair down"
                            >
                              <span className="leading-none text-[11px]">
                                ↓
                              </span>
                            </button>
                          </div>
                          <button
                            type="button"
                            className={
                              'px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-[0.14em] ' +
                              (allHidden
                                ? 'border-[#3D4270] text-[#6A6FA8]'
                                : 'border-[#3D4270] text-[#C3C7FF]')
                            }
                            onClick={() =>
                              setLocalHidden((prev) => {
                                const next = { ...prev };
                                const makeHidden = !allHidden;
                                members.forEach((m) => {
                                  next[m] = makeHidden;
                                });
                                return next;
                              })
                            }
                          >
                            {allHidden
                              ? 'Hidden pair'
                              : anyHidden
                              ? 'Partially hidden'
                              : 'Hide pair'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Single param row
                const { name, input } = row;
                const i = input?.inputs || {};
                const label =
                  i.label ||
                  i.display_name ||
                  i.title ||
                  i.param_name ||
                  input?.class_type ||
                  name;
                const pType =
                  i.param_type ||
                  i.Param_type ||
                  input?.class_type ||
                  'Value';

                const isHidden = !!localHidden[name];

                const globalIndex = localOrder.indexOf(name);
                const atTop = globalIndex <= 0;
                const atBottom =
                  globalIndex === localOrder.length - 1 ||
                  localOrder.length <= 1;

                return (
                  <div
                    key={name}
                    className={
                      'rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2.5 text-[11px] ' +
                      'shadow-[0_0_16px_rgba(5,7,22,0.9)] ' +
                      (isDragging ? 'opacity-70 border-[#3EF0FF80] ' : '') +
                      (isHidden ? 'opacity-55' : '')
                    }
                    draggable={false}
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[#F8F4FF]">
                            {label}
                          </span>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-[#9DA3FFCC]">
                            {name}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-[#6A6FA8] truncate">
                          {String(pType)}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="h-6 w-6 rounded-full border border-[#3D4270] bg-[#050716] flex items-center justify-center hover:border-[#3EF0FF80] disabled:opacity-40"
                            onClick={() => moveField(name, -1)}
                            disabled={atTop}
                            aria-label="Move up"
                          >
                            <span className="leading-none text-[11px]">
                              ↑
                            </span>
                          </button>
                          <button
                            type="button"
                            className="h-6 w-6 rounded-full border border-[#3D4270] bg-[#050716] flex items-center justify-center hover:border-[#3EF0FF80] disabled:opacity-40"
                            onClick={() => moveField(name, +1)}
                            disabled={atBottom}
                            aria-label="Move down"
                          >
                            <span className="leading-none text-[11px]">
                              ↓
                            </span>
                          </button>
                        </div>
                        <button
                          type="button"
                          className={
                            'px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-[0.14em] ' +
                            (isHidden
                              ? 'border-[#3D4270] text-[#6A6FA8]'
                              : 'border-[#3D4270] text-[#C3C7FF]')
                          }
                          onClick={() =>
                            setLocalHidden((prev) => ({
                              ...prev,
                              [name]: !isHidden,
                            }))
                          }
                        >
                          {isHidden ? 'Hidden' : 'Hide'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
    </div>
  );
}
