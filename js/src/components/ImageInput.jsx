// js/src/components/ImageInput.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useImagePicker } from '../hooks/useImagePicker';
import ImagePickerSheet from './ImagePickerSheet';

export default function ImageInput({ input, value, onFormChange }) {
  const {
    param,
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
    <div className="rounded-2xl border border-[#2A2E4A] bg-[#050716] p-3 sm:p-4 shadow-[0_0_22px_rgba(5,7,22,0.8)]">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs sm:text-sm font-semibold text-[#F8F4FF]">
          {param}
        </h3>
        <span className="text-[10px] sm:text-xs text-[#9DA3FFCC] truncate">
          {displayName}
        </span>
      </div>

      {/* preview / drop zone */}
      <div
        ref={dropRef}
        className="mb-3 rounded-xl border border-dashed border-[#3D4270] bg-[#050716] flex items-center justify-center min-h-[120px] sm:min-h-[160px] overflow-hidden"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={displayName}
            className={`max-h-64 max-w-full object-contain transition-opacity ${
              imgReady ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImgReady(true)}
          />
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
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={triggerBrowse}
            className="rounded-lg border border-[#3D4270] bg-[#050716] px-3 py-1.5 text-[11px] text-[#C3C7FF] text-center hover:border-[#3EF0FF80]"
          >
            Browse…
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#3D4270] bg-[#050716] px-3 py-1.5 text-[11px] text-[#C3C7FF] text-center hover:border-[#3EF0FF80]"
            onClick={openServer}
          >
            From Server
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#9DA3FFCC] pr-2">
            Tip: “From Server” opens your last folder. Drag &amp; drop is
            supported.
          </p>
          <button
            type="button"
            className="text-[11px] text-[#FF9BEA] hover:underline flex-shrink-0"
            onClick={clearImage}
          >
            Clear
          </button>
        </div>
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
    </div>
  );
}
