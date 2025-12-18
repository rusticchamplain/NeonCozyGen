// js/src/App.jsx
import { Suspense, lazy, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import { AuthProvider, useAuth } from './hooks/useAuth';

const MainPage = lazy(() => import('./pages/MainPage'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Aliases = lazy(() => import('./pages/Aliases'));
const Login = lazy(() => import('./pages/Login'));

function PageLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-slate-200">
      Loading…
    </div>
  );
}

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
        <Suspense fallback={<PageLoading />}>
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
        </Suspense>
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
