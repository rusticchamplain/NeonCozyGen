import { memo, useEffect, useMemo, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import BottomSheet from './ui/BottomSheet';
import Button from './ui/Button';
import Select from './ui/Select';
import { IconFolderOpen } from './Icons';
import { formatFileBaseName, isFilePathLike, splitFilePath } from '../utils/modelDisplay';
import useMediaQuery from '../hooks/useMediaQuery';

const getFolderLabel = (folderPath = '') => {
  if (!folderPath || folderPath === 'root') return 'root';
  const parts = folderPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || folderPath;
};

const WorkflowSelectorSection = memo(function WorkflowSelectorSection({
  workflows = [],
  selectedWorkflow,
  onWorkflowChange,
  workflowData,
  presets = [],
  presetName = '',
  onPresetNameChange,
  selectedPresetId = '',
  onPresetSelect,
  onPresetSave,
  onPresetDelete,
  presetStatus,
}) {
  const safeWorkflows = Array.isArray(workflows) ? workflows : [];
  const safePresets = Array.isArray(presets) ? presets : [];
  const presetCount = safePresets.length;
  const presetLabel = presetCount ? `${presetCount} saved` : 'No presets yet';
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [workflowFolder, setWorkflowFolder] = useState('All');
  useEffect(() => {
    setMenuOpen(false);
    setSheetOpen(false);
  }, [isDesktop]);

  const workflowMeta = useMemo(
    () =>
      safeWorkflows.map((wf) => {
        const value = String(wf || '');
        if (!isFilePathLike(value)) {
          return { value, isFile: false, base: '', folderPath: '' };
        }
        const { folderPath, base } = splitFilePath(value);
        return { value, isFile: true, base, folderPath: folderPath || 'root' };
      }),
    [safeWorkflows]
  );

  const workflowFolders = useMemo(() => {
    const set = new Set(['All']);
    workflowMeta.forEach((meta) => {
      if (meta.isFile && meta.folderPath) set.add(meta.folderPath);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workflowMeta]);
  const showWorkflowFolder = workflowFolders.length > 2;

  useEffect(() => {
    if (!showWorkflowFolder) {
      if (workflowFolder !== 'All') setWorkflowFolder('All');
      return;
    }
    if (!workflowFolders.includes(workflowFolder)) {
      setWorkflowFolder('All');
    }
  }, [showWorkflowFolder, workflowFolder, workflowFolders]);

  const workflowBaseCounts = useMemo(() => {
    const map = new Map();
    workflowMeta.forEach((meta) => {
      if (!meta.isFile || !meta.base) return;
      const key = meta.base.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [workflowMeta]);

  const workflowOptions = useMemo(() => {
    const items = [];
    const disambiguate = showWorkflowFolder && workflowFolder === 'All';
    workflowMeta.forEach((meta) => {
      if (!meta.isFile) {
        items.push({ value: meta.value, label: meta.value });
        return;
      }
      if (showWorkflowFolder && workflowFolder !== 'All' && meta.folderPath !== workflowFolder) return;
      let label = meta.base || formatFileBaseName(meta.value) || meta.value;
      if (disambiguate && meta.base) {
        const key = meta.base.toLowerCase();
        if (workflowBaseCounts.get(key) > 1) {
          label = `${label} (${getFolderLabel(meta.folderPath)})`;
        }
      }
      items.push({ value: meta.value, label });
    });
    return items;
  }, [workflowMeta, workflowFolder, workflowBaseCounts, showWorkflowFolder]);

  const hasWorkflowInFiltered = useMemo(() => {
    if (!selectedWorkflow) return true;
    return workflowOptions.some((opt) => String(opt.value) === String(selectedWorkflow));
  }, [workflowOptions, selectedWorkflow]);

  const workflowOptionsWithValue = useMemo(() => {
    if (!selectedWorkflow || hasWorkflowInFiltered) return workflowOptions;
    return [
      { value: selectedWorkflow, label: formatFileBaseName(String(selectedWorkflow)) },
      ...workflowOptions,
    ];
  }, [hasWorkflowInFiltered, selectedWorkflow, workflowOptions]);
  const closeMenus = () => {
    setMenuOpen(false);
    setSheetOpen(false);
  };
  const toggleMenu = () => {
    if (!isDesktop) {
      setSheetOpen(true);
      return;
    }
    setMenuOpen((v) => !v);
  };
  const handleSave = () => {
    onPresetSave();
    closeMenus();
  };
  const handleDelete = () => {
    onPresetDelete();
    closeMenus();
  };
  return (
    <CollapsibleSection
      title={<><IconFolderOpen size={18} className="inline-block mr-2 align-text-bottom" />Workflow</>}
      bodyClassName="control-shell controls-body"
      defaultOpen={false}
      className="controls-panel"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-[#9FB2D7B3] font-medium" htmlFor="workflow-select">
          Workflow
        </label>
        {showWorkflowFolder ? (
          <Select
            value={workflowFolder}
            onChange={setWorkflowFolder}
            className="mb-2"
            aria-label="Workflow folder filter"
            size="sm"
            options={workflowFolders.map((folder) => ({ value: folder, label: folder }))}
          />
        ) : null}
        <Select
          id="workflow-select"
          value={selectedWorkflow || ''}
          onChange={onWorkflowChange}
          aria-label="Workflow"
          size="sm"
          placeholder="Select workflow..."
          options={workflowOptionsWithValue}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-[#9FB2D7B3] font-medium" htmlFor="preset-select">
          Preset
        </label>
        <Select
          id="preset-select"
          value={selectedPresetId || ''}
          onChange={onPresetSelect}
          aria-label="Workflow preset"
          disabled={!workflowData}
          size="sm"
          placeholder="Select preset..."
          options={safePresets.map((preset) => ({ value: preset.id, label: preset.name }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-[#9FB2D7B3] font-medium" htmlFor="preset-name-input">
          Preset name
        </label>
        <input
          id="preset-name-input"
          type="text"
          value={presetName}
          onChange={(e) => onPresetNameChange(e.target.value)}
          className="ui-control ui-input"
          placeholder="Name for new preset..."
          aria-label="Preset name"
          disabled={!workflowData}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className="ui-button is-primary is-compact"
            onClick={handleSave}
            disabled={!workflowData || !presetName.trim()}
          >
            Save preset
          </button>
          <button
            type="button"
            className="ui-button is-muted is-compact"
            onClick={handleDelete}
            disabled={!workflowData || !selectedPresetId}
          >
            Delete preset
          </button>
        </div>
        {presetStatus ? (
          <div className="text-xs text-[#6D8BFF]">{presetStatus}</div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
});

export default WorkflowSelectorSection;
