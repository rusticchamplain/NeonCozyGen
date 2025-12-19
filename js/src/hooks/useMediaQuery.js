import { useEffect, useState } from 'react';

export default function useMediaQuery(query, defaultState = false) {
  const getMatch = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return defaultState;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [query]);

  return matches;
}
