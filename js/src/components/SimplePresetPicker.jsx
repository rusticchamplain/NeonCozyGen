import React, { useEffect, useMemo, useState } from 'react';
import { listPresets } from '../api';
import { normalizePresetValue } from '../utils/presets';

/**
 * SimplePresetPicker
 * - Minimal dropdown-only preset selector for Simple Mode.
 * - Robust normalization of API responses:
 *   • {presets: Array<{name, values, workflow?}>}
 *   • {presets: Record<presetName, values>}
 *   • {presets: Record<workflowKey, Array|Record>}
 *   • Array/Record at the top level (no "presets" wrapper)
 * - Filters by current workflow (matches filename, basename, no-ext, case-insensitive).
 * - Falls back to listPresets() if listPresets(workflow) returns empty.
 * - Remembers last-used preset per workflow; auto-applies on load & on change.
 *
 * This is meant to sit inside a surface-section whose header is
 * rendered by MainPage (“STYLE PRESETS”).
 */
export default function SimplePresetPicker({
  workflow,
  onApply,
  className = '',
}) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState('');

  const storageKey = useMemo(
    () => `cozygen_last_preset_${workflow || 'default'}`,
                             [workflow]
  );

  const workflowKeys = useMemo(() => {
    const s = String(workflow || '').trim();
    const base = s.split(/[\\/]/).pop(); // "img2vid.json"
    const noExt = (base || '').replace(/\.(json|yaml|yml)$/i, ''); // "img2vid"
    const variants = new Set(
      [
        s,
        base,
        noExt,
        s.toLowerCase(),
                             (base || '').toLowerCase(),
                             noExt.toLowerCase(),
      ].filter(Boolean)
    );
    return variants;
  }, [workflow]);

  useEffect(() => {
    let cancelled = false;

    const normalizeArray = (arr) => {
      // Accept [{name,values,workflow?}] OR [string]
      const mapped = (arr || []).map((it) => {
        if (typeof it === 'string') {
          return { name: it, values: {}, workflow: undefined };
        }
        const name = it?.name ?? String(it?.id ?? '');
        const wf = it?.workflow ?? it?.workflow_name ?? it?.wf;
        const { values } = normalizePresetValue(it);
        return { name, values: values || {}, workflow: wf };
      });
      return mapped;
    };

    const normalizeRecord = (rec) => {
      // Accept {presetName: values}
      const out = [];
      for (const [name, values] of Object.entries(rec || {})) {
        const { values: parsed } = normalizePresetValue(values);
        out.push({ name, values: parsed || {}, workflow: undefined });
      }
      return out;
    };

    const chooseWorkflowBucket = (obj) => {
      // obj might be { [workflowKey]: Array|Record, ... }
      const keys = Object.keys(obj || {});
      // try exact & case-insensitive matches against workflowKeys
      let chosen =
      keys.find((k) => workflowKeys.has(k)) ||
      keys.find((k) => workflowKeys.has(k.toLowerCase()));
      if (!chosen) {
        // heuristic: if only one key and we have a workflow, assume that key is it
        if (keys.length === 1) chosen = keys[0];
      }
      return chosen ? obj[chosen] : null;
    };

    const normalizeAny = (data) => {
      if (!data) return [];
      const raw = data.presets ?? data;

      // Array at top level
      if (Array.isArray(raw)) return normalizeArray(raw);

      // Record at top level
      if (raw && typeof raw === 'object') {
        // Could be:
        //  A) {presetName: values}
        //  B) {workflowKey: Array|Record}
        // Decide by inspecting a value: if values look like an object-of-objects we try workflow bucket
        const valuesArr = Object.values(raw);
        const looksNested = valuesArr.some(
          (v) =>
          Array.isArray(v) ||
          (v && typeof v === 'object' && !('prompt' in raw))
        ); // heuristic

        if (looksNested) {
          const bucket = chooseWorkflowBucket(raw);
          if (Array.isArray(bucket)) return normalizeArray(bucket);
          if (bucket && typeof bucket === 'object')
            return normalizeRecord(bucket);
          // fallback: flatten all buckets into one list
          let flat = [];
          for (const v of valuesArr) {
            if (Array.isArray(v)) flat = flat.concat(normalizeArray(v));
            else if (v && typeof v === 'object')
              flat = flat.concat(normalizeRecord(v));
          }
          return flat;
        }
        // Not nested, treat as name->values
        return normalizeRecord(raw);
      }

      return [];
    };

    async function loadPresets() {
      if (!workflow) {
        setPresets([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      let all = [];
      try {
        // Try namespaced call first
        const resp1 = await listPresets(workflow);
        all = normalizeAny(resp1);
      } catch (e) {
        console.debug('listPresets(workflow) failed; will try global', e);
      }

      // If empty, try a global call and filter by workflow if a "workflow" field exists
      if (!all.length) {
        try {
          const resp2 = await listPresets();
          all = normalizeAny(resp2);
        } catch (e2) {
          console.error('listPresets() fallback failed', e2);
          all = [];
        }
      }

      // If items carry "workflow", filter to current workflow when possible
      if (all.length) {
        const withWf = all.filter((p) => p.workflow);
        if (withWf.length) {
          const filtered = withWf.filter((p) => {
            const wf = String(p.workflow || '').trim();
            const wfBase = wf.split(/[\\/]/).pop();
            const wfNoExt = (wfBase || '').replace(
              /\.(json|yaml|yml)$/i,
                                                   ''
            );
            const candidates = new Set(
              [
                wf,
                wfBase,
                wfNoExt,
                wf.toLowerCase(),
                                       (wfBase || '').toLowerCase(),
                                       wfNoExt.toLowerCase(),
              ].filter(Boolean)
            );
            for (const c of candidates) {
              if (workflowKeys.has(c)) return true;
            }
            return false;
          });
          if (filtered.length) {
            all = filtered;
          }
        }
      }

      if (cancelled) return;
      setPresets(all);
      setLoading(false);

      // Restore last used preset or auto-apply first
      if (all.length) {
        let initialName = '';
  try {
    initialName = localStorage.getItem(storageKey) || '';
  } catch {
    // ignore
  }

  let chosen = all[0];
  if (initialName) {
    const hit = all.find((p) => p.name === initialName);
    if (hit) chosen = hit;
  }

  setSelectedName(chosen.name);
  if (chosen.values && typeof onApply === 'function') {
    onApply(chosen.values);
  }
      }
    }

    loadPresets();

    return () => {
      cancelled = true;
    };
  }, [workflow, workflowKeys, storageKey, onApply]);

  const applyByName = (name) => {
    setSelectedName(name);
    try {
      localStorage.setItem(storageKey, name || '');
    } catch {
      // ignore
    }
    const hit = presets.find((p) => p.name === name);
    if (hit?.values && typeof onApply === 'function') onApply(hit.values);
  };

    // ---- Rendering ----

    if (!workflow) {
      return (
        <div className={className}>
        <div className="text-[11px] text-[#9DA3FFCC]">
        Select a workflow to view its presets.
        </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className={className}>
        <div className="h-9 rounded-full border border-[#2A2E4A] bg-[#050716] animate-pulse" />
        </div>
      );
    }

    if (!presets.length) {
      return (
        <div className={className}>
        <label className="block mb-1 text-[10px] tracking-[0.18em] uppercase text-[#9DA3FFCC]">
        Style preset
        </label>
        <div className="relative">
        <select
        className="w-full appearance-none rounded-full border border-[#2A2E4A] bg-[#050716] px-3 pr-8 py-1.5 text-[11px] text-[#7D81C8]"
        disabled
        >
        <option>(No presets found)</option>
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#565B9B]">
        ▾
        </span>
        </div>
        </div>
      );
    }

    return (
      <div className={className}>
      <label className="block mb-1 text-[10px] tracking-[0.18em] uppercase text-[#9DA3FFCC]">
      Style preset
      </label>
      <div className="relative">
      <select
      className="w-full appearance-none rounded-full border border-[#3D4270] bg-[#050716F2] px-3 pr-8 py-1.5 text-[11px] text-[#F8F4FF] shadow-[0_0_16px_rgba(5,7,22,0.9)] focus:outline-none focus:ring-2 focus:ring-[#3EF0FF80] hover:border-[#3EF0FF55]"
      value={selectedName}
      onChange={(e) => applyByName(e.target.value)}
      >
      {presets.map((p) => (
        <option key={p.name} value={p.name}>
        {p.name}
        </option>
      ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#C3C7FFCC]">
      ▾
      </span>
      </div>
      </div>
    );
}
