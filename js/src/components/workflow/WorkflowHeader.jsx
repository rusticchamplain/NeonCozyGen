import WorkflowSelector from '../WorkflowSelector';

export default function WorkflowHeader({
  workflows,
  selectedWorkflow,
  onSelectWorkflow,
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
    </div>
  );
}
