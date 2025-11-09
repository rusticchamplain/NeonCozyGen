// js/src/components/DynamicForm.jsx
import React, { useMemo } from 'react';
import StringInput from './inputs/StringInput';
import NumberInput from './inputs/NumberInput';
import BooleanInput from './inputs/BooleanInput';
import DropdownInput from './inputs/DropdownInput';
import LoraPairInput from './inputs/LoraPairInput';
import { LORA_PAIRS } from '../config/loraPairs';

function getParamType(input) {
  const raw = input?.inputs?.param_type || input?.inputs?.Param_type;
  const t = String(raw || 'STRING').toUpperCase();
  if (['NUMBER', 'FLOAT', 'INT'].includes(t)) return 'NUMBER';
  if (['BOOLEAN', 'BOOL'].includes(t)) return 'BOOLEAN';
  if (['DROPDOWN', 'CHOICE', 'SELECT'].includes(t)) return 'DROPDOWN';
  return 'STRING';
}

function resolveLabel(input) {
  const i = input?.inputs || {};
  return (
    i.label ||
    i.display_name ||
    i.title ||
    i.param_name ||
    input?.title ||
    input?.class_type ||
    'Parameter'
  );
}

function resolveDescription(input) {
  const i = input?.inputs || {};
  return (
    i.description ||
    i.help ||
    i.tooltip ||
    i.doc ||
    ''
  );
}

function resolveParamName(input) {
  const i = input?.inputs || {};
  return (
    i.param_name ||
    i.name ||
    i.key ||
    i.id ||
    `param_${input?.id || 'unknown'}`
  );
}

function resolveConfig(input) {
  const i = input?.inputs || {};
  return {
    paramName: resolveParamName(input),
    label: resolveLabel(input),
    description: resolveDescription(input),
    paramType: getParamType(input),
    advancedOnly: !!i.advanced_only,
    randomizable: !!i.randomizable,
    bypassable: !!i.bypassable,
    multiline: !!i.multiline,
    min: typeof i.min === 'number' ? i.min : undefined,
    max: typeof i.max === 'number' ? i.max : undefined,
    step: typeof i.step === 'number' ? i.step : undefined,
    choices: i.choices || i.options || [],
  };
}

