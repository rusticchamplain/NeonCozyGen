import React from 'react';
import { Link } from 'react-router-dom';
import WorkflowSelector from '../WorkflowSelector';

export default function WorkflowHeader({
  workflows,
  selectedWorkflow,
  onSelectWorkflow,
  walkthroughMode,
  setWalkthroughMode,
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex-1">
        <span className="ui-kicker">Workflow</span>
        <div className="mt-1 min-w-[14rem]">
          <WorkflowSelector
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelect={onSelectWorkflow}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <label className="ui-toolbar cursor-pointer">
          <span className="ui-kicker text-[10px]">Guide</span>
          <div className="relative inline-flex h-5 w-10 items-center rounded-full bg-[#1C2140]">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={walkthroughMode}
              onChange={(e) => setWalkthroughMode(e.target.checked)}
            />
            <span className="absolute inset-0 pointer-events-none rounded-full border border-[#363C66]" />
            <span className="absolute h-4 w-4 rounded-full bg-[linear-gradient(145deg,#FF60D0,#3EF0FF)] shadow-[0_3px_12px_rgba(62,240,255,0.45)] transition-all duration-200 left-0.5 peer-checked:translate-x-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#E5E7FF]">
            {walkthroughMode ? 'On' : 'Off'}
          </span>
        </label>

        <Link to="/" className="ui-button is-muted is-compact whitespace-nowrap">
          Wizard
        </Link>
      </div>
    </div>
  );
}
