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
    setViewerIndex((prevIndex) => {
      if (prevIndex === null || prevIndex === undefined) return prevIndex;
      if (prevIndex >= mediaItems.length) return mediaItems.length - 1;
      return prevIndex;
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
    setViewerIndex((prevIndex) => {
      if (prevIndex === null || prevIndex === undefined) return prevIndex;
      if (prevIndex >= mediaItems.length - 1) return prevIndex;
      return prevIndex + 1;
    });
  }, [mediaItems]);

  const prevItem = useCallback(() => {
    if (!mediaItems || !mediaItems.length) return;
    setViewerIndex((prevIndex) => {
      if (prevIndex === null || prevIndex === undefined) return prevIndex;
      if (prevIndex <= 0) return prevIndex;
      return prevIndex - 1;
    });
  }, [mediaItems]);

  const currentMedia =
    viewerIndex !== null &&
    viewerIndex !== undefined &&
    viewerIndex >= 0 &&
    mediaItems &&
    viewerIndex < mediaItems.length
      ? mediaItems[viewerIndex]
      : null;
  const total = mediaItems?.length || 0;
  const canPrev = viewerIndex !== null && viewerIndex > 0;
  const canNext = viewerIndex !== null && viewerIndex < total - 1;

  return {
    viewerOpen,
    viewerIndex,
    currentMedia,
    total,
    canPrev,
    canNext,
    open,
    close,
    next,
    prev: prevItem,
    setViewerOpen,
  };
}
