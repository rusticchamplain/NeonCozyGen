// js/src/components/BottomNav.jsx
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useGalleryPending from '../hooks/useGalleryPending';
import { requeueLastRender, hasLastRenderPayload } from '../utils/globalRender';
import { IconGallery, IconTag, IconAlias, IconEdit, IconControls, IconRender } from './Icons';

const navLinks = [
  { to: '/controls', label: 'Controls', Icon: IconControls },
  { to: '/compose', label: 'Compose', Icon: IconEdit },
  { to: '/gallery', label: 'Gallery', Icon: IconGallery },
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
  const navigate = useNavigate();
  const galleryPending = useGalleryPending();
  const [flash, setFlash] = React.useState(false);
  const [isRendering, setIsRendering] = React.useState(false);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [popoverStyle, setPopoverStyle] = React.useState({});
  const popoverRef = React.useRef(null);
  const libraryButtonRef = React.useRef(null);

  // Check if we're on the Studio page
  const isOnControls = location.pathname === '/controls';

  const requestRender = async () => {
    if (typeof window === 'undefined') return;

    setFlash(true);
    setTimeout(() => setFlash(false), 400);

    if (isOnControls) {
      // On Controls page: dispatch event for MainPage to handle
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

  React.useEffect(() => {
    if (!libraryOpen) return undefined;
    const handleClick = (event) => {
      if (popoverRef.current && popoverRef.current.contains(event.target)) return;
      if (libraryButtonRef.current && libraryButtonRef.current.contains(event.target)) return;
      setLibraryOpen(false);
    };
    window.addEventListener('pointerdown', handleClick);
    return () => window.removeEventListener('pointerdown', handleClick);
  }, [libraryOpen]);

  React.useEffect(() => {
    if (!libraryOpen || !libraryButtonRef.current) return;
    const rect = libraryButtonRef.current.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const bottom = window.innerHeight - rect.top + 8;
    setPopoverStyle({
      left: `${Math.min(window.innerWidth - 80, Math.max(40, left))}px`,
      bottom: `${bottom}px`,
    });
  }, [libraryOpen]);

  return (
    <>
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
          key="library"
          ref={libraryButtonRef}
          type="button"
          className="bottom-nav-link"
          onClick={() => setLibraryOpen((prev) => !prev)}
          aria-expanded={libraryOpen}
          aria-label="Open library"
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            <IconTag size={20} />
          </span>
          <span className="bottom-nav-label">Library</span>
        </button>
        <button
          key="render"
          type="button"
          className={`bottom-nav-link is-action ${flash ? 'is-flash' : ''} ${isRendering ? 'is-rendering' : ''}`}
          onClick={requestRender}
          aria-label="Render"
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            <IconRender size={20} />
          </span>
          <span className="bottom-nav-label">Render</span>
        </button>
      </nav>
      <div
        ref={popoverRef}
        className={`library-popover ${libraryOpen ? 'is-open' : ''}`}
        style={popoverStyle}
      >
        <button
          type="button"
          className="library-popover-btn"
          onClick={() => {
            setLibraryOpen(false);
            navigate('/aliases');
          }}
        >
          <IconAlias size={18} />
          <span>Aliases</span>
        </button>
        <button
          type="button"
          className="library-popover-btn"
          onClick={() => {
            setLibraryOpen(false);
            navigate('/tags');
          }}
        >
          <IconTag size={18} />
          <span>Tags</span>
        </button>
      </div>
    </>
  );
}
