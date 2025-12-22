// js/src/components/MediaViewerModal.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getChoices, getGalleryPrompt, queuePrompt } from '../../../services/api';
import BottomSheet from '../../../ui/primitives/BottomSheet';
import SegmentedTabs from '../../../ui/primitives/SegmentedTabs';
import Select from '../../../ui/primitives/Select';
import { saveLastRenderPayload } from '../../workflow/utils/globalRender';
import { analyzePromptGraph, applyPromptOverrides } from '../../workflow/utils/promptOverrides';
import { formatFileBaseName, isFilePathLike, splitFilePath } from '../../../utils/modelDisplay';
import MediaViewerHeader from './MediaViewerHeader';
import MediaViewerMeta from './MediaViewerMeta';
import MediaViewerStage from './MediaViewerStage';

const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

const mediaUrl = (item) => {
  if (!item) return '';
  const filename = item.filename || '';
  const subfolder = item.subfolder || '';
  const type = item.type || 'output';
  const v = item.mtime ? `&v=${encodeURIComponent(String(item.mtime))}` : '';
  return `/view?filename=${encodeURIComponent(
    filename
  )}&subfolder=${encodeURIComponent(
    subfolder
  )}&type=${encodeURIComponent(type)}${v}`;
};

const getFileMeta = (value) => {
  if (!isFilePathLike(value)) return null;
  const { folderPath, base } = splitFilePath(value);
  return {
    folderPath: folderPath || 'root',
    base: base || '',
  };
};

const getFolderLabel = (folderPath = '') => {
  if (!folderPath || folderPath === 'root') return 'root';
  const parts = folderPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || folderPath;
};

