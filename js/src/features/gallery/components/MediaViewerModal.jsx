// js/src/components/MediaViewerModal.jsx
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  deleteGalleryItem,
  getChoices,
  getDanbooruTagCategories,
  getGalleryPrompt,
  queuePrompt,
  searchDanbooruTags,
  storePromptRaw,
} from '../../../services/api';
import BottomSheet from '../../../ui/primitives/BottomSheet';
import Button from '../../../ui/primitives/Button';
import SegmentedTabs from '../../../ui/primitives/SegmentedTabs';
import Select from '../../../ui/primitives/Select';
import TokenStrengthSheet from '../../../ui/composites/TokenStrengthSheet';
import { useStudioContext } from '../../studio/contexts/StudioContext';
import { saveLastRenderPayload } from '../../workflow/utils/globalRender';
import {
  analyzePromptGraph,
  applyPromptOverrides,
  applyPromptTextOverrides,
  getPromptTargets,
} from '../../workflow/utils/promptOverrides';
import CollapsibleSection from '../../workflow/components/CollapsibleSection';
import AliasRow from '../../aliases/components/AliasRow';
import TagComposerRow from '../../composer/components/TagComposerRow';
import { formatAliasFriendlyName, formatCategoryLabel, formatSubcategoryLabel } from '../../../utils/aliasPresentation';
import { formatFileBaseName, isFilePathLike, splitFilePath } from '../../../utils/modelDisplay';
import { applyPromptAliases } from '../../../utils/promptAliases';
import { createPromptId } from '../../../utils/promptId';
import {
  formatTokenWeight,
  getElementWeight,
  parsePromptElements,
  reorderElements,
  removeElement,
  setElementWeight,
} from '../../../utils/tokenWeights';
import { IconAlias, IconEdit, IconGrip, IconTag } from '../../../ui/primitives/Icons';
import MediaViewerHeader from './MediaViewerHeader';
import MediaViewerMeta from './MediaViewerMeta';
import MediaViewerStage from './MediaViewerStage';

const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

