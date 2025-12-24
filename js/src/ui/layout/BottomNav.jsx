// js/src/components/BottomNav.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useGalleryPending from '../../features/gallery/hooks/useGalleryPending';
import { requeueLastRender, hasLastRenderPayload } from '../../features/workflow/utils/globalRender';
import { IconGallery, IconEdit, IconControls, IconRender, IconFolderOpen } from '../primitives/Icons';

const navLinks = [
  { to: '/controls', label: 'Controls', Icon: IconControls },
  { to: '/compose', label: 'Compose', Icon: IconEdit },
  { to: '/gallery', label: 'Gallery', Icon: IconGallery },
  { to: '/library', label: 'Library', Icon: IconFolderOpen },
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

  // Check if we're on the Controls/Compose pages
  const isOnControls = location.pathname === '/controls';
  const isOnComposer = location.pathname === '/compose';

  const requestRender = async () => {
    if (typeof window === 'undefined') return;
    if (isRendering) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 400);

    if (isOnControls || isOnComposer) {
      // On Controls/Compose pages: dispatch event for render handler
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
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {navLinks.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
          <span className="bottom-nav-icon" aria-hidden="true">
            <link.Icon size={20} />
          </span>
          <span className="bottom-nav-label">
            {link.label}
            {link.to === '/gallery' && galleryPending ? (
              <span className="badge-dot pulse" aria-hidden="true" />
            ) : null}
          </span>
        </NavLink>
      ))}
      <button
        key="render"
        type="button"
        className={`bottom-nav-link is-action ${flash ? 'is-flash' : ''} ${isRendering ? 'is-rendering' : ''}`}
        onClick={requestRender}
        aria-label="Render"
        aria-busy={isRendering}
        aria-disabled={isRendering}
        disabled={isRendering}
      >
        <span className="bottom-nav-icon" aria-hidden="true">
          <IconRender size={20} />
        </span>
        <span className="bottom-nav-label">Render</span>
      </button>
    </nav>
  );
}
