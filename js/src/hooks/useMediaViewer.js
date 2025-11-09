// js/src/hooks/useMediaViewer.js
import { useCallback, useEffect, useState } from 'react';

export function useMediaViewer(mediaItems) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);

  // keep index sane when mediaItems change
  useEffect(() => {
    if (!mediaItems || mediaItems.length === 0) {
      setViewerIndex(null);
      setViewerOpen(false);
      return;
    }
    setViewerIndex((prev) => {
      if (prev == null) return prev;
      if (prev >= mediaItems.length) return mediaItems.length - 1;
      return prev;
    });
  }, [mediaItems]);

  const open = useCallback(
    (item) => {
      if (!mediaItems || !mediaItems.length || !item) return;
      const idx = mediaItems.indexOf(item);
      if (idx === -1) return;
      setViewerIndex(idx);
      setViewerOpen(true);
    },
    [mediaItems]
  );

  const close = useCallback(() => {
    setViewerOpen(false);
    setViewerIndex(null);
  }, []);

  const next = useCallback(() => {
    if (!mediaItems || !mediaItems.length) return;
    setViewerIndex((prev) => {
      if (prev == null) return prev;
      return (prev + 1) % mediaItems.length;
    });
  }, [mediaItems]);

  const prev = useCallback(() => {
    if (!mediaItems || !mediaItems.length) return;
    setViewerIndex((prev) => {
      if (prev == null) return prev;
      return (prev - 1 + mediaItems.length) % mediaItems.length;
    });
  }, [mediaItems]);

  const currentMedia =
    viewerIndex != null &&
    viewerIndex >= 0 &&
    mediaItems &&
    viewerIndex < mediaItems.length
      ? mediaItems[viewerIndex]
      : null;

  return {
    viewerOpen,
    viewerIndex,
    currentMedia,
    open,
    close,
    next,
    prev,
    setViewerOpen,
  };
}