export default function MediaViewerModal({
  isOpen,
  media,
  onClose,
  onPrev,
  onNext,
  total = 0,
  canPrev = false,
  canNext = false,
}) {
  const overlayPointerDownRef = useRef(false);
  const closeButtonRef = useRef(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [rerunBusy, setRerunBusy] = useState(false);
  const [rerunSuccess, setRerunSuccess] = useState(false);
  const contentRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const justOpenedRef = useRef(false);
  const justOpenedTimerRef = useRef(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [seedMode, setSeedMode] = useState('random');
  const [seedInput, setSeedInput] = useState('');
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [checkpointOverride, setCheckpointOverride] = useState('');
  const [loraOverride, setLoraOverride] = useState('');
  const [checkpointFolder, setCheckpointFolder] = useState('All');
  const [loraFolder, setLoraFolder] = useState('All');
  const [promptInfo, setPromptInfo] = useState({
    hasSeed: false,
    hasCheckpoint: false,
    hasLora: false,
    checkpoint: '',
    loras: [],
    hasSize: false,
    width: null,
    height: null,
  });
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState('');
  const [checkpointOptions, setCheckpointOptions] = useState([]);
  const [loraOptions, setLoraOptions] = useState([]);
  const promptRef = useRef(null);
  const choicesAbortRef = useRef(null);

  const getFocusable = (root) => {
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft' && canPrev) onPrev?.();
      if (e.key === 'ArrowRight' && canNext) onNext?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, onNext, onPrev, canPrev, canNext]);

  useEffect(() => {
    if (!isOpen) return;
    setMetaOpen(false);
    setOptionsOpen(false);
    setRerunSuccess(false);
    setSeedMode('random');
    setSeedInput('');
    setWidthInput('');
    setHeightInput('');
    setCheckpointOverride('');
    setLoraOverride('');
    setCheckpointFolder('All');
    setLoraFolder('All');
    setPromptInfo({
      hasSeed: false,
      hasCheckpoint: false,
      hasLora: false,
      checkpoint: '',
      loras: [],
      hasSize: false,
      width: null,
      height: null,
    });
    setPromptLoading(false);
    setPromptError('');
    setChoicesLoading(false);
    setChoicesError('');
    setCheckpointOptions([]);
    setLoraOptions([]);
    promptRef.current = null;
    if (choicesAbortRef.current) {
      choicesAbortRef.current.abort();
      choicesAbortRef.current = null;
    }
    justOpenedRef.current = true;
    if (justOpenedTimerRef.current) {
      clearTimeout(justOpenedTimerRef.current);
    }
    justOpenedTimerRef.current = setTimeout(() => {
      justOpenedRef.current = false;
      justOpenedTimerRef.current = null;
    }, 250);
  }, [isOpen, media]);

  useEffect(() => {
    return () => {
      if (justOpenedTimerRef.current) {
        clearTimeout(justOpenedTimerRef.current);
        justOpenedTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (typeof document === 'undefined') return undefined;
    const contentEl = contentRef.current;
    lastFocusedRef.current = document.activeElement;

    const focusInitial = () => {
      const focusables = getFocusable(contentEl);
      const target = closeButtonRef.current || focusables[0] || contentEl;
      target?.focus?.();
    };

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (!contentEl) return;
      const focusables = getFocusable(contentEl);
      if (!focusables.length) {
        e.preventDefault();
        contentEl.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    requestAnimationFrame(focusInitial);
    contentEl?.addEventListener('keydown', onKeyDown);

    return () => {
      contentEl?.removeEventListener('keydown', onKeyDown);
      const lastFocused = lastFocusedRef.current;
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus?.();
      }
    };
  }, [isOpen]);

  const hasMedia = Boolean(media);
  const url = media ? mediaUrl(media) : '';
  const locationLabel = media?.subfolder || 'Gallery';
  const isClip = isVideo(media?.filename || '');
  const showNav = total > 1;
  const meta = media?.meta || {};
  const metaRows = [
    meta?.model ? { label: 'Model', value: meta.model } : null,
    meta?.prompt ? { label: 'Prompt', value: meta.prompt, isPrompt: true } : null,
    Array.isArray(meta?.loras) && meta.loras.length
      ? { label: 'LoRAs', value: meta.loras.join(', ') }
      : null,
  ].filter(Boolean);
  const hasPromptMeta = Boolean(media?.meta?.has_prompt || metaRows.length);
  const isPng = typeof media?.filename === 'string' && media.filename.toLowerCase().endsWith('.png');
  const canRerun = hasMedia && hasPromptMeta && isPng;
  const seedTabs = useMemo(() => ([
    { key: 'random', label: 'Random' },
    { key: 'keep', label: 'Keep' },
    { key: 'custom', label: 'Custom' },
  ]), []);
  const customSeedValue = useMemo(() => {
    if (seedMode !== 'custom') return null;
    const parsed = parseInt(String(seedInput), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [seedInput, seedMode]);
  const isSeedValid = seedMode !== 'custom' || customSeedValue !== null;
  const widthValue = useMemo(() => {
    if (!String(widthInput || '').trim()) return null;
    const parsed = parseInt(String(widthInput), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [widthInput]);
  const heightValue = useMemo(() => {
    if (!String(heightInput || '').trim()) return null;
    const parsed = parseInt(String(heightInput), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [heightInput]);
  const isSizeValid =
    (!String(widthInput || '').trim() || widthValue !== null)
    && (!String(heightInput || '').trim() || heightValue !== null);
  const widthInvalid = Boolean(String(widthInput || '').trim()) && widthValue === null;
  const heightInvalid = Boolean(String(heightInput || '').trim()) && heightValue === null;
  const checkpointLabel = promptInfo.checkpoint || meta?.model || '';
  const loraValues = Array.isArray(promptInfo.loras) ? promptInfo.loras : [];
  const checkpointDisplay = checkpointLabel ? formatFileBaseName(checkpointLabel) : '';
  const loraDisplay = loraValues.length
    ? loraValues.map((value) => formatFileBaseName(value)).join(', ')
    : '';

  const checkpointMeta = useMemo(
    () =>
      (checkpointOptions || []).map((opt) => {
        const value = String(opt || '');
        return { value, meta: getFileMeta(value) };
      }),
    [checkpointOptions]
  );
  const loraMeta = useMemo(
    () =>
      (loraOptions || []).map((opt) => {
        const value = String(opt || '');
        return { value, meta: getFileMeta(value) };
      }),
    [loraOptions]
  );

  const checkpointFolders = useMemo(() => {
    const set = new Set(['All']);
    checkpointMeta.forEach(({ meta }) => {
      if (meta?.folderPath) set.add(meta.folderPath);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [checkpointMeta]);
  const loraFolders = useMemo(() => {
    const set = new Set(['All']);
    loraMeta.forEach(({ meta }) => {
      if (meta?.folderPath) set.add(meta.folderPath);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [loraMeta]);
  const showCheckpointFolder = checkpointFolders.length > 2;
  const showLoraFolder = loraFolders.length > 2;

  useEffect(() => {
    if (!showCheckpointFolder) {
      if (checkpointFolder !== 'All') setCheckpointFolder('All');
      return;
    }
    if (!checkpointFolders.includes(checkpointFolder)) {
      setCheckpointFolder('All');
    }
  }, [checkpointFolder, checkpointFolders, showCheckpointFolder]);

  useEffect(() => {
    if (!showLoraFolder) {
      if (loraFolder !== 'All') setLoraFolder('All');
      return;
    }
    if (!loraFolders.includes(loraFolder)) {
      setLoraFolder('All');
    }
  }, [loraFolder, loraFolders, showLoraFolder]);

  const checkpointBaseCounts = useMemo(() => {
    const map = new Map();
    checkpointMeta.forEach(({ meta }) => {
      if (!meta?.base) return;
      const key = meta.base.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [checkpointMeta]);
  const loraBaseCounts = useMemo(() => {
    const map = new Map();
    loraMeta.forEach(({ meta }) => {
      if (!meta?.base) return;
      const key = meta.base.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [loraMeta]);

  const checkpointSelectOptions = useMemo(() => {
    const items = [];
    const disambiguate = showCheckpointFolder && checkpointFolder === 'All';
    checkpointMeta.forEach(({ value, meta }) => {
      if (!meta) {
        items.push({ value, label: value });
        return;
      }
      if (showCheckpointFolder && checkpointFolder !== 'All' && meta.folderPath !== checkpointFolder) return;
      let label = meta.base || formatFileBaseName(value) || value;
      if (disambiguate && meta.base) {
        const key = meta.base.toLowerCase();
        if (checkpointBaseCounts.get(key) > 1) {
          label = `${label} (${getFolderLabel(meta.folderPath)})`;
        }
      }
      items.push({ value, label });
    });
    return items;
  }, [checkpointMeta, checkpointFolder, checkpointBaseCounts, showCheckpointFolder]);

  const loraSelectOptions = useMemo(() => {
    const items = [];
    const disambiguate = showLoraFolder && loraFolder === 'All';
    loraMeta.forEach(({ value, meta }) => {
      if (!meta) {
        items.push({ value, label: value });
        return;
      }
      if (showLoraFolder && loraFolder !== 'All' && meta.folderPath !== loraFolder) return;
      let label = meta.base || formatFileBaseName(value) || value;
      if (disambiguate && meta.base) {
        const key = meta.base.toLowerCase();
        if (loraBaseCounts.get(key) > 1) {
          label = `${label} (${getFolderLabel(meta.folderPath)})`;
        }
      }
      items.push({ value, label });
    });
    return items;
  }, [loraMeta, loraFolder, loraBaseCounts, showLoraFolder]);

  const hasCheckpointInFiltered = useMemo(() => {
    if (!checkpointOverride) return true;
    return checkpointSelectOptions.some((opt) => String(opt.value) === String(checkpointOverride));
  }, [checkpointSelectOptions, checkpointOverride]);
  const hasLoraInFiltered = useMemo(() => {
    if (!loraOverride) return true;
    return loraSelectOptions.some((opt) => String(opt.value) === String(loraOverride));
  }, [loraSelectOptions, loraOverride]);

  const checkpointOptionsWithValue = useMemo(() => {
    if (!checkpointOverride || hasCheckpointInFiltered) return checkpointSelectOptions;
    return [
      { value: checkpointOverride, label: formatFileBaseName(String(checkpointOverride)) },
      ...checkpointSelectOptions,
    ];
  }, [checkpointOverride, hasCheckpointInFiltered, checkpointSelectOptions]);

  const loraOptionsWithValue = useMemo(() => {
    if (!loraOverride || hasLoraInFiltered) return loraSelectOptions;
    return [
      { value: loraOverride, label: formatFileBaseName(String(loraOverride)) },
      ...loraSelectOptions,
    ];
  }, [loraOverride, hasLoraInFiltered, loraSelectOptions]);

  const loadChoices = useCallback(async (info) => {
    const needsCheckpoint = info?.hasCheckpoint;
    const needsLora = info?.hasLora;
    if (!needsCheckpoint && !needsLora) return;
    if (choicesAbortRef.current) {
      choicesAbortRef.current.abort();
    }
    const controller = new AbortController();
    choicesAbortRef.current = controller;
    setChoicesLoading(true);
    setChoicesError('');
    try {
      const [checkpoints, loras] = await Promise.all([
        needsCheckpoint && !checkpointOptions.length
          ? getChoices('checkpoints', { signal: controller.signal })
          : null,
        needsLora && !loraOptions.length
          ? getChoices('loras', { signal: controller.signal })
          : null,
      ]);
      if (checkpoints?.choices) {
        setCheckpointOptions(checkpoints.choices);
      }
      if (loras?.choices) {
        setLoraOptions(loras.choices);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setChoicesError('Unable to load model choices right now.');
    } finally {
      if (choicesAbortRef.current === controller) {
        choicesAbortRef.current = null;
      }
      setChoicesLoading(false);
    }
  }, [checkpointOptions.length, loraOptions.length]);

  const loadPromptGraph = useCallback(async () => {
    if (!media) {
      throw new Error('media_missing');
    }
    if (promptRef.current) {
      return { prompt: promptRef.current, info: promptInfo };
    }
    setPromptLoading(true);
    setPromptError('');
    try {
      const data = await getGalleryPrompt({
        filename: media.filename,
        subfolder: media.subfolder || '',
      });
      const prompt = data?.prompt;
      if (!prompt) {
        throw new Error('prompt_missing');
      }
      const info = analyzePromptGraph(prompt);
      promptRef.current = prompt;
      setPromptInfo(info);
      return { prompt, info };
    } catch (err) {
      const message = err?.payload?.error || err?.message || 'Unable to load prompt metadata.';
      setPromptError(message);
      throw err;
    } finally {
      setPromptLoading(false);
    }
  }, [media?.filename, media?.subfolder, promptInfo]);

  const handleOpenOptions = useCallback(async () => {
    if (!canRerun) return;
    setOptionsOpen(true);
    setCheckpointFolder('All');
    setLoraFolder('All');
    try {
      const result = await loadPromptGraph();
      const info = result?.info;
      setWidthInput((prev) => {
        if (String(prev || '').trim()) return prev;
        return info?.width !== null && info?.width !== undefined ? String(info.width) : '';
      });
      setHeightInput((prev) => {
        if (String(prev || '').trim()) return prev;
        return info?.height !== null && info?.height !== undefined ? String(info.height) : '';
      });
      await loadChoices(result?.info);
    } catch {
      // handled by state
    }
  }, [canRerun, loadChoices, loadPromptGraph]);

  const emitRenderState = (active) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('cozygen:render-state', { detail: { active } }));
    } catch {
      // ignore
    }
  };

  const handleRerunWithOptions = async () => {
    if (!media || rerunBusy || !canRerun) return;
    if (!isSeedValid) {
      alert('Enter a valid seed value.');
      return;
    }
    if (!isSizeValid) {
      alert('Enter valid width and height values.');
      return;
    }
    setRerunBusy(true);
    emitRenderState(true);
    try {
      const { prompt } = await loadPromptGraph();
      const overrides = {
        seedMode,
        seedValue: seedMode === 'custom' ? customSeedValue : null,
        checkpoint: checkpointOverride || null,
        lora: loraOverride || null,
        width: widthValue,
        height: heightValue,
      };
      const nextPrompt = applyPromptOverrides(prompt, overrides);
      saveLastRenderPayload({
        workflowName: media.filename || 'gallery',
        workflow: nextPrompt,
        timestamp: Date.now(),
      });
      await queuePrompt({ prompt: nextPrompt });
      emitRenderState(false);

      // Show success state before closing
      setRerunSuccess(true);

      // Smoothly close after showing success feedback
      setTimeout(() => {
        setOptionsOpen(false);
        setRerunSuccess(false);
      }, 1500);
    } catch (err) {
      emitRenderState(false);
      if (err?.unauthorized) {
        window.location.hash = '#/login';
        return;
      }
      const message = err?.payload?.error || err?.message || 'Unable to re-run this item.';
      alert(message);
    } finally {
      setRerunBusy(false);
    }
  };

  if (!media) return null;
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return (
    createPortal(
      <>
        <div
          className="react-modal-overlay"
          role="presentation"
          onPointerDown={(e) => {
            overlayPointerDownRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (!overlayPointerDownRef.current) return;
            if (e.target !== e.currentTarget) return;
            if (justOpenedRef.current) return;
            onClose?.();
          }}
        >
          <div
            className="react-modal-content"
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-label="Preview"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className="media-viewer-panel">
              <MediaViewerHeader
                filename={media.filename}
                locationLabel={locationLabel}
                isClip={isClip}
                url={url}
                canRerun={canRerun}
                rerunBusy={rerunBusy}
                metaRows={metaRows}
                metaOpen={metaOpen}
                onToggleMeta={() => setMetaOpen((prev) => !prev)}
                onOpenOptions={handleOpenOptions}
                onClose={onClose}
                closeButtonRef={closeButtonRef}
              />

              {metaOpen ? <MediaViewerMeta metaRows={metaRows} /> : null}

              <MediaViewerStage
                showNav={showNav}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={onPrev}
                onNext={onNext}
                isClip={isClip}
                url={url}
                filename={media.filename}
              />
            </div>
          </div>
        </div>
        <BottomSheet
          open={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          title="Re-run options"
          footer={
            rerunSuccess ? (
              <div className="fade-in flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#44E1C5]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Render queued successfully!
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ui-button is-muted w-full"
                  onClick={() => setOptionsOpen(false)}
                  disabled={rerunBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ui-button is-primary w-full"
                  onClick={handleRerunWithOptions}
                  disabled={rerunBusy || promptLoading || !!promptError || !isSeedValid || !isSizeValid}
                >
                  {rerunBusy ? 'Re-running…' : 'Run'}
                </button>
              </div>
            )
          }
        >
          <div className="sheet-stack">
            {promptLoading ? (
              <div className="composer-alias-empty">Loading prompt…</div>
            ) : null}
            {promptError ? (
              <div className="text-xs text-[#FF8F70]">{promptError}</div>
            ) : null}
            <div className="sheet-section">
              <div className="sheet-label">Seed</div>
              <SegmentedTabs
                ariaLabel="Seed mode"
                value={seedMode}
                onChange={setSeedMode}
                size="sm"
                items={seedTabs}
              />
              {seedMode === 'custom' ? (
                <input
                  type="number"
                  inputMode="numeric"
                  className="ui-control ui-input mt-2"
                  placeholder="Enter seed"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              ) : null}
              <div className="sheet-hint text-xs text-[#9DA3FFCC]">
                {seedMode === 'random' ? 'Randomize each run' : 'Keep or customize the seed used in the prompt.'}
              </div>
            </div>
            {promptInfo.hasSize ? (
              <div className="sheet-section">
                <div className="sheet-label">Size</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className="ui-control ui-input flex-1"
                    placeholder="Width"
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    aria-label="Width"
                    aria-invalid={widthInvalid}
                  />
                  <span className="text-xs text-[#9DA3FF99]" aria-hidden="true">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className="ui-control ui-input flex-1"
                    placeholder="Height"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    aria-label="Height"
                    aria-invalid={heightInvalid}
                  />
                </div>
              </div>
            ) : null}
            {promptInfo.hasCheckpoint ? (
              <div className="sheet-section">
                <div className="sheet-label">Checkpoint</div>
                {showCheckpointFolder ? (
                  <Select
                    value={checkpointFolder}
                    onChange={setCheckpointFolder}
                    className="sheet-select"
                    aria-label="Checkpoint folder filter"
                    size="sm"
                    options={checkpointFolders.map((folder) => ({ value: folder, label: folder }))}
                  />
                ) : null}
                <Select
                  value={checkpointOverride}
                  onChange={setCheckpointOverride}
                  className={`sheet-select ${showCheckpointFolder ? 'mt-2' : ''}`}
                  aria-label="Checkpoint override"
                  size="sm"
                  options={[
                    { value: '', label: checkpointDisplay ? `Keep current (${checkpointDisplay})` : 'Keep current' },
                    ...checkpointOptionsWithValue,
                  ]}
                />
              </div>
            ) : null}
            {promptInfo.hasLora ? (
              <div className="sheet-section">
                <div className="sheet-label">LoRA</div>
                {showLoraFolder ? (
                  <Select
                    value={loraFolder}
                    onChange={setLoraFolder}
                    className="sheet-select"
                    aria-label="LoRA folder filter"
                    size="sm"
                    options={loraFolders.map((folder) => ({ value: folder, label: folder }))}
                  />
                ) : null}
                <Select
                  value={loraOverride}
                  onChange={setLoraOverride}
                  className={`sheet-select ${showLoraFolder ? 'mt-2' : ''}`}
                  aria-label="LoRA override"
                  size="sm"
                  options={[
                    { value: '', label: loraDisplay ? `Keep current (${loraDisplay})` : 'Keep current' },
                    ...loraOptionsWithValue,
                  ]}
                />
              </div>
            ) : null}
            {choicesLoading ? (
              <div className="text-xs text-[#9DA3FFCC]">Loading model choices…</div>
            ) : null}
            {choicesError ? (
              <div className="text-xs text-[#FF8F70]">{choicesError}</div>
            ) : null}
          </div>
        </BottomSheet>
      </>,
      document.body
    )
  );
}
