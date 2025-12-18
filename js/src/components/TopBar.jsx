// js/src/components/TopBar.jsx

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import '../styles/mobile-helpers.css';
import useGalleryPending from '../hooks/useGalleryPending';
import { useAuth } from '../hooks/useAuth';
import { hasLastRenderPayload, requeueLastRender } from '../utils/globalRender';
import {
  LogoMark,
  IconStudio,
  IconGallery,
  IconTag,
  IconRender,
  IconLogout,
} from './Icons';

const PRIMARY_LINKS = [
  { to: '/', label: 'Studio', Icon: IconStudio, end: true },
];

const SECONDARY_LINKS = [
  { to: '/gallery', label: 'Gallery', Icon: IconGallery },
  { to: '/aliases', label: 'Aliases', Icon: IconTag },
];

const navLinkClasses = ({ isActive }) =>
  ['slim-nav-link btn-touch', isActive ? 'is-active' : null].filter(Boolean).join(' ');

export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const galleryPending = useGalleryPending();
  const { logout, user } = useAuth();
  const [renderActive, setRenderActive] = useState(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);
  const isLogin = pathname === '/login';
  const showRender = !isLogin;

  useEffect(() => {
    const handler = (evt) => {
      const active = !!evt?.detail?.active;
      setRenderActive(active);
    };
    window.addEventListener('cozygen:render-state', handler);
    return () => window.removeEventListener('cozygen:render-state', handler);
  }, []);

  const requestRender = async () => {
    if (renderActive) return;
    const isStudio = pathname === '/' || pathname === '/studio';
    if (isStudio) {
      try {
        window.dispatchEvent(new Event('cozygen:request-render'));
      } catch {
        // ignore
      }
      return;
    }

    if (!hasLastRenderPayload()) {
      alert('No previous render found yet. Render once from Studio first.');
      return;
    }

    setRenderActive(true);
    const result = await requeueLastRender();
    setRenderActive(false);
    if (!result?.success) {
      alert(result?.error || 'Failed to render.');
    }
  };

  const handleLogout = () => {
    try {
      logout();
    } catch {
      // ignore
    }
    window.location.hash = '#/login';
  };

  const ALL_LINKS = [...PRIMARY_LINKS, ...SECONDARY_LINKS];

  return (
    <header className="top-bar">
      <div className="top-bar-shell">
        <div className="brand-row">
          <Link to="/" className="brand-mark" onClick={closeMenu}>
            <LogoMark size={28} className="brand-logo" />
            <span className="brand-text">CozyGen</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Main navigation">
            {ALL_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={navLinkClasses}
              >
                <span className="inline-flex items-center gap-1.5">
                  <link.Icon size={16} />
                  <span>{link.label}</span>
                  {link.to === '/gallery' && galleryPending ? (
                    <span className="badge-dot" aria-hidden="true" />
                  ) : null}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {showRender ? (
            <button
              type="button"
              className={`desktop-render-btn ${renderActive ? 'is-busy' : ''}`}
              onClick={requestRender}
              title={renderActive ? 'Rendering…' : 'Render'}
              aria-busy={renderActive}
              aria-disabled={renderActive}
              disabled={renderActive}
            >
              <span className="render-icon">
                {renderActive ? <span className="render-spinner" aria-hidden="true" /> : <IconRender size={16} />}
              </span>
              <span className="render-label">{renderActive ? 'Rendering…' : 'Render'}</span>
            </button>
          ) : null}

          <button
            type="button"
            className="desktop-logout-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            <span className="logout-icon"><IconLogout size={16} /></span>
            <span className="logout-label">Logout</span>
            {user ? <span className="logout-user">@{user}</span> : null}
          </button>

          <button
            type="button"
            className={`mobile-menu-toggle btn-touch ${menuOpen ? 'is-active' : ''} md:hidden`}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="cozygen-mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="mobile-menu-icon">
              <span />
            </span>
          </button>
        </div>
      </div>

      <div
        id="cozygen-mobile-nav"
        className={`mobile-nav-drawer md:hidden ${menuOpen ? 'is-open' : ''}`}
        role="menu"
      >
        <div className="mobile-nav-section">
          {PRIMARY_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={navLinkClasses}
              onClick={closeMenu}
              role="menuitem"
            >
              <span className="inline-flex items-center gap-2">
                <link.Icon size={16} />
                <span>{link.label}</span>
              </span>
            </NavLink>
          ))}
        </div>
        <div className="mobile-nav-section secondary">
          <NavLink
            to="/gallery"
            className={navLinkClasses}
            onClick={closeMenu}
            role="menuitem"
          >
            <span className="inline-flex items-center gap-2">
              <IconGallery size={16} />
              <span>Gallery</span>
              {galleryPending ? <span className="badge-dot" aria-hidden="true" /> : null}
            </span>
          </NavLink>
          <NavLink
            to="/aliases"
            className={navLinkClasses}
            onClick={closeMenu}
            role="menuitem"
          >
            <span className="inline-flex items-center gap-2">
              <IconTag size={16} />
              <span>Aliases</span>
            </span>
          </NavLink>
          <button
            type="button"
            className="slim-nav-link btn-touch text-left"
            onClick={() => {
              closeMenu();
              handleLogout();
            }}
            role="menuitem"
          >
              <span className="inline-flex items-center gap-2">
                <IconLogout size={16} />
                <span>Logout</span>
              {user ? <span className="text-[rgba(159,178,215,0.75)] text-xs">@{user}</span> : null}
              </span>
            </button>
        </div>
      </div>
    </header>
  );
}
