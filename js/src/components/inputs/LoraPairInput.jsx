// js/src/components/inputs/LoraPairInput.jsx
import { useEffect, useMemo, useState } from 'react';
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
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

const toDomId = (...parts) => {
  const normalized = parts
    .flat()
    .map((part) =>
      String(part ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .filter(Boolean);
  return normalized.join('-') || 'field';
};

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
  highStrengthValue,
  lowStrengthValue,
  onChangeHighStrength,
  onChangeLowStrength,
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

  const strengthName =
    highStrengthParam || lowStrengthParam || `${name}_strength`;
  const baseStrengthDomId = useMemo(
    () => toDomId(name || 'lora', strengthName || 'strength'),
    [name, strengthName]
  );

  const hasStrengthControls = !!(highStrengthParam || lowStrengthParam);
  const hasBothStrengthParams = !!(highStrengthParam && lowStrengthParam);

  const normalizeStrength = (value, fallback = 1.0) =>
    typeof value === 'number' ? value : fallback;

  const linkedStrength = normalizeStrength(
    typeof strengthValue === 'number'
      ? strengthValue
      : typeof highStrengthValue === 'number'
      ? highStrengthValue
      : typeof lowStrengthValue === 'number'
      ? lowStrengthValue
      : undefined,
    1.0
  );

  const highStrength = normalizeStrength(
    typeof highStrengthValue === 'number' ? highStrengthValue : undefined,
    linkedStrength
  );
  const lowStrength = normalizeStrength(
    typeof lowStrengthValue === 'number' ? lowStrengthValue : undefined,
    hasBothStrengthParams ? linkedStrength : highStrength
  );

  const defaultSplit =
    hasBothStrengthParams && Math.abs(highStrength - lowStrength) > 1e-4;

  const [splitStrength, setSplitStrength] = useState(defaultSplit);

  useEffect(() => {
    setSplitStrength(defaultSplit);
  }, [defaultSplit, highParam, lowParam]);

  const handleSelectBase = (base) => {
    if (!onChangeParam) return;
    const pair = pairs.find((p) => p.base === base);
    if (!pair) return;
    onChangeParam(highParam, pair.highValue);
    onChangeParam(lowParam, pair.lowValue);
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

  const linkedStrengthId = `${baseStrengthDomId}-linked`;
  const highStrengthId = `${baseStrengthDomId}-high`;
  const lowStrengthId = `${baseStrengthDomId}-low`;

  const linkedPillText = hasBothStrengthParams ? 'Linked' : 'Strength';
  const linkedHintText = hasBothStrengthParams
    ? 'Applies to high + low'
    : highStrengthParam || lowStrengthParam || '';

  const callStrengthHandlers = (targets, value) => {
    const list = Array.isArray(targets) ? targets : [targets];
    let legacyCalled = false;
    list.forEach((target) => {
      if (target === 'high' && typeof onChangeHighStrength === 'function') {
        onChangeHighStrength(value);
        return;
      }
      if (target === 'low' && typeof onChangeLowStrength === 'function') {
        onChangeLowStrength(value);
        return;
      }
      if (typeof onChangeStrength === 'function' && !legacyCalled) {
        onChangeStrength(value);
        legacyCalled = true;
      }
    });
  };

  const handleLinkedStrengthChange = (val) => {
    if (highStrengthParam || (!highStrengthParam && !lowStrengthParam)) {
      callStrengthHandlers('high', val);
    }
    if (lowStrengthParam) {
      callStrengthHandlers('low', val);
    }
  };

  const handleSplitToggle = () => {
    if (!hasBothStrengthParams) return;
    setSplitStrength((prev) => {
      const next = !prev;
      if (!next) {
        const unified =
          typeof highStrength === 'number'
            ? highStrength
            : typeof lowStrength === 'number'
            ? lowStrength
            : linkedStrength;
        handleLinkedStrengthChange(unified);
      }
      return next;
    });
  };

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

      {hasStrengthControls && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#9DA3FFCC]">
              Strength
            </span>
            {hasBothStrengthParams && (
              <button
                type="button"
                className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#E5E7FF]"
                onClick={handleSplitToggle}
                disabled={disabled}
              >
                {splitStrength ? 'Link values' : 'Split values'}
              </button>
            )}
          </div>

          {splitStrength && hasBothStrengthParams ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <div className="flex-1 max-w-[220px]">
                <label
                  htmlFor={highStrengthId}
                  className="lora-strength-label is-high"
                >
                  <span className="lora-strength-label-pill">High</span>
                  <span className="lora-strength-label-text">
                    High strength
                    {highStrengthParam && (
                      <span className="lora-strength-label-hint">
                        {highStrengthParam}
                      </span>
                    )}
                  </span>
                </label>
                <NumberInput
                  name={`${strengthName}_high`}
                  label="High strength"
                  description=""
                  value={highStrength}
                  onChange={(val) => callStrengthHandlers('high', val)}
                  disabled={disabled}
                  isFloat={true}
                  min={0}
                  max={2}
                  step={0.05}
                  inputId={highStrengthId}
                />
              </div>
              <div className="flex-1 max-w-[220px]">
                <label
                  htmlFor={lowStrengthId}
                  className="lora-strength-label is-low"
                >
                  <span className="lora-strength-label-pill">Low</span>
                  <span className="lora-strength-label-text">
                    Low strength
                    {lowStrengthParam && (
                      <span className="lora-strength-label-hint">
                        {lowStrengthParam}
                      </span>
                    )}
                  </span>
                </label>
                <NumberInput
                  name={`${strengthName}_low`}
                  label="Low strength"
                  description=""
                  value={lowStrength}
                  onChange={(val) => callStrengthHandlers('low', val)}
                  disabled={disabled}
                  isFloat={true}
                  min={0}
                  max={2}
                  step={0.05}
                  inputId={lowStrengthId}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 max-w-[220px]">
              <label
                htmlFor={linkedStrengthId}
                className="lora-strength-label is-linked"
              >
                <span className="lora-strength-label-pill">
                  {linkedPillText}
                </span>
                <span className="lora-strength-label-text">
                  LoRA strength
                  {linkedHintText && (
                    <span className="lora-strength-label-hint">
                      {linkedHintText}
                    </span>
                  )}
                </span>
              </label>
              <NumberInput
                name={strengthName}
                label="LoRA strength"
                description=""
                value={linkedStrength}
                onChange={handleLinkedStrengthChange}
                disabled={disabled}
                isFloat={true}
                min={0}
                max={2}
                step={0.05}
                inputId={linkedStrengthId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
