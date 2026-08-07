import { useState } from 'react';
import { registerUser, loginUser } from '../lib/auth.js';

export default function AuthModal({ onAuthSuccess, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const user = await registerUser({ username, email, password });
        onAuthSuccess(user);
      } else {
        const user = await loginUser(username, password);
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop auth-backdrop">
      <div className="auth-card stack">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-brand-mark rune">ᚠᚢᚦᚩᚱᚳ</div>
          <h2 className="auth-title">{mode === 'signup' ? 'Join Futhorc' : 'Welcome Back'}</h2>
          <p className="auth-subtitle muted">
            {mode === 'signup'
              ? 'Create a free account to track your progress, XP, and daily streak!'
              : 'Sign in to access your personal worksheets and runic progress.'}
          </p>
          {onClose && (
            <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="feedback no" style={{ margin: '0.4rem 0' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="stack" style={{ gap: '1rem', marginTop: '0.5rem' }}>
          <div className="field">
            <label className="auth-label">Username {mode === 'login' ? 'or Email' : ''}</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">👤</span>
              <input
                type="text"
                className="auth-input"
                required
                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="field">
              <label className="auth-label">Email Address (Optional)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">✉️</span>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn primary auth-submit-btn" disabled={loading}>
            {loading ? 'Securing Account...' : mode === 'signup' ? '✨ Create Free Account' : '🚀 Log In'}
          </button>
        </form>

        <div className="small muted center" style={{ marginTop: '0.6rem', fontSize: '0.82rem' }}>
          🔒 Passwords are encrypted with SHA-256 security. Your data stays private.
        </div>
      </div>
    </div>
  );
}
