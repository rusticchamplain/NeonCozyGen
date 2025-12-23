// js/src/components/ImagePickerSheet.jsx
import { inputFileUrl, outputFileUrl } from '../hooks/useImagePicker';
import BottomSheet from '../../../ui/primitives/BottomSheet';
import Button from '../../../ui/primitives/Button';
import SegmentedTabs from '../../../ui/primitives/SegmentedTabs';
import Select from '../../../ui/primitives/Select';

export default function ImagePickerSheet({
  open,
  cwd,
  setCwd,
  page,
  setPage,
  perPage,
  setPerPage,
  totalPages,
  topDirs,
  loading,
  imagesOnly,
  setImagesOnly,
  search,
  setSearch,
  shownEntries,
  onSelect,
  onClose,

  // NEW: which logical source we’re browsing (inputs vs outputs)
  // expected values: 'inputs' | 'outputs'
  pickerSource,
  setPickerSource,
}) {
  if (!open) return null;

  const effectiveSource = pickerSource || 'inputs';
  const hasSourceToggle = typeof setPickerSource === 'function';

  const handleRootClick = () => {
    setCwd('');
    setPage(1);
  };

  const switchSource = (nextSource) => {
    if (!hasSourceToggle) return;
    if (nextSource === effectiveSource) return;
    setPickerSource(nextSource);
    setCwd('');
    setPage(1);
  };

  const parts = cwd.split('/').filter(Boolean);
  const title = effectiveSource === 'outputs' ? 'Choose output' : 'Choose input';
  const quickItems = [
    { key: '', label: 'Root' },
    ...topDirs.map((d) => ({ key: d.rel_path, label: d.name })),
  ];

  const handleQuickSelect = (nextKey) => {
    setCwd(nextKey);
    setPage(1);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      variant="fullscreen"
      footer={(
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="muted"
            className="w-full"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <div className="text-xs text-center text-[rgba(159,178,215,0.75)] min-w-[92px]">
            {page} / {totalPages}
          </div>
          <Button
            variant="muted"
            className="w-full"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
          >
            Next
          </Button>
        </div>
      )}
    >
      <div className="sheet-stack">
        <div className="sheet-section">
          <div className="sheet-label">Location</div>
          <div className="imagepicker-breadcrumb">
            <button type="button" className="imagepicker-crumb" onClick={handleRootClick}>
              Root
            </button>
            {parts.map((seg, idx) => {
              const path = parts.slice(0, idx + 1).join('/');
              return (
                <button
                  key={path}
                  type="button"
                  className="imagepicker-crumb"
                  onClick={() => {
                    setCwd(path);
                    setPage(1);
                  }}
                >
                  {seg}
                </button>
              );
            })}
          </div>
        </div>

        {hasSourceToggle ? (
          <div className="sheet-section">
            <div className="sheet-label">Source</div>
            <SegmentedTabs
              ariaLabel="Source"
              value={effectiveSource}
              onChange={switchSource}
              size="sm"
              items={[
                { key: 'inputs', label: 'Inputs' },
                { key: 'outputs', label: 'Outputs' },
              ]}
            />
          </div>
        ) : null}

        <div className="sheet-section">
          <div className="sheet-label">Filters</div>
          <div className="composer-filters">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={imagesOnly}
                onChange={(e) => {
                  setImagesOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <span className="text-sm text-[rgba(159,178,215,0.85)]">Images only</span>
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="sheet-input ui-control ui-input"
              aria-label="Search files"
            />
            <Select
              value={perPage}
              onChange={(value) => {
                const n = parseInt(value, 10) || 50;
                setPerPage(n);
                setPage(1);
              }}
              aria-label="Items per page"
              size="sm"
              options={[25, 50, 100]}
            />
          </div>
        </div>

        {topDirs.length > 0 ? (
          <div className="sheet-section">
            <div className="sheet-label">Quick folders</div>
            <SegmentedTabs
              ariaLabel="Quick folders"
              value={cwd}
              onChange={handleQuickSelect}
              size="sm"
              layout="auto"
              wrap
              className="imagepicker-chips"
              items={quickItems}
            />
          </div>
        ) : null}

        <div className="sheet-section">
          <div className="sheet-label">Results</div>
          {loading ? (
            <div className="sheet-hint">
              Scanning {effectiveSource === 'outputs' ? 'output' : 'input'} folders…
            </div>
          ) : shownEntries.length === 0 ? (
            <div className="sheet-hint">
              Nothing here yet. Try a different folder or turn off “Images only”.
            </div>
          ) : null}

          <div className="imagepicker-grid">
            {!loading &&
              shownEntries.map((it) => {
                const key = `${it.source || 'input'}::${it.rel_path || it.name}`;
                const thumbSrc = it.is_dir
                  ? ''
                  : it.preview_url ||
                    (it.source === 'output'
                      ? outputFileUrl({
                          filename: it.filename,
                          subfolder: it.subfolder,
                          type: it.type,
                        })
                      : inputFileUrl(it.rel_path || ''));

                return (
                  <button
                    key={key}
                    type="button"
                    className={`imagepicker-item ${it.is_dir ? 'is-dir' : ''}`}
                    onClick={() => {
                      if (it.is_dir) {
                        setCwd(it.rel_path || '');
                        setPage(1);
                      } else {
                        onSelect(it);
                      }
                    }}
                  >
                    {it.is_dir ? (
                      <div className="imagepicker-dir-row">
                        <div className="imagepicker-dir-dot" aria-hidden="true" />
                        <div className="imagepicker-name">{it.name}</div>
                      </div>
                    ) : (
                      <>
                        <div className="imagepicker-thumb">
                          {thumbSrc ? (
                            <img className="imagepicker-img" alt={it.name} src={thumbSrc} />
                          ) : (
                            <div className="imagepicker-img is-placeholder" />
                          )}
                        </div>
                        <div className="imagepicker-name">{it.name}</div>
                      </>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
