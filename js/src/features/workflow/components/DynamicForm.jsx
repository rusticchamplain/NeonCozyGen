// js/src/components/DynamicForm.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StringInput from '../inputs/StringInput';
import NumberInput from '../inputs/NumberInput';
import BooleanInput from '../inputs/BooleanInput';
import DropdownInput from '../inputs/DropdownInput';
import LoraPairInput from '../inputs/LoraPairInput';
import { LORA_PAIRS, matchLoraParam } from '../data/loraPairs';
import { formatParamPreview, resolveConfig, resolveParamName } from '../utils/dynamicForm';
import LoraPairFieldRow from './LoraPairFieldRow';
import ParamFieldRow from './ParamFieldRow';

export default function DynamicForm({
  inputs = [],
  formData = {},
  onFormChange,
  workflowName,
  onParamEdited,
  onSpotlight,
  compactControls = true,
  collapseAllKey = 0,
  collapseAllCollapsed = true,
  lastEditedParam = '',
  spotlightName = '',
  onCloseSpotlight = () => {},
  onVisibleParamsChange = () => {},
  aliasOptions = [],
  aliasCatalog = [],
  onOpenComposer,
}) {
  const [collapsedCards, setCollapsedCards] = useState({});
  const [spotlightRenderKey, setSpotlightRenderKey] = useState(0);
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const formatPreview = useCallback((cfg, value) => formatParamPreview(cfg, value), []);

  const handleValueChange = useCallback((paramName, value) => {
    if (!onFormChange || !paramName) return;
    onFormChange(paramName, value);
    onParamEdited?.(paramName);
    setCollapsedCards((prev) => {
      if (prev?.[paramName] === false) return prev;
      return {
        ...prev,
        [paramName]: false,
      };
    });
  }, [onFormChange, onParamEdited]);

  const toggleCollapsed = useCallback((cardId) => {
    if (!cardId) return;
    setCollapsedCards((prev) => ({
      ...prev,
      [cardId]: !prev?.[cardId],
    }));
  }, []);

  const visibleInputs = useMemo(() => inputs || [], [inputs]);

  const changeHandlers = useMemo(() => {
    const map = new Map();
    (visibleInputs || []).forEach((inp) => {
      const name = resolveParamName(inp);
      if (!name) return;
      map.set(name, (val) => handleValueChange(name, val));
    });
    return map;
  }, [handleValueChange, visibleInputs]);

  const enterHandlers = useMemo(() => {
    const map = new Map();
    (visibleInputs || []).forEach((inp) => {
      const name = resolveParamName(inp);
      if (!name) return;
      map.set(name, (val, e) => {
        handleValueChange(name, val);
        e?.target?.blur?.();
        if (spotlightName === name) {
          onCloseSpotlight?.();
        }
      });
    });
    return map;
  }, [handleValueChange, onCloseSpotlight, spotlightName, visibleInputs]);

  const toggleHandlers = useMemo(() => {
    const map = new Map();
    (visibleInputs || []).forEach((inp) => {
      const name = resolveParamName(inp);
      if (!name) return;
      map.set(name, () => toggleCollapsed(name));
    });
    return map;
  }, [toggleCollapsed, visibleInputs]);

  // Collapse/expand all when parent changes the key
  useEffect(() => {
    const next = {};
    (inputs || []).forEach((inp) => {
      const name = resolveParamName(inp);
      if (name) next[name] = collapseAllCollapsed;
    });
    if (lastEditedParam) {
      next[lastEditedParam] = false;
    }
    setCollapsedCards(next);
  }, [collapseAllKey, collapseAllCollapsed, inputs, lastEditedParam]);

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
      const highMatch = matchLoraParam(byName, pair.highParamAliases || pair.highParam);
      const lowMatch = matchLoraParam(byName, pair.lowParamAliases || pair.lowParam);
      if (!highMatch || !lowMatch) return;

      const highInput = highMatch.input;
      const lowInput = lowMatch.input;

      const highCfg = resolveConfig(highInput);
      const lowCfg = resolveConfig(lowInput);
      if (highCfg.paramType !== 'DROPDOWN' || lowCfg.paramType !== 'DROPDOWN') {
        return;
      }

      const highChoices = highCfg.choices || [];
      const lowChoices = lowCfg.choices || [];
      if (!highChoices.length || !lowChoices.length) return;

      const highStrengthMatch = matchLoraParam(
        byName,
        pair.highStrengthParamAliases || pair.highStrengthParam
      );
      const lowStrengthMatch = matchLoraParam(
        byName,
        pair.lowStrengthParamAliases || pair.lowStrengthParam
      );

      result.push({
        ...pair,
        highParam: highMatch.name,
        lowParam: lowMatch.name,
        highStrengthParam: highStrengthMatch?.name,
        lowStrengthParam: lowStrengthMatch?.name,
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

  const visibleEntries = useMemo(() => {
    const entries = [];
    (visibleInputs || []).forEach((input) => {
      const cfg = resolveConfig(input);
      const paramName = cfg.paramName;
      const loraPair = loraPairByHighParam.get(paramName);

      if (loraPair) {
        entries.push({
          name: paramName,
          label: loraPair.label || cfg.label,
          description: cfg.description,
          render: (currentForm) => {
            const form = currentForm || formDataRef.current || {};
            const highStrengthValue = loraPair.highStrengthParam
              ? form[loraPair.highStrengthParam]
              : undefined;
            const lowStrengthValue = loraPair.lowStrengthParam
              ? form[loraPair.lowStrengthParam]
              : undefined;
            const valueStrength = highStrengthValue ?? lowStrengthValue ?? 1.0;
            return (
              <LoraPairInput
                key={`lora-${paramName}-${spotlightRenderKey}`}
                name={loraPair.id || loraPair.highParam}
                label={loraPair.label || cfg.label}
                highParam={loraPair.highParam}
                lowParam={loraPair.lowParam}
                highChoices={loraPair.highCfg.choices}
                lowChoices={loraPair.lowCfg.choices}
                formData={form}
                onChangeParam={handleValueChange}
                highStrengthParam={loraPair.highStrengthParam}
                lowStrengthParam={loraPair.lowStrengthParam}
                strengthValue={valueStrength}
                highStrengthValue={highStrengthValue}
                lowStrengthValue={lowStrengthValue}
                onChangeHighStrength={
                  loraPair.highStrengthParam
                    ? changeHandlers.get(loraPair.highStrengthParam)
                    : undefined
                }
                onChangeLowStrength={
                  loraPair.lowStrengthParam
                    ? changeHandlers.get(loraPair.lowStrengthParam)
                    : undefined
                }
                disabled={false}
              />
            );
          },
        });
        return;
      }

      if (consumedParams.has(paramName)) return;

      entries.push({
        name: paramName,
        label: cfg.label,
        description: cfg.description,
        render: (currentForm) => {
          const form = currentForm || formDataRef.current || {};
          const liveProps = {
            name: paramName,
            label: cfg.label,
            description: cfg.description,
            value: form[paramName],
            defaultValue: cfg.defaultValue,
            disabled: false,
          };
          if (cfg.paramType === 'NUMBER') {
            return (
              <NumberInput
                key={`field-${paramName}-number-${spotlightRenderKey}`}
                {...liveProps}
                onChange={changeHandlers.get(paramName)}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                isFloat={true}
              />
            );
          }
          if (cfg.paramType === 'BOOLEAN') {
            return (
              <BooleanInput
                key={`field-${paramName}-bool-${spotlightRenderKey}`}
                {...liveProps}
                onChange={changeHandlers.get(paramName)}
              />
            );
          }
          if (cfg.paramType === 'DROPDOWN') {
            return (
              <DropdownInput
                key={`field-${paramName}-dropdown-${spotlightRenderKey}`}
                {...liveProps}
                workflowName={workflowName}
                onChange={changeHandlers.get(paramName)}
                options={cfg.choices || []}
              />
            );
          }
          return (
            <StringInput
              key={`field-${paramName}-string-${spotlightRenderKey}`}
              {...liveProps}
              aliasOptions={aliasOptions}
              aliasCatalog={aliasCatalog}
              onOpenComposer={onOpenComposer}
              onChange={changeHandlers.get(paramName)}
              onEnter={enterHandlers.get(paramName)}
              multiline={cfg.multiline}
            />
          );
        },
      });
    });
    return entries;
  }, [
    visibleInputs,
    loraPairByHighParam,
    consumedParams,
    spotlightRenderKey,
    workflowName,
    aliasOptions,
    aliasCatalog,
    onOpenComposer,
    handleValueChange,
    changeHandlers,
    enterHandlers,
    spotlightName,
    onCloseSpotlight,
  ]);

  const entryMap = useMemo(() => {
    const map = new Map();
    visibleEntries.forEach((e) => map.set(e.name, e));
    return map;
  }, [visibleEntries]);

  useEffect(() => {
    onVisibleParamsChange?.(visibleEntries.map((e) => e.name));
  }, [visibleEntries, onVisibleParamsChange]);

  const openSpotlightFor = useCallback(
    (targetName) => {
      const order = visibleEntries.map((e) => e.name);
      const entry = entryMap.get(targetName);
      if (!entry) return;
      const idx = order.indexOf(targetName);
      const prevName = idx > 0 ? order[idx - 1] : null;
      const nextName = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
      setSpotlightRenderKey((k) => k + 1);
      onSpotlight?.({
        name: targetName,
        label: entry.label,
        description: entry.description,
        render: (latestForm) => entry.render(latestForm || formDataRef.current),
        order,
        index: idx >= 0 ? idx : 0,
        total: order.length,
        onPrev: prevName ? () => openSpotlightFor(prevName) : null,
        onNext: nextName ? () => openSpotlightFor(nextName) : null,
      });
    },
    [entryMap, onSpotlight, visibleEntries]
  );

  return (
    <div className="settings-list">
      {visibleInputs.map((input) => {
        const cfg = resolveConfig(input);
        const paramName = cfg.paramName;

        // If this param is part of a LoRA pair, handle it only once via the highParam
        const loraPair = loraPairByHighParam.get(paramName);
        if (loraPair) {
          const cardCollapsed = compactControls
            ? collapsedCards[paramName] ?? true
            : !!collapsedCards[paramName];

          return (
            <LoraPairFieldRow
              key={`lora_pair_${loraPair.id || loraPair.highParam}`}
              paramName={paramName}
              cfg={cfg}
              formData={formData}
              loraPair={loraPair}
              collapsed={cardCollapsed}
              onToggle={toggleHandlers.get(paramName)}
              formatPreview={formatPreview}
              onChangeParam={handleValueChange}
              changeHandlers={changeHandlers}
            />
          );
        }

        // If this param is consumed by a LoRA pair (low/strength), skip it
        if (consumedParams.has(paramName)) {
          return null;
        }

        const cardCollapsed = compactControls
          ? collapsedCards[paramName] ?? true
          : !!collapsedCards[paramName];
        const previewValue = cardCollapsed ? formatPreview(cfg, formData[paramName]) : null;

        return (
          <ParamFieldRow
            key={paramName}
            paramName={paramName}
            cfg={cfg}
            formData={formData}
            workflowName={workflowName}
            spotlightName={spotlightName}
            spotlightRenderKey={spotlightRenderKey}
            aliasOptions={aliasOptions}
            aliasCatalog={aliasCatalog}
            onOpenComposer={onOpenComposer}
            changeHandlers={changeHandlers}
            enterHandlers={enterHandlers}
            collapsed={cardCollapsed}
            previewValue={previewValue}
            onToggle={toggleHandlers.get(paramName)}
          />
        );
      })}
    </div>
  );
}
