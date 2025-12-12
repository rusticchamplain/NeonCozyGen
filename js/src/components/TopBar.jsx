// js/src/components/TopBar.jsx

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../styles/mobile-helpers.css';
import useGalleryPending from '../hooks/useGalleryPending';
import { useAuth } from '../hooks/useAuth';

const PRIMARY_LINKS = [
  { to: '/', label: '🎨 Studio', end: true },
];

const SECONDARY_LINKS = [
  { to: '/gallery', label: '🖼️ Gallery' },
  { to: '/presets', label: '✨ Presets' },
  { to: '/lora-library', label: '🧩 LoRA' },
  { to: '/aliases', label: '🔖 Aliases' },
];

const navLinkClasses = ({ isActive }) =>
  ['slim-nav-link btn-touch', isActive ? 'is-active' : null].filter(Boolean).join(' ');

export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const galleryPending = useGalleryPending();
  const { logout, user } = useAuth();
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    try {
      logout();
    } catch {
      // ignore
    }
    window.location.hash = '#/login';
  };

  return (
    <header className="top-bar">
      <div className="top-bar-shell">
        <div className="brand-row">
          <Link to="/" className="brand-mark" onClick={closeMenu}>
            <span className="brand-icon">CG</span>
            <span className="brand-text">CozyGen</span>
          </Link>

          <button
            type="button"
            className={`mobile-menu-toggle btn-touch ${menuOpen ? 'is-active' : ''} md:hidden`}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="cozygen-mobile-nav"
          >
            <span className="mobile-menu-label">{menuOpen ? 'Close' : 'Menu'}</span>
            <span className="mobile-menu-icon">
              <span />
            </span>
          </button>

          <button
            type="button"
            className="hidden md:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-200 text-sm hover:bg-slate-800 transition"
            onClick={handleLogout}
            title="Sign out"
          >
            <span className="text-lg">🚪</span>
            <span className="hidden sm:inline text-xs uppercase tracking-wide">Logout</span>
            {user ? <span className="text-slate-400 text-xs">@{user}</span> : null}
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
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="mobile-nav-section secondary">
          {SECONDARY_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={navLinkClasses}
              onClick={closeMenu}
              role="menuitem"
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{link.label}</span>
                {link.to === '/gallery' && galleryPending ? (
                  <span className="badge-dot" aria-hidden="true" />
                ) : null}
              </span>
            </NavLink>
          ))}
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
              <span>🚪 Logout</span>
              {user ? <span className="text-slate-400 text-xs">@{user}</span> : null}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
