// js/src/components/PresetSelector.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listPresets, savePreset, deletePreset } from '../api';
import { normalizePresetItems } from '../utils/presets';

/**
 * Props:
 * - workflow: string (used to namespace presets per-workflow)
 * - onApply: (values: Record<string, any>) => void
 * - readCurrentValues: () => Record<string, any>
 */
export default function PresetSelector({
  workflow = 'default',
  onApply,
  readCurrentValues,
}) {
  const [items, setItems] = useState({});
  const [names, setNames] = useState([]);
  const [sel, setSel] = useState('');
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (preserveSel = true) => {
    setLoading(true);
    try {
      const data = await listPresets(workflow);
      const normalized = normalizePresetItems(data?.items || {});
      const map = normalized.reduce((acc, entry) => {
        if (!entry?.name) return acc;
        acc[entry.name] = { values: entry.values || {}, meta: entry.meta || {} };
        return acc;
      }, {});
      const list = Object.keys(map).sort((a, b) => a.localeCompare(b));
      setItems(map);
      setNames(list);
      if (preserveSel && sel && map[sel]) {
        // keep current selection
      } else {
        setSel(list[0] || '');
      }
    } finally {
      setLoading(false);
    }
  }, [workflow, sel]);

  useEffect(() => {
    refresh(false);
  }, [workflow, refresh]);

  useEffect(() => {
    const handler = (evt) => {
      const targetWorkflow = evt?.detail?.workflow;
      if (targetWorkflow && targetWorkflow !== workflow) return;
      refresh(true);
    };
    window.addEventListener('cozygen:preset-changed', handler);
    return () => window.removeEventListener('cozygen:preset-changed', handler);
  }, [workflow, refresh]);

  const setStatusTemp = (msg, ms = 2000) => {
    setStatus(msg);
    if (!msg) return;
    setTimeout(() => setStatus(''), ms);
  };

  const handleSelect = (name) => {
    setSel(name);
    const entry = items[name];
    const payload = entry?.values ?? entry;
    if (payload && typeof onApply === 'function') {
      onApply(payload);
      setStatusTemp(`Applied “${name}”`);
    }
  };

  async function doSave() {
    const name = newName.trim();
    if (!name) {
      setStatusTemp('Enter a name', 1500);
      return;
    }
    const values =
    typeof readCurrentValues === 'function' ? readCurrentValues() : {};
    await savePreset(workflow, name, values);
    setNewName('');
    await refresh();
    setSel(name);
    setStatusTemp(`Saved “${name}”`);
  }

  async function doUpdate() {
    if (!sel) return;
    const values =
    typeof readCurrentValues === 'function' ? readCurrentValues() : {};
    await savePreset(workflow, sel, values);
    await refresh(true);
    setStatusTemp(`Updated “${sel}”`);
  }

  async function doDelete() {
    if (!sel) return;
    await deletePreset(workflow, sel);
    await refresh(false);
    setStatusTemp(`Deleted “${sel}”`);
  }

  const hasPresets = useMemo(() => names.length > 0, [names.length]);

  return (
    <div className="space-y-3">
    {status && (
      <div className="mb-1 text-[11px] text-[#3EF0FF] truncate">
      {status}
      </div>
    )}

    {/* Preset chips */}
    <div>
    {hasPresets ? (
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {names.map((name) => {
        const active = name === sel;
        const baseClasses =
        'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] tracking-[0.12em] uppercase transition-all';
    const activeClasses =
    'bg-[#11152C] border-[#3EF0FF99] text-[#E6F9FF] shadow-[0_0_10px_rgba(62,240,255,0.55)]';
    const inactiveClasses =
    'bg-[#050716] border-[#2A2E4A] text-[#C3C7FFCC] hover:border-[#3EF0FF55] hover:bg-[#0B0D26] hover:shadow-[0_0_8px_rgba(62,240,255,0.35)]';

    return (
      <button
      key={name}
      type="button"
      onClick={() => handleSelect(name)}
      className={`${baseClasses} ${
        active ? activeClasses : inactiveClasses
      }`}
      >
      {name}
      </button>
    );
      })}
      </div>
    ) : (
      <p className="text-[11px] text-[#9DA3FFCC]">
      No presets yet. Save your current settings to reuse them.
      </p>
    )}
    </div>

    {/* New preset row */}
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-2 items-center">
    <input
    type="text"
    placeholder="New preset name"
    value={newName}
    onChange={(e) => setNewName(e.target.value)}
    className="col-span-1 sm:col-span-1 rounded-full border border-[#2A2E4A] bg-[#050716] px-3 py-1.5 text-[12px] text-[#F8F4FF] placeholder-[#656AA8] focus:outline-none focus:ring-2 focus:ring-[#3EF0FF80]"
    />
    <button
    type="button"
    className="inline-flex items-center justify-center rounded-full border border-[#3EF0FF55] bg-[radial-gradient(circle_at_0_0,#FF60D0_0,#3EF0FF_45%,#050716_100%)] px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-[#050716] shadow-[0_0_14px_rgba(62,240,255,0.7)] transition hover:shadow-[0_0_20px_rgba(62,240,255,0.9)] disabled:opacity-50"
    onClick={doSave}
    disabled={loading}
    >
    Save current
    </button>
    </div>

    {/* Footer actions */}
    <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-[#9DA3FFCC]">
    <span>Presets are stored per workflow.</span>
    <div className="flex items-center gap-3">
    <button
    type="button"
    onClick={doUpdate}
    disabled={!sel || !hasPresets || loading}
    className="text-[10px] tracking-[0.16em] uppercase text-[#3EF0FF] hover:text-[#FF60D0] disabled:opacity-40"
    >
    Update from current
    </button>
    <button
    type="button"
    onClick={doDelete}
    disabled={!sel || !hasPresets || loading}
    className="text-[10px] tracking-[0.16em] uppercase text-[#FF60D0] hover:text-[#FF9BEA] disabled:opacity-40"
    >
    Delete current
    </button>
    </div>
    </div>
    </div>
  );
}