const listItemVisibilityStyles = {
  contentVisibility: 'auto',
  containIntrinsicSize: '240px 120px',
};

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
  onDeleted,
  total = 0,
  canPrev = false,
  canNext = false,
  autoOpenRerunKey = '',
  onRerunAutoOpen,
}) {
  const {
    aliasCatalog = [],
    aliasLookup,
    aliasLoading,
    aliasError,
  } = useStudioContext();
  const overlayPointerDownRef = useRef(false);
  const closeButtonRef = useRef(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [rerunBusy, setRerunBusy] = useState(false);
  const [rerunSuccess, setRerunSuccess] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const contentRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const justOpenedRef = useRef(false);
  const justOpenedTimerRef = useRef(null);
  const [rerunOpen, setRerunOpen] = useState(false);
  const [rerunPicker, setRerunPicker] = useState(null);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const replaceReturnRef = useRef('rerun');
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
  const [promptTargets, setPromptTargets] = useState([]);
  const [promptRawMap, setPromptRawMap] = useState(null);
  const [promptDrafts, setPromptDrafts] = useState({});
  const [activePromptKey, setActivePromptKey] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [promptPanel, setPromptPanel] = useState('elements');
  const [promptEditMode, setPromptEditMode] = useState('replace');
  const [aliasDisplayMode, setAliasDisplayMode] = useState('alias');
  const [aliasSearch, setAliasSearch] = useState('');
  const deferredAliasSearch = useDeferredValue(aliasSearch);
  const [aliasCategory, setAliasCategory] = useState('All');
  const [aliasSubcategory, setAliasSubcategory] = useState('All');
  const [aliasVisibleCount, setAliasVisibleCount] = useState(30);
  const [aliasStatus, setAliasStatus] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const deferredTagQuery = useDeferredValue(tagQuery);
  const [tagCategory, setTagCategory] = useState('');
  const [tagSort, setTagSort] = useState('count');
  const [tagMinCount, setTagMinCount] = useState('');
  const [tagCategories, setTagCategories] = useState([]);
  const [tagItems, setTagItems] = useState([]);
  const [tagTotal, setTagTotal] = useState(0);
  const [tagOffset, setTagOffset] = useState(0);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagLoadingMore, setTagLoadingMore] = useState(false);
  const [tagError, setTagError] = useState('');
  const [tagStatus, setTagStatus] = useState('');
  const tagSearchAbortRef = useRef(null);
  const tagLoadAbortRef = useRef(null);
  const [strengthOpen, setStrengthOpen] = useState(false);
  const [strengthToken, setStrengthToken] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const tokensListRef = useRef(null);
  const touchStartRef = useRef(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState('');
  const [checkpointOptions, setCheckpointOptions] = useState([]);
  const [loraOptions, setLoraOptions] = useState([]);
  const promptRef = useRef(null);
  const choicesAbortRef = useRef(null);
  const autoOpenKeyRef = useRef('');

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
    setRerunOpen(false);
    setRerunPicker(null);
    setPromptEditorOpen(false);
    setReplaceTarget(null);
    replaceReturnRef.current = 'rerun';
    setRerunSuccess(false);
    setDeleteBusy(false);
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
    setPromptTargets([]);
    setPromptRawMap(null);
    setPromptDrafts({});
    setActivePromptKey('');
    setPromptInput('');
    setPromptPanel('elements');
    setPromptEditMode('replace');
    setAliasDisplayMode('alias');
    setAliasSearch('');
    setAliasCategory('All');
    setAliasSubcategory('All');
    setAliasVisibleCount(30);
    setAliasStatus('');
    setTagQuery('');
    setTagCategory('');
    setTagSort('count');
    setTagMinCount('');
    setTagCategories([]);
    setTagItems([]);
    setTagTotal(0);
    setTagOffset(0);
    setTagLoading(false);
    setTagLoadingMore(false);
    setTagError('');
    setTagStatus('');
    setStrengthOpen(false);
    setStrengthToken(null);
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
    if (touchStartRef.current?.timer) {
      clearTimeout(touchStartRef.current.timer);
      touchStartRef.current = null;
    }
    if (tagSearchAbortRef.current) {
      tagSearchAbortRef.current.abort();
      tagSearchAbortRef.current = null;
    }
    if (tagLoadAbortRef.current) {
      tagLoadAbortRef.current.abort();
      tagLoadAbortRef.current = null;
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
      if (touchStartRef.current?.timer) {
        clearTimeout(touchStartRef.current.timer);
        touchStartRef.current = null;
      }
      if (tagSearchAbortRef.current) {
        tagSearchAbortRef.current.abort();
        tagSearchAbortRef.current = null;
      }
      if (tagLoadAbortRef.current) {
        tagLoadAbortRef.current.abort();
        tagLoadAbortRef.current = null;
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
  const canDelete = hasMedia;
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
      const targets = getPromptTargets(prompt);
      const rawPromptData = data?.cozygen_prompt_raw;
      const rawMap = rawPromptData && typeof rawPromptData === 'object' ? rawPromptData : null;
      setPromptTargets(targets);
      setPromptRawMap(rawMap);
      if (targets.length) {
        const drafts = {};
        targets.forEach((target) => {
          const rawValue = rawMap && typeof rawMap[target.key] === 'string'
            ? rawMap[target.key]
            : target.text;
          drafts[target.key] = rawValue;
        });
        setPromptDrafts(drafts);
        setActivePromptKey((prev) => (prev && drafts[prev] ? prev : targets[0].key));
      } else {
        setPromptDrafts({});
        setActivePromptKey('');
      }
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

  const openRerunPanel = useCallback(async () => {
    if (!canRerun) return;
    setPromptEditorOpen(false);
    setRerunOpen(true);
    setMetaOpen(false);
    setReplaceTarget(null);
    setRerunPicker(null);
    setRerunSuccess(false);
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

  const toggleRerunPanel = useCallback(() => {
    if (!canRerun) return;
    if (rerunOpen) {
      setRerunOpen(false);
      setRerunPicker(null);
      return;
    }
    openRerunPanel();
  }, [canRerun, openRerunPanel, rerunOpen]);

  const handleToggleMeta = useCallback(() => {
    setRerunOpen(false);
    setRerunPicker(null);
    setMetaOpen((prev) => !prev);
  }, []);

  const openRerunPicker = useCallback((next) => {
    if (!next) return;
    setRerunPicker(next);
  }, []);

  const closeRerunPicker = useCallback(() => {
    setRerunPicker(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      autoOpenKeyRef.current = '';
      return;
    }
    if (!autoOpenRerunKey || !media?.filename) return;
    const mediaKey = `${media.subfolder || ''}|${media.filename}`;
    if (mediaKey !== autoOpenRerunKey) return;
    if (autoOpenKeyRef.current === mediaKey) return;
    autoOpenKeyRef.current = mediaKey;
    openRerunPanel();
    onRerunAutoOpen?.();
  }, [autoOpenRerunKey, isOpen, media?.filename, media?.subfolder, onRerunAutoOpen, openRerunPanel]);

  const openPromptEditor = useCallback(() => {
    setReplaceTarget(null);
    replaceReturnRef.current = 'rerun';
    setRerunOpen(false);
    setRerunPicker(null);
    setPromptEditMode('replace');
    setPromptEditorOpen(true);
  }, []);

  const openPromptEditorForAddTag = useCallback(() => {
    setReplaceTarget(null);
    replaceReturnRef.current = promptEditorOpen ? 'editor' : 'rerun';
    setPromptPanel('tags');
    setPromptEditMode('replace');
    setRerunOpen(false);
    setRerunPicker(null);
    setPromptEditorOpen(true);
  }, [promptEditorOpen]);

  const openPromptEditorForReplace = useCallback((element, displayName) => {
    if (!element) return;
    replaceReturnRef.current = promptEditorOpen ? 'editor' : 'rerun';
    setPromptPanel(element.type === 'alias' ? 'aliases' : 'tags');
    setReplaceTarget({
      element,
      displayName: displayName || element.text || '',
    });
    setPromptEditMode('replace');
    setRerunOpen(false);
    setRerunPicker(null);
    setPromptEditorOpen(true);
  }, [promptEditorOpen]);

  const closePromptEditor = useCallback(() => {
    setPromptEditorOpen(false);
    setReplaceTarget(null);
    setPromptPanel('elements');
    replaceReturnRef.current = 'rerun';
  }, []);

  const handleBackToRerun = useCallback(() => {
    setPromptEditorOpen(false);
    setReplaceTarget(null);
    setPromptPanel('elements');
    setMetaOpen(false);
    setRerunOpen(true);
    setRerunPicker(null);
    replaceReturnRef.current = 'rerun';
  }, []);

  const shouldParsePromptTargets = rerunOpen || promptEditorOpen;
  const shouldExpandAliases = aliasDisplayMode === 'raw' && aliasLookup?.size;
  const promptTargetsParsed = useMemo(() => {
    if (!shouldParsePromptTargets || !promptTargets.length) return [];
    return promptTargets
      .map((target) => {
        const draft = promptDrafts?.[target.key];
        const baseText = typeof draft === 'string' ? draft : target.text || '';
        const text = shouldExpandAliases
          ? applyPromptAliases(baseText, aliasLookup)
          : baseText;
        const elements = parsePromptElements(text || '');
        return { ...target, text, rawText: baseText, elements };
      });
  }, [promptTargets, promptDrafts, shouldParsePromptTargets, shouldExpandAliases, aliasLookup]);

  const promptTargetsAvailable = useMemo(
    () => promptTargetsParsed.filter((target) => String(target.text || '').trim().length > 0),
    [promptTargetsParsed]
  );

  useEffect(() => {
    if (!promptTargetsAvailable.length) {
      setActivePromptKey('');
      return;
    }
    const hasActive = promptTargetsAvailable.some((target) => target.key === activePromptKey);
    if (!hasActive) {
      setActivePromptKey(promptTargetsAvailable[0].key);
    }
  }, [promptTargetsAvailable, activePromptKey]);

  const activePromptTarget = useMemo(() => {
    if (!promptTargetsAvailable.length) return null;
    const match = promptTargetsAvailable.find((target) => target.key === activePromptKey);
    return match || promptTargetsAvailable[0];
  }, [promptTargetsAvailable, activePromptKey]);

  const promptText = activePromptTarget?.text || '';

  const promptTargetOptions = useMemo(
    () => (promptTargetsAvailable || []).map((target) => ({ value: target.key, label: target.label })),
    [promptTargetsAvailable]
  );

  const promptElements = activePromptTarget?.elements || [];
  const hasAliasElements = useMemo(
    () => promptElements.some((el) => el?.type === 'alias'),
    [promptElements]
  );
  const hasAliasTokens = useMemo(() => {
    if (hasAliasElements) return true;
    const activeKey = activePromptTarget?.key;
    if (!activeKey || !promptRawMap) return false;
    const rawValue = promptRawMap[activeKey];
    return typeof rawValue === 'string' && rawValue.includes('$');
  }, [activePromptTarget?.key, hasAliasElements, promptRawMap]);

  const promptPanelTabs = useMemo(() => ([
    { key: 'elements', label: 'Elements', icon: <IconEdit size={14} /> },
    { key: 'aliases', label: 'Aliases', icon: <IconAlias size={14} /> },
    { key: 'tags', label: 'Tags', icon: <IconTag size={14} /> },
  ]), []);
  const promptEditModeTabs = useMemo(() => ([
    { key: 'replace', label: 'Replace' },
    { key: 'strength', label: 'Strength' },
  ]), []);
  const aliasDisplayTabs = useMemo(() => ([
    { key: 'alias', label: 'Alias' },
    { key: 'raw', label: 'Raw' },
  ]), []);

  const promptEditorActive = promptEditorOpen;
  const replaceLabel = useMemo(() => {
    if (!replaceTarget?.element) return '';
    const element = replaceTarget.element;
    const display = replaceTarget.displayName || element.text || '';
    if (element.type === 'alias') {
      return `${display} • $${element.text}$`;
    }
    return display || element.text;
  }, [replaceTarget]);
  const promptInputLabel = replaceTarget ? 'Replace prompt element' : 'Add prompt element';
  const promptInputPlaceholder = replaceTarget ? 'Replace with tag or $alias$' : 'Add tag or $alias$';
  const promptEditHint = promptEditMode === 'strength'
    ? 'Tap an element to adjust strength'
    : 'Tap an element to replace it';
  const hasPromptTargets = promptTargetsAvailable.length > 0;
  const showPromptControls = promptTargetOptions.length > 1 || hasAliasTokens;
  const canEditPrompt = !promptLoading && !promptError && hasPromptTargets;

  const promptTagSet = useMemo(() => {
    const set = new Set();
    promptElements.forEach((el) => {
      if (el?.type !== 'tag') return;
      const key = String(el.text || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [promptElements]);

  const promptAliasSet = useMemo(() => {
    const set = new Set();
    promptElements.forEach((el) => {
      if (el?.type !== 'alias') return;
      const key = String(el.text || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [promptElements]);

  const aliasEntries = useMemo(() => {
    if (!Array.isArray(aliasCatalog)) return [];
    return aliasCatalog
      .map((entry) => {
        if (!entry) return null;
        const token = String(entry.token || entry.name || '').trim();
        if (!token) return null;
        const displayName = entry.displayName || formatAliasFriendlyName({ token, name: entry.name });
        return {
          ...entry,
          key: entry.key || token,
          token,
          displayName,
          subcategory: entry.subcategory || '',
        };
      })
      .filter(Boolean);
  }, [aliasCatalog]);

  const aliasDisplayLookup = useMemo(() => {
    const map = new Map();
    aliasEntries.forEach((entry) => {
      if (!entry?.token) return;
      const key = String(entry.token || '').trim().toLowerCase();
      if (!key) return;
      const displayName = entry.displayName || formatAliasFriendlyName({ token: entry.token, name: entry.name });
      if (displayName) map.set(key, displayName);
    });
    return map;
  }, [aliasEntries]);

  const aliasCategories = useMemo(() => {
    const set = new Set();
    aliasEntries.forEach((entry) => {
      const cat = String(entry.category || '').trim();
      if (cat) set.add(cat);
    });
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['All', ...sorted];
  }, [aliasEntries]);

  const aliasSubcategories = useMemo(() => {
    const set = new Set();
    aliasEntries.forEach((entry) => {
      if (aliasCategory !== 'All' && entry.category !== aliasCategory) return;
      const sub = String(entry.subcategory || '').trim();
      if (sub) set.add(sub);
    });
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['All', ...sorted];
  }, [aliasEntries, aliasCategory]);

  const filteredAliases = useMemo(() => {
    const term = String(deferredAliasSearch || '').trim().toLowerCase();
    return aliasEntries.filter((entry) => {
      if (aliasCategory !== 'All' && (entry.category || '') !== aliasCategory) return false;
      if (aliasSubcategory !== 'All' && (entry.subcategory || '') !== aliasSubcategory) return false;
      if (!term) return true;
      const display = String(entry.displayName || '').toLowerCase();
      const token = String(entry.token || '').toLowerCase();
      const text = String(entry.text || '').toLowerCase();
      return display.includes(term) || token.includes(term) || text.includes(term);
    });
  }, [aliasEntries, aliasCategory, aliasSubcategory, deferredAliasSearch]);

  const visibleAliases = useMemo(
    () => filteredAliases.slice(0, aliasVisibleCount),
    [filteredAliases, aliasVisibleCount]
  );

  const tagMinCountValue = useMemo(() => {
    const parsed = Number.parseInt(String(tagMinCount || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [tagMinCount]);

  const tagCategoryOptions = useMemo(() => {
    if (!Array.isArray(tagCategories)) return [];
    return tagCategories
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
          const key = item.trim();
          if (!key) return null;
          return { value: key, label: formatSubcategoryLabel(key) };
        }
        const key = String(item.key || '').trim();
        if (!key) return null;
        const count = Number(item.actual || item.count || 0);
        return { value: key, label: `${formatSubcategoryLabel(key)} (${count.toLocaleString()})` };
      })
      .filter(Boolean);
  }, [tagCategories]);

  useEffect(() => {
    setAliasSubcategory('All');
  }, [aliasCategory]);

  useEffect(() => {
    setAliasVisibleCount(30);
  }, [aliasCategory, aliasSubcategory, deferredAliasSearch]);

  useEffect(() => {
    if (!promptEditorActive || promptPanel !== 'tags') return undefined;
    if (tagCategories.length > 0) return undefined;
    let cancelled = false;
    getDanbooruTagCategories()
      .then((res) => {
        if (cancelled) return;
        setTagCategories(Array.isArray(res?.categories) ? res.categories : []);
      })
      .catch(() => {
        if (cancelled) return;
        setTagCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [promptEditorActive, promptPanel, tagCategories.length]);

  const searchTags = useCallback(async () => {
    if (!promptEditorActive || promptPanel !== 'tags') return;
    if (tagSearchAbortRef.current) {
      tagSearchAbortRef.current.abort();
    }
    if (tagLoadAbortRef.current) {
      tagLoadAbortRef.current.abort();
      tagLoadAbortRef.current = null;
    }
    const controller = new AbortController();
    tagSearchAbortRef.current = controller;

    try {
      setTagLoading(true);
      setTagError('');
      const res = await searchDanbooruTags(
        {
          q: deferredTagQuery,
          category: tagCategory,
          sort: tagSort,
          minCount: tagMinCountValue,
          limit: 40,
          offset: 0,
        },
        { signal: controller.signal }
      );
      const nextItems = Array.isArray(res?.items) ? res.items : [];
      setTagItems(nextItems);
      setTagTotal(Number(res?.total || 0));
      setTagOffset(nextItems.length);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setTagError('Unable to load tags right now.');
      setTagItems([]);
      setTagTotal(0);
      setTagOffset(0);
    } finally {
      setTagLoading(false);
    }
  }, [deferredTagQuery, promptEditorActive, promptPanel, tagCategory, tagMinCountValue, tagSort]);

  const loadMoreTags = useCallback(async () => {
    if (!promptEditorActive || promptPanel !== 'tags') return;
    if (tagLoading || tagLoadingMore) return;
    if (tagItems.length >= tagTotal) return;
    if (tagLoadAbortRef.current) {
      tagLoadAbortRef.current.abort();
    }
    const controller = new AbortController();
    tagLoadAbortRef.current = controller;

    try {
      setTagLoadingMore(true);
      const res = await searchDanbooruTags(
        {
          q: deferredTagQuery,
          category: tagCategory,
          sort: tagSort,
          minCount: tagMinCountValue,
          limit: 40,
          offset: tagOffset,
        },
        { signal: controller.signal }
      );
      const nextItems = Array.isArray(res?.items) ? res.items : [];
      setTagItems((prev) => [...prev, ...nextItems]);
      setTagTotal(Number(res?.total || 0));
      setTagOffset(tagOffset + nextItems.length);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setTagError('Unable to load more tags.');
    } finally {
      setTagLoadingMore(false);
    }
  }, [
    deferredTagQuery,
    promptEditorActive,
    promptPanel,
    tagCategory,
    tagItems.length,
    tagLoading,
    tagLoadingMore,
    tagMinCountValue,
    tagOffset,
    tagSort,
    tagTotal,
  ]);

  useEffect(() => {
    if (!promptEditorActive || promptPanel !== 'tags') return undefined;
    const handle = window.setTimeout(() => {
      searchTags();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [promptEditorActive, promptPanel, deferredTagQuery, tagCategory, tagSort, tagMinCountValue, searchTags]);

  useEffect(() => {
    if (promptPanel === 'elements') return;
    setDragIndex(null);
    setDropIndex(null);
  }, [promptPanel]);

  const updatePromptDraft = useCallback((updater) => {
    if (!activePromptTarget?.key) return;
    setPromptDrafts((prev) => {
      const existing = typeof prev?.[activePromptTarget.key] === 'string'
        ? prev[activePromptTarget.key]
        : (activePromptTarget.rawText || activePromptTarget.text || '');
      const base = shouldExpandAliases
        ? applyPromptAliases(existing, aliasLookup)
        : existing;
      const next = typeof updater === 'function' ? updater(base) : String(updater || '');
      if (next === base) return prev;
      return { ...prev, [activePromptTarget.key]: next };
    });
  }, [activePromptTarget, aliasLookup, shouldExpandAliases]);

  const applyPromptReplacement = useCallback((element, nextType, nextText) => {
    if (!element) return false;
    const normalized = String(nextText || '').trim();
    if (!normalized) return false;
    updatePromptDraft((current) => {
      const raw = typeof current === 'string' ? current : '';
      if (!raw) return raw;
      if (typeof element.start !== 'number' || typeof element.end !== 'number') return raw;
      const weightInfo = getElementWeight(raw, element);
      const cleaned = normalized.replace(/^\$|\$$/g, '');
      const core = nextType === 'alias' ? `$${cleaned}$` : cleaned;
      const replacement = weightInfo
        ? `(${core}:${formatTokenWeight(weightInfo.weight)})`
        : core;
      return raw.slice(0, element.start) + replacement + raw.slice(element.end);
    });
    return true;
  }, [updatePromptDraft]);

  const replacePromptElement = useCallback((nextType, nextText, statusLabel) => {
    const target = replaceTarget?.element;
    if (!target) return false;
    const normalized = String(nextText || '').trim();
    if (!normalized) return false;
    const replaced = applyPromptReplacement(target, nextType, normalized);
    if (!replaced) return false;
    setReplaceTarget(null);
    setStrengthOpen(false);
    setStrengthToken(null);
    if (nextType === 'alias') {
      setAliasStatus(`Replaced with ${statusLabel || normalized.replace(/^\$|\$$/g, '')}`);
    } else {
      setTagStatus(`Replaced with ${statusLabel || normalized.replace(/^\$|\$$/g, '')}`);
    }
    setPromptPanel('elements');
    if (replaceReturnRef.current === 'editor') {
      setPromptEditorOpen(true);
      setRerunOpen(false);
    } else {
      setPromptEditorOpen(false);
      setRerunOpen(true);
    }
    replaceReturnRef.current = 'rerun';
    return true;
  }, [
    replaceTarget,
    applyPromptReplacement,
    setStrengthOpen,
    setStrengthToken,
    setPromptPanel,
    setPromptEditorOpen,
    setRerunOpen,
  ]);

  const insertPromptText = useCallback((insertText) => {
    const text = String(insertText || '').trim();
    if (!text) return;
    updatePromptDraft((current) => {
      const trimmed = current.trim();
      if (!trimmed) return text;
      const base = trimmed.replace(/[\s,]*$/, '');
      return `${base}, ${text}`.trim();
    });
  }, [updatePromptDraft]);

  const handleAddPromptInput = useCallback(() => {
    const raw = String(promptInput || '').trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const first = parts[0];
    if (!first) return;
    if (replaceTarget?.element) {
      const aliasMatch = first.match(/^\$([a-z0-9_:-]+)\$$/i);
      if (aliasMatch) {
        replacePromptElement('alias', aliasMatch[1], aliasMatch[1]);
      } else {
        replacePromptElement('tag', first, first);
      }
      setPromptInput('');
      return;
    }
    const joined = parts.join(', ');
    if (!joined) return;
    insertPromptText(joined);
    setPromptInput('');
  }, [promptInput, insertPromptText, replacePromptElement, replaceTarget]);

  const handleInsertAlias = useCallback((token, displayName) => {
    const normalized = String(token || '').trim();
    if (!normalized) return;
    if (replaceTarget?.element) {
      replacePromptElement('alias', normalized, displayName || normalized);
      return;
    }
    const key = normalized.toLowerCase();
    if (promptAliasSet.has(key)) {
      setAliasStatus(`Already added: ${displayName || normalized}`);
      return;
    }
    insertPromptText(`$${normalized}$`);
    setAliasStatus(`Added: ${displayName || normalized}`);
  }, [insertPromptText, promptAliasSet, replacePromptElement, replaceTarget]);

  const handleInsertTag = useCallback((tag) => {
    const normalized = String(tag || '').trim();
    if (!normalized) return;
    if (replaceTarget?.element) {
      replacePromptElement('tag', normalized, normalized);
      return;
    }
    const key = normalized.toLowerCase();
    if (promptTagSet.has(key)) {
      setTagStatus(`Already added: ${normalized}`);
      return;
    }
    insertPromptText(normalized);
    setTagStatus(`Added: ${normalized}`);
  }, [insertPromptText, promptTagSet, replacePromptElement, replaceTarget]);

  useEffect(() => {
    if (!aliasStatus) return undefined;
    const handle = window.setTimeout(() => setAliasStatus(''), 1600);
    return () => window.clearTimeout(handle);
  }, [aliasStatus]);

  useEffect(() => {
    if (!tagStatus) return undefined;
    const handle = window.setTimeout(() => setTagStatus(''), 1600);
    return () => window.clearTimeout(handle);
  }, [tagStatus]);

  const openStrengthFor = useCallback((element, displayName) => {
    if (!element) return;
    const weightInfo = getElementWeight(promptText || '', element);
    const weight = weightInfo?.weight ?? 1;
    setStrengthToken({ element, displayName, weight });
    setStrengthOpen(true);
  }, [promptText]);

  const handleRemoveElement = useCallback((element) => {
    if (!element) return;
    updatePromptDraft((prev) => removeElement(prev || '', element));
    setStrengthOpen(false);
    setStrengthToken(null);
  }, [updatePromptDraft]);

  const handleReorderElements = useCallback((fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    updatePromptDraft((prev) => reorderElements(prev || '', promptElements, fromIdx, toIdx));
  }, [promptElements, updatePromptDraft]);

  const handleDragStart = (event, idx) => {
    setDragIndex(idx);
    setDropIndex(idx);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(idx));
    }
  };

  const handleDragOver = (event, idx) => {
    event.preventDefault();
    if (dragIndex === null || idx === dropIndex) return;
    setDropIndex(idx);
    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      handleReorderElements(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragLeave = () => {
    if (dropIndex !== null) setDropIndex(null);
  };

  const handleDrop = (event, idx) => {
    event.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      handleReorderElements(dragIndex, idx);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleTouchStart = useCallback((e, idx) => {
    const isHandle = e.target?.closest?.('.composer-token-drag-handle');
    if (!isHandle) return;
    const touch = e.touches[0];
    const timer = window.setTimeout(() => {
      if (!touchStartRef.current) return;
      touchStartRef.current.active = true;
      setDragIndex(idx);
      setDropIndex(idx);
    }, 240);

    touchStartRef.current = {
      idx,
      startX: touch.clientX,
      startY: touch.clientY,
      active: false,
      timer,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.startY);

    if (!touchStartRef.current.active) {
      if (deltaX > 8 || deltaY > 8) {
        window.clearTimeout(touchStartRef.current.timer);
        touchStartRef.current = null;
      }
      return;
    }

    e.preventDefault();

    const listNode = tokensListRef.current;
    const tokenElements = listNode
      ? listNode.querySelectorAll('.composer-token-draggable')
      : [];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    for (let i = 0; i < tokenElements.length; i += 1) {
      const rect = tokenElements[i].getBoundingClientRect();
      if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
        setDropIndex(i);
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current?.timer) {
      window.clearTimeout(touchStartRef.current.timer);
    }
    if (touchStartRef.current?.active && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      handleReorderElements(dragIndex, dropIndex);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, handleReorderElements]);

  const handleTouchCancel = useCallback(() => {
    if (touchStartRef.current?.timer) {
      window.clearTimeout(touchStartRef.current.timer);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, []);

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
      let nextPrompt = applyPromptOverrides(prompt, overrides);
      if (promptTargets.length) {
        nextPrompt = applyPromptTextOverrides(nextPrompt, promptTargets, promptDrafts, { mutate: true });
      }
      const rawPromptTargets = {};
      if (promptTargets.length) {
        promptTargets.forEach((target) => {
          const rawValue = promptDrafts?.[target.key];
          if (typeof rawValue === 'string' && /\$[a-z0-9_:-]+\$/i.test(rawValue)) {
            rawPromptTargets[target.key] = rawValue;
          }
        });
      }
      const promptId = createPromptId();
      if (Object.keys(rawPromptTargets).length) {
        try {
          await storePromptRaw({ promptId, promptRaw: rawPromptTargets });
        } catch {
          // ignore metadata storage failures
        }
      }
      let expandedPrompt = nextPrompt;
      if (aliasLookup && aliasLookup.size) {
        const expandValue = (value) => {
          if (typeof value === 'string') return applyPromptAliases(value, aliasLookup);
          if (Array.isArray(value)) return value.map((item) => expandValue(item));
          if (value && typeof value === 'object') {
            const next = Array.isArray(value) ? [] : {};
            Object.entries(value).forEach(([key, val]) => {
              next[key] = expandValue(val);
            });
            return next;
          }
          return value;
        };
        try {
          expandedPrompt = expandValue(nextPrompt);
        } catch {
          expandedPrompt = nextPrompt;
        }
      }
      saveLastRenderPayload({
        workflowName: media.filename || 'gallery',
        workflow: expandedPrompt,
        timestamp: Date.now(),
        promptRaw: Object.keys(rawPromptTargets).length ? rawPromptTargets : null,
      });
      await queuePrompt({ prompt: expandedPrompt, prompt_id: promptId });
      emitRenderState(false);

      // Show success state before closing
      setRerunSuccess(true);

      // Clear success state after a short beat
      setTimeout(() => {
        setRerunSuccess(false);
      }, 1500);
    } catch (err) {
      emitRenderState(false);
      if (err?.unauthorized) {
        window.location.hash = '#/login';
        return;
      }
      const message = err?.payload?.error || err?.message || 'Unable to tweak this item.';
      alert(message);
    } finally {
      setRerunBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!media?.filename) return;
    const ok = window.confirm('Delete this item? This cannot be undone.');
    if (!ok) return;
    setDeleteBusy(true);
    try {
      await deleteGalleryItem({ filename: media.filename, subfolder: media.subfolder || '' });
      onDeleted?.();
      onClose?.();
    } catch (err) {
      if (err?.unauthorized) {
        window.location.hash = '#/login';
        return;
      }
      const message = err?.payload?.error || err?.message || 'Unable to delete this item.';
      alert(message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const strengthSheet = (
    <TokenStrengthSheet
      open={strengthOpen}
      onClose={() => setStrengthOpen(false)}
      title={strengthToken?.element?.type === 'alias' ? 'Alias strength' : 'Tag strength'}
      tokenLabel={
        strengthToken
          ? strengthToken.element?.type === 'alias'
            ? `${strengthToken.displayName} • $${strengthToken.element?.text}$`
            : strengthToken.displayName
          : ''
      }
      weight={strengthToken?.weight ?? 1}
      onApply={(w) => {
        if (!strengthToken?.element) return;
        updatePromptDraft((prev) => setElementWeight(prev || '', strengthToken.element, w));
      }}
      onDeleteToken={() => {
        if (!strengthToken?.element) return;
        handleRemoveElement(strengthToken.element);
      }}
      onReplace={() => {
        if (!strengthToken?.element) return;
        openPromptEditorForReplace(strengthToken.element, strengthToken.displayName);
      }}
    />
  );

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
            className="react-modal-content media-viewer-dialog"
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
                rerunOpen={rerunOpen}
                canDelete={canDelete}
                deleteBusy={deleteBusy}
                metaRows={metaRows}
                metaOpen={metaOpen}
                onToggleMeta={handleToggleMeta}
                onToggleRerun={toggleRerunPanel}
                onDelete={handleDelete}
                onClose={onClose}
                closeButtonRef={closeButtonRef}
              />

              {metaOpen ? <MediaViewerMeta metaRows={metaRows} /> : null}
              {rerunOpen ? (
                <div className="media-viewer-info rerun-info" aria-label="Tweak options">
                  <div className="media-info-row rerun-info-row rerun-controls-row">
                    <span className="media-info-label">Seed & Size</span>
                    <div className="media-info-value rerun-info-value">
                      <CollapsibleSection
                        title="Adjust"
                        defaultOpen={false}
                        variant="bare"
                        className="rerun-collapsible"
                        bodyClassName="rerun-collapsible-body"
                      >
                        <div className="rerun-control-stack">
                          <div className="rerun-control-group">
                            <SegmentedTabs
                              ariaLabel="Seed mode"
                              value={seedMode}
                              onChange={setSeedMode}
                              size="sm"
                              layout="auto"
                              wrap
                              items={seedTabs}
                            />
                            {seedMode === 'custom' ? (
                              <input
                                type="number"
                                inputMode="numeric"
                                className="ui-control ui-input"
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
                            <div className="rerun-control-group">
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
                        </div>
                      </CollapsibleSection>
                    </div>
                  </div>
                  {promptInfo.hasCheckpoint ? (
                    <div className="media-info-row rerun-info-row">
                      <span className="media-info-label">Model</span>
                      <div className="media-info-value rerun-info-value">
                        <Button
                          variant="bare"
                          className="w-full justify-start text-left text-[0.8rem] whitespace-normal break-words"
                          onClick={() => openRerunPicker('model')}
                          aria-label="Change model"
                          aria-haspopup="dialog"
                          aria-expanded={rerunPicker === 'model'}
                        >
                          {checkpointOverride || checkpointLabel || '—'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="media-info-row rerun-info-row">
                    <span className="media-info-label">Prompt</span>
                    <div className="media-info-value rerun-info-value">
                      {promptLoading ? (
                        <div className="rerun-info-empty">Loading prompt…</div>
                      ) : null}
                      {promptError ? (
                        <div className="rerun-info-empty rerun-info-error">{promptError}</div>
                      ) : null}
                      {!promptLoading && !promptError && !hasPromptTargets ? (
                        <div className="rerun-info-empty">No prompt text found for this image.</div>
                      ) : null}
                      {canEditPrompt ? (
                        <>
                          {showPromptControls ? (
                            <div className="rerun-prompt-controls">
                              {promptTargetOptions.length > 1 ? (
                                <Select
                                  value={activePromptTarget?.key || ''}
                                  onChange={setActivePromptKey}
                                  aria-label="Prompt source"
                                  size="sm"
                                  wrapperClassName="rerun-select"
                                  options={promptTargetOptions}
                                />
                              ) : null}
                              {hasAliasTokens ? (
                                <SegmentedTabs
                                  ariaLabel="Alias display"
                                  value={aliasDisplayMode}
                                  onChange={setAliasDisplayMode}
                                  items={aliasDisplayTabs}
                                  size="sm"
                                  layout="auto"
                                  className="rerun-alias-toggle"
                                />
                              ) : null}
                            </div>
                          ) : null}
                          <div className="media-info-value is-prompt rerun-prompt-box" role="list">
                            <div className="ui-chip-row">
                              {promptElements.length
                                ? promptElements.map((el) => {
                                  const aliasKey = String(el.text || '').trim().toLowerCase();
                                  const aliasLabel = aliasDisplayLookup.get(aliasKey) || `$${el.text}$`;
                                  const expandedAlias = aliasLookup?.get(aliasKey);
                                  const expandedLabel = typeof expandedAlias === 'string' && expandedAlias.trim()
                                    ? expandedAlias
                                    : `$${el.text}$`;
                                  const tokenLabel = el.type === 'alias'
                                    ? (aliasDisplayMode === 'alias' ? aliasLabel : expandedLabel)
                                    : el.text;
                                  const editorLabel = el.type === 'alias'
                                    ? (formatAliasFriendlyName({ token: el.text }) || el.text)
                                    : el.text;
                                  const weightInfo = getElementWeight(promptText || '', el);
                                  const weight = weightInfo?.weight ?? 1;
                                  const showWeight = Math.abs(weight - 1) > 1e-6;
                                  return (
                                    <button
                                      key={`${el.type}-${el.text}-${el.start}`}
                                      type="button"
                                      className={`ui-chip is-clickable rerun-token max-w-full whitespace-normal leading-snug ${el.type === 'alias' ? 'is-accent' : ''}`}
                                      onClick={() => openPromptEditorForReplace(el, editorLabel)}
                                      title={el.type === 'alias' ? `Alias: $${el.text}$` : `Tag: ${el.text}`}
                                    >
                                      <span className="break-words">{tokenLabel}</span>
                                      {showWeight ? (
                                        <span className="rerun-chip-weight">{formatTokenWeight(weight)}×</span>
                                      ) : null}
                                    </button>
                                  );
                                })
                                : null}
                              <button
                                type="button"
                                className="ui-chip is-clickable rerun-token rerun-token-add"
                                onClick={openPromptEditorForAddTag}
                                aria-label="Add tag"
                                title="Add tag"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {promptInfo.hasLora ? (
                    <div className="media-info-row rerun-info-row">
                      <span className="media-info-label">LoRAs</span>
                      <div className="media-info-value rerun-info-value">
                        <Button
                          variant="bare"
                          className="w-full justify-start text-left text-[0.8rem] whitespace-normal break-words"
                          onClick={() => openRerunPicker('lora')}
                          aria-label="Change LoRA"
                          aria-haspopup="dialog"
                          aria-expanded={rerunPicker === 'lora'}
                        >
                          {loraOverride || (loraValues.length ? loraValues.join(', ') : '—')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="media-info-row rerun-info-row rerun-actions-row">
                    <span className="media-info-label">Run</span>
                    <div className="media-info-value rerun-info-value">
                      {rerunSuccess ? (
                        <div className="rerun-success">
                          <svg className="rerun-success-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Render queued successfully!
                        </div>
                      ) : (
                        <div className="rerun-actions">
                          <Button
                            variant="muted"
                            size="sm"
                            onClick={toggleRerunPanel}
                          >
                            Close
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleRerunWithOptions}
                            disabled={rerunBusy || promptLoading || !!promptError || !isSeedValid || !isSizeValid}
                          >
                            {rerunBusy ? 'Tweaking…' : 'Run'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

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
          open={promptEditorOpen}
          onClose={closePromptEditor}
          title="Edit prompt"
          variant="fullscreen"
          footer={(
            <div className="flex gap-2">
              <Button
                variant="muted"
                className="w-full"
                onClick={handleBackToRerun}
              >
                Back to tweak
              </Button>
            </div>
          )}
        >
          <div className="sheet-stack">
            {promptLoading ? (
              <div className="composer-alias-empty">Loading prompt…</div>
            ) : null}
            {promptError ? (
              <div className="text-xs text-[#FF8F70]">{promptError}</div>
            ) : null}
            {replaceTarget ? (
              <div className="sheet-section">
                <div className="sheet-label">Replacing</div>
                <div className="sheet-hint">{replaceLabel || '—'}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setReplaceTarget(null);
                      setPromptPanel('elements');
                    }}
                  >
                    Cancel replace
                  </Button>
                  <Button
                    size="xs"
                    variant="muted"
                    onClick={() => openStrengthFor(replaceTarget.element, replaceTarget.displayName)}
                  >
                    Adjust strength
                  </Button>
                  <div className="text-xs text-[#9DA3FFCC]">
                    Choose a replacement from Aliases or Tags. Selection returns to elements.
                  </div>
                </div>
              </div>
            ) : null}
            {!promptLoading && !promptError && hasPromptTargets ? (
              <>
                {promptTargetOptions.length > 1 ? (
                  <Select
                    value={activePromptTarget?.key || ''}
                    onChange={setActivePromptKey}
                    aria-label="Prompt source"
                    size="sm"
                    options={promptTargetOptions}
                  />
                ) : null}
                <SegmentedTabs
                  ariaLabel="Prompt element view"
                  value={promptPanel}
                  onChange={setPromptPanel}
                  items={promptPanelTabs}
                  size="sm"
                />
                {promptPanel === 'elements' ? (
                  <div className="composer-panel composer-panel-compose is-visible">
                    <div className="composer-editor">
                      <div className="composer-input-row">
                        <input
                          type="text"
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPromptInput();
                            }
                          }}
                          className="composer-input ui-control ui-input is-compact"
                          placeholder={promptInputPlaceholder}
                          aria-label={promptInputLabel}
                          disabled={!activePromptTarget}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleAddPromptInput}
                          disabled={!promptInput.trim() || !activePromptTarget}
                          aria-label={promptInputLabel}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="composer-tokens">
                      <div className="composer-tokens-header">
                        <span className="composer-tokens-label">
                          Elements
                          <span className="composer-tokens-count">{promptElements.length}</span>
                        </span>
                        <SegmentedTabs
                          ariaLabel="Element edit mode"
                          value={promptEditMode}
                          onChange={setPromptEditMode}
                          items={promptEditModeTabs}
                          size="sm"
                          layout="auto"
                          wrap
                        />
                      </div>
                      <span className="composer-tokens-hint">Drag handle to reorder · {promptEditHint}</span>
                      {promptElements.length ? (
                        <div
                          ref={tokensListRef}
                          className={`composer-tokens-list ${dragIndex !== null ? 'is-dragging' : ''}`}
                          style={{ '--composer-elements': promptElements.length }}
                        >
                          {promptElements.map((el, idx) => {
                            const displayName = el.type === 'alias'
                              ? (formatAliasFriendlyName({ token: el.text }) || el.text)
                              : el.text;
                            const weightInfo = getElementWeight(promptText || '', el);
                            const weight = weightInfo?.weight ?? 1;
                            const isDragging = dragIndex === idx;
                            const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;
                            return (
                              <span
                                key={`${el.type}-${el.text}-${el.start}`}
                                className={`composer-token composer-token-draggable ${el.type === 'alias' ? 'is-alias' : 'is-tag'} ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                                role="button"
                                tabIndex={0}
                                draggable
                                title={el.type === 'alias' ? `Alias: $${el.text}$` : `Tag: ${el.text}`}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, idx)}
                                onTouchStart={(e) => handleTouchStart(e, idx)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchCancel}
                                onClick={() => {
                                  if (dragIndex !== null) return;
                                  if (promptEditMode === 'strength') {
                                    openStrengthFor(el, displayName);
                                  } else {
                                    openPromptEditorForReplace(el, displayName);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.target !== e.currentTarget) return;
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (promptEditMode === 'strength') {
                                      openStrengthFor(el, displayName);
                                    } else {
                                      openPromptEditorForReplace(el, displayName);
                                    }
                                  }
                                }}
                              >
                                <span className="composer-token-order">{idx + 1}</span>
                                <span className="composer-token-drag-handle" aria-hidden="true">
                                  <IconGrip size={10} />
                                </span>
                                <span className="composer-token-name">{displayName}</span>
                                {el.type === 'alias' && <span className="composer-token-type">$</span>}
                                {Math.abs(weight - 1) > 1e-6 && (
                                  <span className="composer-token-weight">
                                    {formatTokenWeight(weight)}×
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="composer-empty">No elements yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}
                {promptPanel === 'aliases' ? (
                  <div className="composer-panel composer-panel-aliases is-visible">
                    <div className="composer-filters">
                      <div className="input-with-action">
                        <input
                          type="text"
                          value={aliasSearch}
                          onChange={(e) => setAliasSearch(e.target.value)}
                          placeholder="Search aliases…"
                          className="composer-search ui-control ui-input"
                          aria-label="Search aliases"
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setAliasSearch('')}
                          disabled={!aliasSearch}
                        >
                          Clear
                        </Button>
                      </div>
                      <Select
                        value={aliasCategory}
                        onChange={setAliasCategory}
                        wrapperClassName="composer-subcategory-select"
                        aria-label="Filter by category"
                        size="sm"
                        searchThreshold={0}
                        options={aliasCategories.map((c) => ({
                          value: c,
                          label: c === 'All' ? 'Category: All' : formatCategoryLabel(c),
                        }))}
                      />
                      {aliasSubcategories.length > 2 ? (
                        <Select
                          value={aliasSubcategory}
                          onChange={setAliasSubcategory}
                          wrapperClassName="composer-subcategory-select"
                          size="sm"
                          searchThreshold={0}
                          options={aliasSubcategories.map((c) => ({
                            value: c,
                            label: c === 'All' ? 'All subcategories' : formatSubcategoryLabel(c),
                          }))}
                        />
                      ) : null}
                    </div>
                    {aliasStatus ? (
                      <div className="composer-tag-collection-status" role="status">
                        {aliasStatus}
                      </div>
                    ) : null}
                    <div className="composer-alias-list" role="list">
                      {aliasLoading ? (
                        <div className="composer-alias-empty">Loading aliases…</div>
                      ) : aliasError ? (
                        <div className="composer-alias-empty">Unable to load aliases.</div>
                      ) : filteredAliases.length === 0 ? (
                        <div className="composer-alias-empty">No aliases found.</div>
                      ) : (
                        <>
                          {visibleAliases.map((entry) => (
                            <AliasRow
                              key={entry.key}
                              id={entry.key}
                              name={entry.name || entry.token}
                              category={entry.category}
                              text={entry.text}
                              isSelected={promptAliasSet.has(String(entry.token || '').toLowerCase())}
                              onOpen={() => handleInsertAlias(entry.token, entry.displayName)}
                              visibilityStyle={listItemVisibilityStyles}
                            />
                          ))}
                          {aliasVisibleCount < filteredAliases.length ? (
                            <Button
                              variant="muted"
                              className="w-full"
                              onClick={() => setAliasVisibleCount((prev) => prev + 30)}
                            >
                              Show more ({filteredAliases.length - aliasVisibleCount} left)
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
                {promptPanel === 'tags' ? (
                  <div className="composer-panel composer-panel-tags is-visible">
                    <div className="composer-filters">
                      <div className="input-with-action">
                        <input
                          type="search"
                          value={tagQuery}
                          onChange={(e) => setTagQuery(e.target.value)}
                          placeholder="Search tags… (e.g. smile, city, sword)"
                          className="composer-search ui-control ui-input"
                          aria-label="Search tags"
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setTagQuery('')}
                          disabled={!tagQuery}
                        >
                          Clear
                        </Button>
                      </div>
                      <Select
                        value={tagCategory}
                        onChange={setTagCategory}
                        wrapperClassName="composer-subcategory-select"
                        aria-label="Filter by category"
                        size="sm"
                        searchThreshold={0}
                        options={[
                          { value: '', label: 'Category: All' },
                          ...tagCategoryOptions,
                        ]}
                      />
                      <div className="composer-sort-row">
                        <Select
                          value={tagSort}
                          onChange={setTagSort}
                          wrapperClassName="composer-subcategory-select"
                          aria-label="Sort tags"
                          size="sm"
                          options={[
                            { value: 'count', label: 'Sort: Popular' },
                            { value: 'alpha', label: 'Sort: A–Z' },
                          ]}
                        />
                        <div className="composer-min-count">
                          <span className="composer-filter-divider" aria-hidden="true">|</span>
                          <label className="composer-min-count-label" htmlFor="rerun-min-count">
                            Minimum count
                          </label>
                          <input
                            id="rerun-min-count"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={tagMinCount}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === '' || Number(nextValue) >= 0) {
                                setTagMinCount(nextValue);
                              }
                            }}
                            className="ui-control ui-input is-compact composer-min-count-input"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {tagError ? <div className="composer-tags-error">{tagError}</div> : null}
                    {tagStatus ? (
                      <div className="composer-tag-collection-status" role="status">
                        {tagStatus}
                      </div>
                    ) : null}

                    <div className="composer-alias-list composer-tags-grid" role="list">
                      {tagLoading ? (
                        <div className="composer-alias-empty">Loading tags…</div>
                      ) : tagItems.length === 0 ? (
                        <div className="composer-alias-empty">No tags found.</div>
                      ) : (
                        <>
                          {tagItems.map((t) => (
                            <TagComposerRow
                              key={`${t.tag}-${t.category}`}
                              tag={t.tag}
                              category={t.category}
                              count={t.count}
                              isCollected={promptTagSet.has(String(t.tag || '').toLowerCase())}
                              onToggle={handleInsertTag}
                              visibilityStyle={listItemVisibilityStyles}
                            />
                          ))}
                          {tagItems.length < tagTotal ? (
                            <Button
                              variant="muted"
                              className="w-full"
                              onClick={loadMoreTags}
                              disabled={tagLoadingMore}
                            >
                              {tagLoadingMore ? 'Loading more…' : `Show more (${tagTotal - tagItems.length} left)`}
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            {!promptLoading && !promptError && !hasPromptTargets ? (
              <div className="text-xs text-[#9DA3FFCC]">
                No prompt text found for this image.
              </div>
            ) : null}
          </div>
        </BottomSheet>
        <BottomSheet
          open={rerunPicker === 'model'}
          onClose={closeRerunPicker}
          title="Select model"
        >
          <div className="sheet-stack">
            {choicesLoading ? (
              <div className="rerun-info-empty">Loading model choices…</div>
            ) : null}
            {choicesError ? (
              <div className="rerun-info-empty rerun-info-error">{choicesError}</div>
            ) : null}
            {showCheckpointFolder ? (
              <Select
                value={checkpointFolder}
                onChange={setCheckpointFolder}
                aria-label="Model folder filter"
                size="sm"
                searchThreshold={0}
                options={checkpointFolders.map((folder) => ({ value: folder, label: folder }))}
              />
            ) : null}
            <Select
              value={checkpointOverride}
              onChange={setCheckpointOverride}
              aria-label="Model selection"
              size="sm"
              searchThreshold={0}
              options={[
                { value: '', label: checkpointDisplay ? `Keep current (${checkpointDisplay})` : 'Keep current' },
                ...checkpointOptionsWithValue,
              ]}
            />
          </div>
        </BottomSheet>
        <BottomSheet
          open={rerunPicker === 'lora'}
          onClose={closeRerunPicker}
          title="Select LoRA"
        >
          <div className="sheet-stack">
            {choicesLoading ? (
              <div className="rerun-info-empty">Loading LoRA choices…</div>
            ) : null}
            {choicesError ? (
              <div className="rerun-info-empty rerun-info-error">{choicesError}</div>
            ) : null}
            {showLoraFolder ? (
              <Select
                value={loraFolder}
                onChange={setLoraFolder}
                aria-label="LoRA folder filter"
                size="sm"
                searchThreshold={0}
                options={loraFolders.map((folder) => ({ value: folder, label: folder }))}
              />
            ) : null}
            <Select
              value={loraOverride}
              onChange={setLoraOverride}
              aria-label="LoRA selection"
              size="sm"
              searchThreshold={0}
              options={[
                { value: '', label: loraDisplay ? `Keep current (${loraDisplay})` : 'Keep current' },
                ...loraOptionsWithValue,
              ]}
            />
          </div>
        </BottomSheet>
        {strengthSheet}
      </>,
      document.body
    )
  );
}
