import { useEffect, useMemo, useRef, useState } from 'react';

const defaultViewport = () => {
  if (typeof window === 'undefined') return 800;
  return window.innerHeight || 800;
};

const resolveScrollParent = (node) => {
  if (!node || typeof window === 'undefined') return null;
  let current = node.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }
  return window;
};

export function useVirtualList({
  itemCount,
  enabled = true,
  estimateRowHeight = 72,
  overscan = 6,
  minItems = 80,
} = {}) {
  const containerRef = useRef(null);
  const rowHeightRef = useRef(estimateRowHeight);
  const [metrics, setMetrics] = useState({
    top: 0,
    scrollTop: 0,
    viewport: defaultViewport(),
    rowHeight: estimateRowHeight,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    const scrollParent = resolveScrollParent(el) || window;

    const updateMetrics = () => {
      const rect = el.getBoundingClientRect();
      const scrollOffset = scrollParent === window
        ? (window.scrollY || 0)
        : (scrollParent.scrollTop || 0);
      const parentRect = scrollParent === window
        ? { top: 0 }
        : scrollParent.getBoundingClientRect();
      const top = scrollParent === window
        ? rect.top + (window.scrollY || 0)
        : rect.top - parentRect.top + scrollOffset;
      const viewport = scrollParent === window
        ? window.innerHeight || 800
        : scrollParent.clientHeight || 800;

      setMetrics((prev) => {
        if (
          prev.top === top &&
          prev.scrollTop === scrollOffset &&
          prev.viewport === viewport &&
          prev.rowHeight === rowHeightRef.current
        ) {
          return prev;
        }
        return {
          top,
          scrollTop: scrollOffset,
          viewport,
          rowHeight: rowHeightRef.current,
        };
      });
    };

    updateMetrics();

    const ro = new ResizeObserver(() => updateMetrics());
    ro.observe(el);
    window.addEventListener('resize', updateMetrics);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const scrollOffset = scrollParent === window
          ? (window.scrollY || 0)
          : (scrollParent.scrollTop || 0);
        setMetrics((prev) => {
          if (
            prev.scrollTop === scrollOffset &&
            prev.rowHeight === rowHeightRef.current
          ) {
            return prev;
          }
          return {
            ...prev,
            scrollTop: scrollOffset,
            rowHeight: rowHeightRef.current,
          };
        });
      });
    };

    scrollParent.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateMetrics);
      scrollParent.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    let raf = 0;
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const sample = el.querySelector('[data-virtual-row="true"]');
      if (!sample) return;
      const rect = sample.getBoundingClientRect();
      const nextHeight = Math.max(24, Math.round(rect.height || 0));
      if (nextHeight && Math.abs(nextHeight - rowHeightRef.current) > 2) {
        rowHeightRef.current = nextHeight;
        setMetrics((prev) => ({ ...prev, rowHeight: nextHeight }));
      }
    };
    raf = window.requestAnimationFrame(measure);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [enabled, itemCount, metrics.scrollTop]);

  const virtualized = Boolean(enabled && itemCount > minItems);

  const { startIndex, endIndex, topSpacer, bottomSpacer } = useMemo(() => {
    if (!virtualized) {
      return {
        startIndex: 0,
        endIndex: itemCount,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }
    const rowHeight = metrics.rowHeight || estimateRowHeight;
    const relScroll = Math.max(0, metrics.scrollTop - metrics.top);
    const startRow = Math.max(0, Math.floor(relScroll / rowHeight) - overscan);
    const endRow = Math.min(
      itemCount,
      Math.ceil((relScroll + metrics.viewport) / rowHeight) + overscan
    );
    return {
      startIndex: startRow,
      endIndex: endRow,
      topSpacer: startRow * rowHeight,
      bottomSpacer: Math.max(0, (itemCount - endRow) * rowHeight),
    };
  }, [
    itemCount,
    metrics,
    overscan,
    estimateRowHeight,
    virtualized,
  ]);

  const isNearEnd = endIndex >= itemCount - Math.max(6, overscan * 2);

  return {
    containerRef,
    startIndex,
    endIndex,
    topSpacer,
    bottomSpacer,
    virtualized,
    isNearEnd,
  };
}
