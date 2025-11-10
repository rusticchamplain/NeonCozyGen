// js/src/components/DynamicForm.jsx
import React, { useCallback, useMemo, useState } from 'react';
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

export function resolveLabel(input) {
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

export function resolveParamName(input) {
  const i = input?.inputs || {};
  return (
    i.param_name ||
    i.name ||
    i.key ||
    i.id ||
    `param_${input?.id || 'unknown'}`
  );
}

export function resolveConfig(input) {
  const i = input?.inputs || {};
  return {
    paramName: resolveParamName(input),
    label: resolveLabel(input),
    description: resolveDescription(input),
    paramType: getParamType(input),
    advancedOnly: !!i.advanced_only,
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
  onFormChange,
}) {
  const [collapsedCards, setCollapsedCards] = useState({});

  const handleValueChange = (paramName, value) => {
    if (!onFormChange) return;
    onFormChange(paramName, value);
  };

  const toggleCollapsed = useCallback((cardId) => {
    if (!cardId) return;
    setCollapsedCards((prev) => ({
      ...prev,
      [cardId]: !prev?.[cardId],
    }));
  }, []);

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

    const anchorId = paramName ? `param-${paramName}` : undefined;
    const cardCollapsed = !!collapsedCards[paramName];

    return (
            <div
              key={`lora_pair_${id || highParam}`}
              id={anchorId}
              data-param-name={paramName}
              data-param-label={label || cfg.label}
              data-param-type="lora_pair"
              className="control-card"
            >
              <div className="control-card-head">
                <div className="control-card-summary">
                  <span className="param-chip">LoRA</span>
                  <div className="control-card-title">{label || cfg.label}</div>
                </div>

                <button
                  type="button"
                  className="control-collapse"
                  onClick={() => toggleCollapsed(paramName)}
                  aria-label={cardCollapsed ? 'Expand parameter' : 'Collapse parameter'}
                >
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className={cardCollapsed ? 'control-collapse-icon collapsed' : 'control-collapse-icon'}
                  >
                    <path
                      d="M3 6l5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {!cardCollapsed && (
                <div className="control-card-body">
                  <LoraPairInput
                    name={id || highParam}
                    label={label || cfg.label}
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
                    disabled={false}
                  />
                </div>
              )}
              <div className="control-card-foot">
                <span className="control-param-id">{paramName}</span>
              </div>
            </div>
          );
        }

        // If this param is consumed by a LoRA pair (low/strength), skip it
        if (consumedParams.has(paramName)) {
          return null;
        }

        const value = formData[paramName];
        const disabled = false;

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

        const anchorId = paramName ? `param-${paramName}` : undefined;
        const cardCollapsed = !!collapsedCards[paramName];

        return (
          <div
            key={paramName}
            id={anchorId}
            data-param-name={paramName}
            data-param-label={cfg.label}
            data-param-type="single"
            className="control-card"
          >
              <div className="control-card-head">
                <div className="control-card-summary">
                  <span className="param-chip">{cfg.paramType}</span>
                  <div className="control-card-title">{cfg.label}</div>
                </div>

                <button
                  type="button"
                  className="control-collapse"
                  onClick={() => toggleCollapsed(paramName)}
                  aria-label={cardCollapsed ? 'Expand parameter' : 'Collapse parameter'}
                >
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className={cardCollapsed ? 'control-collapse-icon collapsed' : 'control-collapse-icon'}
                  >
                    <path
                      d="M3 6l5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

            {!cardCollapsed && <div className="control-card-body">{field}</div>}
            <div className="control-card-foot">
              <span className="control-param-id">{paramName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
