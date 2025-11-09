// js/src/components/inputs/LoraPairInput.jsx
import React, { useMemo } from 'react';
import DropdownInput from './DropdownInput';
import NumberInput from './NumberInput';

// Normalize options as { value, label }
function normalizeOptions(options = []) {
  return options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return {
      value: opt.value ?? opt.name ?? '',
      label: opt.label ?? opt.name ?? String(opt.value ?? ''),
    };
  });
}

// Extract base name from e.g. "redhair-high.safetensors" -> "redhair"
function extractBaseName(filename, kind) {
  if (!filename) return null;
  const s = String(filename);
  if (kind === 'high') {
    const m = s.match(/(.+)-high(\.[^.]*)?$/i);
    return m ? m[1] : null;
  }
  if (kind === 'low') {
    const m = s.match(/(.+)-low(\.[^.]*)?$/i);
    return m ? m[1] : null;
  }
  return null;
}

// Slightly nicer label from base name: "redhair" -> "Redhair", "cyber_punk" -> "Cyber punk"
function prettyLabel(base) {
  if (!base) return '';
  return base
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export default function LoraPairInput({
  name,
  label,
  description,
  highParam,
  lowParam,
  highChoices = [],
  lowChoices = [],
  formData = {},
  onChangeParam,
  highStrengthParam,
  lowStrengthParam,
  strengthValue,
  onChangeStrength,
  disabled = false,
}) {
  const highOpts = useMemo(
    () => normalizeOptions(highChoices),
    [highChoices]
  );
  const lowOpts = useMemo(
    () => normalizeOptions(lowChoices),
    [lowChoices]
  );

  const pairs = useMemo(() => {
    const lowByBase = new Map();
    lowOpts.forEach((opt) => {
      const base = extractBaseName(opt.value, 'low');
      if (!base) return;
      if (!lowByBase.has(base)) lowByBase.set(base, opt);
    });

    const result = [];
    highOpts.forEach((opt) => {
      const base = extractBaseName(opt.value, 'high');
      if (!base) return;
      const lowOpt = lowByBase.get(base);
      if (!lowOpt) return;
      result.push({
        base,
        label: prettyLabel(base),
        highValue: opt.value,
        lowValue: lowOpt.value,
      });
    });

    // Sort alphabetically by label for nicer UX
    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }, [highOpts, lowOpts]);

  const selectedBase = useMemo(() => {
    const highVal = formData[highParam];
    const lowVal = formData[lowParam];
    if (!highVal || !lowVal) return '';
    const found = pairs.find(
      (p) => p.highValue === highVal && p.lowValue === lowVal
    );
    return found ? found.base : '';
  }, [formData, highParam, lowParam, pairs]);

  const handleSelectBase = (base) => {
    if (!onChangeParam) return;
    const pair = pairs.find((p) => p.base === base);
    if (!pair) return;
    onChangeParam(highParam, pair.highValue);
    onChangeParam(lowParam, pair.lowValue);
  };

  const handleStrengthChange = (val) => {
    if (!onChangeStrength) return;
    onChangeStrength(val);
  };

  if (pairs.length === 0) {
    // No usable high/low pairs; let DynamicForm fall back to separate controls.
    return (
      <div className="text-[11px] text-[#9DA3FFCC]">
        No matching <span className="font-semibold">-high</span> /{' '}
        <span className="font-semibold">-low</span> LoRA pairs found.
      </div>
    );
  }

  const strengthName =
    highStrengthParam || lowStrengthParam || `${name}_strength`;

  return (
    <div className="space-y-2">
      <DropdownInput
        name={`${name}_pair`}
        label={label}
        description={description}
        value={selectedBase || ''}
        onChange={handleSelectBase}
        disabled={disabled}
        options={pairs.map((p) => ({
          value: p.base,
          label: p.label,
        }))}
      />

      {(highStrengthParam || lowStrengthParam) && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#9DA3FFCC]">
            Strength
          </span>
          <div className="flex-1 max-w-[220px]">
            <NumberInput
              name={strengthName}
              label="LoRA strength"
              description=""
              value={strengthValue}
              onChange={handleStrengthChange}
              disabled={disabled}
              isFloat={true}
              min={0}
              max={2}
              step={0.05}
            />
          </div>
        </div>
      )}
    </div>
  );
}
