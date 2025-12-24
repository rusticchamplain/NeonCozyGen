// js/src/components/TopBar.jsx

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import Button from '../primitives/Button';
import { LogoMark, IconLogout } from '../primitives/Icons';

export default function TopBar() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const isLogin = pathname === '/login';

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
          <Link to="/studio" className="brand-mark">
            <LogoMark size={28} className="brand-logo" />
            <span className="brand-text">CozyGen</span>
          </Link>

          <div className="flex-1" />

          {!isLogin ? (
            <Button
              variant="muted"
              size="sm"
              onClick={handleLogout}
              title="Sign out"
            >
              <span className="inline-flex items-center justify-center"><IconLogout size={16} /></span>
              <span>Logout</span>
              {user ? <span className="text-xs text-[#9DA3FFB3] hidden sm:inline">@{user}</span> : null}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
