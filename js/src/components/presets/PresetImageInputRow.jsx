import { useRef, useState } from 'react';
import { useImagePicker } from '../../hooks/useImagePicker';
import ImagePickerSheet from '../ImagePickerSheet';

export default function PresetImageInputRow({ input, value, onFormChange }) {
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
    pickerSource,
    setPickerSource,
    handleUpload,
    clearImage,
    selectServer,
  } = useImagePicker({ input, value, onFormChange });

  const fileRef = useRef(null);
  const [fileKey, setFileKey] = useState(0);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
    if (fileRef.current) fileRef.current.value = '';
    setFileKey((k) => k + 1);
  };

  const triggerBrowse = () => fileRef.current?.click();

  return (
    <div className="preset-image-row">
      <input
        key={fileKey}
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="preset-image-thumb">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={param}
            className={imgReady ? 'opacity-100' : 'opacity-0'}
            onLoad={() => setImgReady(true)}
          />
        ) : (
          <span>{param?.slice(0, 1) || 'I'}</span>
        )}
      </div>
      <div className="preset-image-info">
        <div className="preset-image-name">{param}</div>
        <div className="preset-image-hint">
          {value ? value : displayName || 'No file selected'}
        </div>
      </div>
      <div className="preset-image-actions">
        <button type="button" className="preset-image-action" onClick={triggerBrowse}>
          Upload
        </button>
        <button type="button" className="preset-image-action" onClick={openServer}>
          Server
        </button>
        {value ? (
          <button type="button" className="preset-image-action is-clear" onClick={clearImage}>
            Clear
          </button>
        ) : null}
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
        pickerSource={pickerSource}
        setPickerSource={setPickerSource}
        onSelect={selectServer}
        onClose={closeServer}
      />
    </div>
  );
}