export default function DynamicForm({
  inputs = [],
  formData = {},
  randomizeState = {},
  bypassedState = {},
  onFormChange,
  onRandomizeToggle,
  onBypassToggle,
}) {
  const handleValueChange = (paramName, value) => {
    if (!onFormChange) return;
    onFormChange(paramName, value);
  };

  const handleRandomChange = (paramName, next) => {
    if (!onRandomizeToggle) return;
    onRandomizeToggle(paramName, next);
  };

  const handleBypassChange = (paramName, next) => {
    if (!onBypassToggle) return;
    onBypassToggle(paramName, next);
  };

  // Build paramName -> input mapping for quick lookup
  const byName = useMemo(() => {
    const map = new Map();
    (inputs || []).forEach((inp) => {
      const name = resolveParamName(inp);
      if (name) map.set(name, inp);
    });
    return map;
  }, [inputs]);

  // Determine which LoRA pairs are actually present & usable
  const activeLoraPairs = useMemo(() => {
    const result = [];
    LORA_PAIRS.forEach((pair) => {
      const highInput = byName.get(pair.highParam);
      const lowInput = byName.get(pair.lowParam);
      if (!highInput || !lowInput) return;

      const highCfg = resolveConfig(highInput);
      const lowCfg = resolveConfig(lowInput);
      if (highCfg.paramType !== 'DROPDOWN' || lowCfg.paramType !== 'DROPDOWN') {
        return;
      }

      const highChoices = highCfg.choices || [];
      const lowChoices = lowCfg.choices || [];
      if (!highChoices.length || !lowChoices.length) return;

      result.push({
        ...pair,
        highInput,
        lowInput,
        highCfg,
        lowCfg,
      });
    });
    return result;
  }, [byName]);

  // For quick lookup: highParam -> pair descriptor
  const loraPairByHighParam = useMemo(() => {
    const map = new Map();
    activeLoraPairs.forEach((pair) => {
      map.set(pair.highParam, pair);
    });
    return map;
  }, [activeLoraPairs]);

  // Params that will be hidden because handled by a pair
  const consumedParams = useMemo(() => {
    const set = new Set();
    activeLoraPairs.forEach((pair) => {
      set.add(pair.highParam);
      set.add(pair.lowParam);
      if (pair.highStrengthParam) set.add(pair.highStrengthParam);
      if (pair.lowStrengthParam) set.add(pair.lowStrengthParam);
    });
    return set;
  }, [activeLoraPairs]);

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {inputs.map((input) => {
        const cfg = resolveConfig(input);
        const paramName = cfg.paramName;

        // If this param is part of a LoRA pair, handle it only once via the highParam
        const loraPair = loraPairByHighParam.get(paramName);
        if (loraPair) {
          // Render the combined control at the position of highParam.
          const {
            id,
            label,
            highParam,
            lowParam,
            highStrengthParam,
            lowStrengthParam,
            highCfg,
            lowCfg,
          } = loraPair;

          const valueStrength =
            (highStrengthParam && formData[highStrengthParam]) ??
            (lowStrengthParam && formData[lowStrengthParam]) ??
            1.0;

          const isBypassedHigh = !!bypassedState[highParam];
          const isBypassedLow = !!bypassedState[lowParam];
          const disabled = isBypassedHigh || isBypassedLow;

          const isRandomHigh = !!randomizeState[highParam];
          const isRandomLow = !!randomizeState[lowParam];

          const handlePairRandom = (next) => {
            if (highParam) handleRandomChange(highParam, next);
            if (lowParam) handleRandomChange(lowParam, next);
          };

          const handlePairBypass = (next) => {
            if (highParam) handleBypassChange(highParam, next);
            if (lowParam) handleBypassChange(lowParam, next);
          };

          return (
            <div
              key={`lora_pair_${id || highParam}`}
              className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2.5 shadow-[0_0_18px_rgba(5,7,22,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] font-medium text-[#E5E7FF] truncate">
                      {label || cfg.label}
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[#3D4270] px-2 py-[2px] text-[9px] tracking-[0.14em] uppercase text-[#9DA3FFCC]">
                      LoRA Pair
                    </span>
                  </div>
                  {cfg.description && (
                    <div className="mt-0.5 text-[10px] text-[#9DA3FFCC]">
                      {cfg.description}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 text-[9px] text-[#9DA3FFCC]">
                  <button
                    type="button"
                    onClick={() => handlePairRandom(!isRandomHigh || !isRandomLow)}
                    className={
                      'px-2 py-[2px] rounded-full border ' +
                      (isRandomHigh || isRandomLow
                        ? 'border-[#3EF0FFCC] text-[#CFFAFE]'
                        : 'border-[#3D4270] text-[#9DA3FFCC]')
                    }
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePairBypass(!isBypassedHigh || !isBypassedLow)}
                    className={
                      'px-2 py-[2px] rounded-full border ' +
                      (disabled
                        ? 'border-[#FF4F88CC] text-[#FFE5F1]'
                        : 'border-[#3D4270] text-[#9DA3FFCC]')
                    }
                  >
                    {disabled ? 'Bypassed' : 'Active'}
                  </button>
                </div>
              </div>

              <div className="mt-2.5">
                <LoraPairInput
                  name={id || highParam}
                  label={label || cfg.label}
                  description={cfg.description}
                  highParam={highParam}
                  lowParam={lowParam}
                  highChoices={highCfg.choices}
                  lowChoices={lowCfg.choices}
                  formData={formData}
                  onChangeParam={handleValueChange}
                  highStrengthParam={highStrengthParam}
                  lowStrengthParam={lowStrengthParam}
                  strengthValue={valueStrength}
                  onChangeStrength={(val) => {
                    if (highStrengthParam) handleValueChange(highStrengthParam, val);
                    if (lowStrengthParam) handleValueChange(lowStrengthParam, val);
                  }}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        }

        // If this param is consumed by a LoRA pair (low/strength), skip it
        if (consumedParams.has(paramName)) {
          return null;
        }

        const value = formData[paramName];
        const isRandom = !!randomizeState[paramName];
        const isBypassed = !!bypassedState[paramName];
        const disabled = isBypassed;

        const commonFieldProps = {
          name: paramName,
          label: cfg.label,
          description: cfg.description,
          value,
          disabled,
        };

        let field = null;

        if (cfg.paramType === 'NUMBER') {
          field = (
            <NumberInput
              {...commonFieldProps}
              onChange={(v) => handleValueChange(paramName, v)}
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              isFloat={true}
            />
          );
        } else if (cfg.paramType === 'BOOLEAN') {
          field = (
            <BooleanInput
              {...commonFieldProps}
              onChange={(v) => handleValueChange(paramName, v)}
            />
          );
        } else if (cfg.paramType === 'DROPDOWN') {
          field = (
            <DropdownInput
              {...commonFieldProps}
              onChange={(v) => handleValueChange(paramName, v)}
              options={cfg.choices || []}
            />
          );
        } else {
          field = (
            <StringInput
              {...commonFieldProps}
              onChange={(v) => handleValueChange(paramName, v)}
              multiline={cfg.multiline}
            />
          );
        }

        return (
          <div
            key={paramName}
            className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2.5 shadow-[0_0_18px_rgba(5,7,22,0.9)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-medium text-[#E5E7FF] truncate">
                    {cfg.label}
                  </div>
                </div>
                {cfg.description && (
                  <div className="mt-0.5 text-[10px] text-[#9DA3FFCC]">
                    {cfg.description}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 text-[9px] text-[#9DA3FFCC]">
                <button
                  type="button"
                  onClick={() => handleRandomChange(paramName, !isRandom)}
                  className={
                    'px-2 py-[2px] rounded-full border ' +
                    (isRandom
                      ? 'border-[#3EF0FFCC] text-[#CFFAFE]'
                      : 'border-[#3D4270] text-[#9DA3FFCC]')
                  }
                >
                  Random
                </button>
                <button
                  type="button"
                  onClick={() => handleBypassChange(paramName, !isBypassed)}
                  className={
                    'px-2 py-[2px] rounded-full border ' +
                    (isBypassed
                      ? 'border-[#FF4F88CC] text-[#FFE5F1]'
                      : 'border-[#3D4270] text-[#9DA3FFCC]')
                  }
                >
                  {isBypassed ? 'Bypassed' : 'Active'}
                </button>
              </div>
            </div>

            <div className="mt-2.5">{field}</div>
          </div>
        );
      })}
    </div>
  );
}
