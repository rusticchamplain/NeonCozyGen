// js/src/App.jsx
import { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import TopBar from '../ui/layout/TopBar';
import BottomNav from '../ui/layout/BottomNav';
import { AuthProvider, useAuth } from '../features/auth/hooks/useAuth';

import WorkflowControlsPage from '../features/workflow/pages/WorkflowControlsPage';
import StudioLanding from '../features/studio/pages/StudioLanding';
import Gallery from '../features/gallery/pages/Gallery';
import Library from '../features/library/pages/Library';
import ComposerPage from '../features/composer/pages/Composer';
import Login from '../features/auth/pages/Login';
import { StudioProvider } from '../features/studio/contexts/StudioContext';

/* Scroll to top on route change */
function ScrollToTop({ containerRef }) {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    const el = containerRef?.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [pathname, hash, containerRef]);
  return null;
}

function RequireAuth({ children }) {
  const { authed, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="page-loading">
          <span className="loading-spinner lg" aria-hidden="true" />
          <span className="sr-only">Checking session</span>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function RedirectToLibrary({ tab }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search || '');
  params.set('tab', tab);
  const next = params.toString();
  return <Navigate to={`/library?${next}`} replace />;
}

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { defaultCreds, authed } = useAuth();
  const isLogin = pathname === '/login';
  const contentRef = useRef(null);
  const showBottomNav = !isLogin;

  useEffect(() => {
    if (!authed) return undefined;
    const handler = (evt) => {
      const fieldName = String(evt?.detail?.fieldName || '').trim();
      const qs = fieldName ? `?field=${encodeURIComponent(fieldName)}` : '';
      navigate(`/compose${qs}`);
    };
    window.addEventListener('cozygen:open-composer', handler);
    return () => window.removeEventListener('cozygen:open-composer', handler);
  }, [authed, navigate]);

  return (
    <div className="app-shell">
      {!isLogin && <TopBar />}
      {!isLogin && authed && defaultCreds && (
        <div className="flex-shrink-0 bg-amber-500/10 text-amber-200 border-b border-amber-400/50 px-4 py-2 text-sm text-center">
          Default CozyGen credentials are still in use. Change <code className="font-mono">COZYGEN_AUTH_USER</code> /
          <code className="font-mono">COZYGEN_AUTH_PASS</code> on the server.
        </div>
      )}
      <ScrollToTop containerRef={contentRef} />
      <div className="app-body">
        <main
          ref={contentRef}
          className={isLogin ? 'app-content is-login' : 'app-content'}
        >
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <RequireAuth>
                  <StudioProvider>
                    <Outlet />
                  </StudioProvider>
                </RequireAuth>
              }
            >
              <Route path="/" element={<Navigate to="/studio" replace />} />
              <Route path="/studio" element={<StudioLanding />} />
              <Route path="/controls" element={<WorkflowControlsPage />} />
              <Route path="/compose" element={<ComposerPage />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/library" element={<Library />} />
              <Route path="/aliases" element={<RedirectToLibrary tab="aliases" />} />
              <Route path="/tags" element={<RedirectToLibrary tab="tags" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Routes>
        </main>
        {showBottomNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}

export default function AppWithProviders() {
  return (
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  );
}
