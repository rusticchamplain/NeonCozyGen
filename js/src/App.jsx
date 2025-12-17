// js/src/App.jsx
import { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import MainPage from './pages/MainPage';
import Gallery from './pages/Gallery';
import Presets from './pages/Presets';
import LoraLibrary from './pages/LoraLibrary';
import Aliases from './pages/Aliases';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './hooks/useAuth';

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
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  const { pathname } = useLocation();
  const { defaultCreds, authed } = useAuth();
  const isLogin = pathname === '/login';
  const contentRef = useRef(null);

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
      <main
        ref={contentRef}
        className={isLogin ? 'app-content is-login' : 'app-content'}
      >
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <MainPage />
              </RequireAuth>
            }
          />
          <Route
            path="/studio"
            element={
              <RequireAuth>
                <MainPage />
              </RequireAuth>
            }
          />
          <Route
            path="/gallery"
            element={
              <RequireAuth>
                <Gallery />
              </RequireAuth>
            }
          />
          <Route
            path="/presets"
            element={
              <RequireAuth>
                <Presets />
              </RequireAuth>
            }
          />
          <Route
            path="/lora-library"
            element={
              <RequireAuth>
                <LoraLibrary />
              </RequireAuth>
            }
          />
          <Route
            path="/aliases"
            element={
              <RequireAuth>
                <Aliases />
              </RequireAuth>
            }
          />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/studio" replace />} />
        </Routes>
      </main>
      {!isLogin && <BottomNav />}
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
