import React from 'react';
import WorkflowSelector from '../WorkflowSelector';

export default function WorkflowHeader({
  workflows,
  selectedWorkflow,
  onSelectWorkflow,
  simpleMode,
  setSimpleMode,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="space-y-1">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#9DA3FFCC]">
          Workflow
        </div>
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-auto min-w-[14rem]">
            <WorkflowSelector
              workflows={workflows}
              selectedWorkflow={selectedWorkflow}
              onSelect={onSelectWorkflow}
            />
          </div>
        </div>
      </div>

      {/* Simple / Advanced pill */}
      <div className="flex items-center gap-2 self-start">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#9DA3FFCC]">
          Lab mode
        </span>
        <div className="inline-flex rounded-full border border-[#3D4270] bg-[#050716] overflow-hidden shadow-[0_0_18px_rgba(5,7,22,0.9)]">
          <button
            type="button"
            className={`px-4 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase ${
              simpleMode
                ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716]'
                : 'text-[#C3C7FFCC]'
            }`}
            onClick={() => setSimpleMode(true)}
          >
            Simple
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase ${
              !simpleMode
                ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716]'
                : 'text-[#C3C7FFCC]'
            }`}
            onClick={() => setSimpleMode(false)}
          >
            Advanced
          </button>
        </div>
      </div>
    </div>
  );
}
