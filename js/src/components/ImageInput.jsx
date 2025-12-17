// js/src/components/ImageInput.jsx
import { useEffect, useRef, useState } from 'react';
import { useImagePicker } from '../hooks/useImagePicker';
import ImagePickerSheet from './ImagePickerSheet';
import UrlViewerSheet from './ui/UrlViewerSheet';

export default function ImageInput({ input, value, onFormChange }) {
  const {
    previewUrl,
    imgReady,
    setImgReady,
    displayName,

    serverOpen,
    openServer,
    closeServer,

    cwd,
    setCwd,
    page,
    setPage,
    perPage,
    setPerPage,
    totalPages,
    topDirs,
    loading,
    search,
    setSearch,
    imagesOnly,
    setImagesOnly,
    shownEntries,

    // NEW: which source the picker is browsing (inputs vs outputs)
    pickerSource,
    setPickerSource,

    handleUpload,
    clearImage,
    selectServer,
  } = useImagePicker({ input, value, onFormChange });

  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const [fileKey, setFileKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  // drag & drop upload
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const drop = async (e) => {
      stop(e);
      const f = e.dataTransfer?.files?.[0];
      if (f) {
        await handleUpload(f);
        if (fileRef.current) fileRef.current.value = '';
        setFileKey((k) => k + 1);
      }
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) =>
      el.addEventListener(evt, evt === 'drop' ? drop : stop)
    );
    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) =>
        el.removeEventListener(evt, evt === 'drop' ? drop : stop)
      );
    };
  }, [handleUpload]);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await handleUpload(f);
    if (fileRef.current) fileRef.current.value = '';
    setFileKey((k) => k + 1);
  };

  const triggerBrowse = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  return (
    <div className="asset-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#F8F4FF] truncate">
          {displayName}
        </h3>
        <span className="text-[11px] text-[#C3C7FFB3] truncate">
          Image
        </span>
      </div>

      {/* preview / drop zone */}
      <div
        ref={dropRef}
        className="mb-3 rounded-xl border border-dashed border-[#3D4270] bg-[#0b1226] flex items-center justify-center min-h-[140px] sm:min-h-[180px] overflow-hidden"
      >
        {previewUrl ? (
          <button
            type="button"
            className="asset-preview-btn"
            onClick={() => setPreviewOpen(true)}
            aria-label={`Preview ${displayName}`}
            title="Open preview"
          >
            <img
              src={previewUrl}
              alt={displayName}
              className={`max-h-64 max-w-full object-contain transition-opacity ${
                imgReady ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgReady(true)}
            />
          </button>
        ) : (
          <div className="text-[11px] text-[#9DA3FFCC] text-center px-6">
            Drop an image here, upload from your device, or choose one from
            your server.
          </div>
        )}
      </div>

      {/* hidden native file input */}
      <input
        key={fileKey}
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="ui-button is-primary is-compact"
          onClick={openServer}
        >
          Choose
        </button>
        <button
          type="button"
          className="ui-button is-muted is-compact"
          onClick={triggerBrowse}
        >
          Upload
        </button>
        <button
          type="button"
          className="ui-button is-ghost is-compact"
          onClick={clearImage}
        >
          Clear
        </button>
      </div>

      <ImagePickerSheet
        open={serverOpen}
        cwd={cwd}
        setCwd={setCwd}
        page={page}
        setPage={setPage}
        perPage={perPage}
        setPerPage={setPerPage}
        totalPages={totalPages}
        topDirs={topDirs}
        loading={loading}
        imagesOnly={imagesOnly}
        setImagesOnly={setImagesOnly}
        search={search}
        setSearch={setSearch}
        shownEntries={shownEntries}
        // NEW: pass source toggle down into the sheet
        pickerSource={pickerSource}
        setPickerSource={setPickerSource}
        onSelect={selectServer}
        onClose={closeServer}
      />

      <UrlViewerSheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={displayName || 'Preview'}
        url={previewUrl}
        kind="image"
      />
    </div>
  );
}
