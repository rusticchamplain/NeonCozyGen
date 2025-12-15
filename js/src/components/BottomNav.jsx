// js/src/components/BottomNav.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useGalleryPending from '../hooks/useGalleryPending';
import { requeueLastRender, hasLastRenderPayload } from '../utils/globalRender';

const links = [
  { to: '/', label: 'Studio', icon: '🎨', end: true },
  { to: '/gallery', label: 'Gallery', icon: '🖼️' },
  { to: '/presets', label: 'Presets', icon: '✨' },
  { to: '/aliases', label: 'Aliases', icon: '🔖' },
  { to: '#render', label: 'Render', icon: '⚡', isAction: true },
];

const linkClass = ({ isActive }) =>
  [
    'bottom-nav-link',
    isActive ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

export default function BottomNav() {
  const location = useLocation();
  const galleryPending = useGalleryPending();
  const [flash, setFlash] = React.useState(false);
  const [isRendering, setIsRendering] = React.useState(false);

  // Check if we're on the Studio page
  const isOnStudio = location.pathname === '/' || location.pathname === '';

  const requestRender = async () => {
    if (typeof window === 'undefined') return;

    setFlash(true);
    setTimeout(() => setFlash(false), 400);

    if (isOnStudio) {
      // On Studio page: dispatch event for MainPage to handle
      try {
        window.dispatchEvent(new CustomEvent('cozygen:request-render'));
      } catch {
        // ignore
      }
    } else {
      // On other pages: re-queue the last render directly
      if (!hasLastRenderPayload()) {
        // No previous render available - could show a toast, but for now just flash
        return;
      }
      const result = await requeueLastRender();
      if (!result.success) {
        console.warn('Requeue failed:', result.error);
      }
    }
  };

  React.useEffect(() => {
    const handler = (evt) => {
      const active = !!evt?.detail?.active;
      setIsRendering(active);
      if (active) {
        setFlash(true);
        setTimeout(() => setFlash(false), 400);
      }
    };
    window.addEventListener('cozygen:render-state', handler);
    return () => window.removeEventListener('cozygen:render-state', handler);
  }, []);

  return (
    <nav className="bottom-nav md:hidden" aria-label="Bottom navigation">
      {links.map((link) => (
        link.isAction ? (
          <button
            key="render"
            type="button"
            className={`bottom-nav-link is-action ${flash ? 'is-flash' : ''} ${isRendering ? 'is-rendering' : ''}`}
            onClick={requestRender}
            aria-label="Render"
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              ⚡
            </span>
            <span className="bottom-nav-label">Render</span>
          </button>
        ) : (
          <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            <span className="bottom-nav-icon" aria-hidden="true">
              {link.icon}
            </span>
            <span className="bottom-nav-label">
              {link.label}
              {link.to === '/gallery' && galleryPending ? (
                <span className="badge-dot pulse" aria-hidden="true" />
              ) : null}
            </span>
          </NavLink>
        )
      ))}
    </nav>
  );
}
