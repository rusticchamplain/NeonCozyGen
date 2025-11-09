// js/src/components/WorkflowSelector.jsx
import React, { useMemo } from 'react';

export default function WorkflowSelector({ workflows, selectedWorkflow, onSelect }) {
  const handleChange = (e) => {
    const value = e.target.value || null;
    if (onSelect) onSelect(value);
  };

    const options = useMemo(
      () =>
      (workflows || []).map((wf) => {
        const value = typeof wf === 'string' ? wf : wf.filename;
        const label =
        typeof wf === 'string' ? wf : wf.title || wf.filename || value;
        return { value, label };
      }),
      [workflows]
    );

    const currentLabel = useMemo(() => {
      if (!selectedWorkflow) return 'Select a workflow…';
      const item = (workflows || []).find((w) =>
      typeof w === 'string'
      ? w === selectedWorkflow
      : w.filename === selectedWorkflow
      );
      if (!item) return selectedWorkflow;
      if (typeof item === 'string') return item;
      return item.title || item.filename || selectedWorkflow;
    }, [workflows, selectedWorkflow]);

    return (
      <div className="relative w-full">
      <select
      value={selectedWorkflow || ''}
      onChange={handleChange}
      className="
      w-full appearance-none
      rounded-full border border-[#3D4270]
      bg-[#050716F2]
      pl-3 pr-8 py-1.5
      text-[11px] sm:text-xs
      text-[#F8F4FF]
      shadow-[0_0_18px_rgba(5,7,22,0.9)]
      focus:outline-none focus:ring-2 focus:ring-[#3EF0FF80]
      hover:border-[#3EF0FF55]
      "
      title={currentLabel}
      >
      <option value="">{currentLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
        {opt.label}
        </option>
      ))}
      </select>

      {/* Neon chevron */}
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#3D4270] bg-[#050716] text-[10px] text-[#C3C7FFCC] shadow-[0_0_12px_rgba(5,7,22,0.8)]">
      ▾
      </div>
      </div>
      </div>
    );
}
