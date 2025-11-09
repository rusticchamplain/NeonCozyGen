// js/src/components/MediaViewerModal.jsx
import React from 'react';
import Modal from 'react-modal';

Modal.setAppElement('#root');

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

export default function MediaViewerModal({
  isOpen,
  media,
  onClose,
  onPrev,
  onNext,
}) {
  if (!media) return null;

  const url = mediaUrl(media);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="react-modal-overlay"
      className="react-modal-content"
      contentLabel="Preview"
    >
      <div className="flex flex-col h-full bg-[#050716] text-[#F8F4FF] border border-[#3EF0FF33] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[#3D4270] bg-[#050716F2]">
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-medium truncate">
              {media.filename}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#9DA3FFCC]">
              {media.subfolder || 'root collection'}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="hidden sm:inline-flex px-2 py-1 rounded-full border border-[#3D4270] text-[11px] hover:bg-[#111325]"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onNext}
              className="hidden sm:inline-flex px-2 py-1 rounded-full border border-[#3D4270] text-[11px] hover:bg-[#111325]"
            >
              →
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-full border border-[#3D4270] text-[11px] hover:bg-[#111325]"
            >
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-full border border-[#3D4270] text-[11px] hover:bg-[#111325]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-3 flex items-center justify-center bg-[#050716]">
          {isVideo(media.filename) ? (
            <video
              src={url}
              controls
              className="max-w-full max-h-[calc(100vh-160px)] rounded-xl shadow-[0_0_26px_rgba(0,0,0,0.8)]"
              autoPlay
            />
          ) : (
            <img
              src={url}
              alt={media.filename}
              className="max-w-full max-h-[calc(100vh-160px)] rounded-xl shadow-[0_0_26px_rgba(0,0,0,0.8)]"
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
