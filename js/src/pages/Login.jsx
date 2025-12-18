import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogoMark } from '../components/Icons';

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
    <div className="login-shell">
      <div className="neon-card login-card">
        <div className="login-brand">
          <LogoMark size={34} />
          <div className="min-w-0">
            <div className="login-title">Sign in</div>
            <div className="login-subtitle">Continue to CozyGen Studio</div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-username" className="login-label">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              className="ui-control ui-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="login-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="ui-control ui-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="ui-alert">{error}</div>
          ) : idleNotice ? (
            <div className="ui-alert is-warn">You were signed out due to inactivity. Please sign in again.</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="ui-button is-primary w-full"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-footnote">
          Access is protected by CozyGen auth. Set <code className="font-mono">COZYGEN_AUTH_USER</code> /{' '}
          <code className="font-mono">COZYGEN_AUTH_PASS</code> on the server to enable.
        </p>
      </div>
    </div>
  );
}

export default Login;
