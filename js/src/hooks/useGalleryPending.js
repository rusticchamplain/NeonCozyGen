// js/src/hooks/useGalleryPending.js
import { useEffect, useState } from 'react';

/**
 * Tracks whether new gallery items are pending viewing.
 * Driven by localStorage key `cozygen_gallery_pending` and custom events:
 * - `cozygen:gallery-pending` (set pending)
 * - `cozygen:gallery-viewed` (clear pending)
 */
export function useGalleryPending() {
  const [pending, setPending] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('cozygen_gallery_pending') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handlePending = () => setPending(true);
    const handleViewed = () => setPending(false);
    const handleStorage = (event) => {
      if (event.key === 'cozygen_gallery_pending') {
        setPending(event.newValue === '1');
      }
    };

    window.addEventListener('cozygen:gallery-pending', handlePending);
    window.addEventListener('cozygen:gallery-viewed', handleViewed);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('cozygen:gallery-pending', handlePending);
      window.removeEventListener('cozygen:gallery-viewed', handleViewed);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return pending;
}

export default useGalleryPending;
