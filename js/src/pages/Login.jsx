import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Login() {
  const { authed, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/studio';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [idleNotice, setIdleNotice] = useState(false);

  useEffect(() => {
    try {
      const flag = localStorage.getItem('cozygen_idle_logout');
      if (flag) {
        setIdleNotice(true);
        localStorage.removeItem('cozygen_idle_logout');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (ready && authed) {
      navigate(from, { replace: true });
    }
  }, [ready, authed, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.unauthorized) {
        setError('Invalid username or password.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-2xl backdrop-blur">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xl">
              🔒
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">CozyGen</p>
              <h1 className="text-2xl font-semibold text-white">Sign in to continue</h1>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
                {error}
              </div>
            )}
            {idleNotice && !error && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
                You were signed out due to inactivity. Please sign in again.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-3 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-6">
            Access is protected by CozyGen auth. Set <code className="font-mono">COZYGEN_AUTH_USER</code> /
            <code className="font-mono">COZYGEN_AUTH_PASS</code> on the server to enable.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
