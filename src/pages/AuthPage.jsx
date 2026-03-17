import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function AuthPage() {
  const auth = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login'
      ? { email: form.email, password: form.password }
      : { username: form.username, email: form.email, password: form.password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }
      auth.login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError(null);
    setForm({ username: '', email: '', password: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">Task Manager</h1>
          <p className="auth-card__subtitle">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="auth-username">
                Username
              </label>
              <input
                id="auth-username"
                className="auth-form__input"
                type="text"
                name="username"
                placeholder="Choose a username"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>
          )}

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="auth-form__input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="auth-form__input"
              type="password"
              name="password"
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="auth-form__error">{error}</div>}

          <button
            className="auth-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-card__footer">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button className="auth-toggle-btn" type="button" onClick={toggleMode}>
                Register
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button className="auth-toggle-btn" type="button" onClick={toggleMode}>
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
