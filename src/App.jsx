import { useCallback, useEffect, useMemo, useState } from 'react';
import { load, save } from './lib/progress.js';
import { getCurrentUser, logoutUser } from './lib/auth.js';
import Home from './components/Home.jsx';
import Lessons from './components/Lessons.jsx';
import Reference from './components/Reference.jsx';
import Practice from './components/Practice.jsx';
import Translator from './components/Translator.jsx';
import Settings from './components/Settings.jsx';
import PrintView from './print/PrintView.jsx';
import Profile from './components/Profile.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import AuthModal from './components/AuthModal.jsx';

const VIEWS = [
  ['learn', 'Learn'],
  ['reference', 'Runes'],
  ['practice', 'Practice'],
  ['leaderboard', 'Leaderboard'],
  ['write', 'Write'],
  ['print', 'Print'],
  ['profile', 'Profile'],
  ['settings', 'Settings'],
];

function readHash() {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  const [view, arg] = h.split('/');
  return { view: view || 'home', arg: arg ? decodeURIComponent(arg) : null };
}

export default function App() {
  const [route, setRoute] = useState(readHash);
  const [state, setState] = useState(load);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const currentUser = getCurrentUser();

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { save(state); }, [state]);

  const go = useCallback((view, arg) => {
    window.location.hash = arg ? `#/${view}/${encodeURIComponent(arg)}` : `#/${view}`;
    window.scrollTo(0, 0);
  }, []);

  const update = useCallback((fn) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const settings = state.settings;

  const navViews = useMemo(() => {
    return currentUser ? VIEWS : VIEWS.filter(([id]) => id !== 'profile');
  }, [currentUser]);

  const body = useMemo(() => {
    switch (route.view) {
      case 'learn': return <Lessons state={state} update={update} go={go} unitId={route.arg ? Number(route.arg) : null} />;
      case 'reference': return <Reference settings={settings} focus={route.arg} />;
      case 'practice': return <Practice state={state} update={update} settings={settings} />;
      case 'leaderboard': return <Leaderboard state={state} update={update} />;
      case 'write': return <Translator settings={settings} update={update} />;
      case 'print': return <PrintView state={state} />;
      case 'profile':
        return currentUser ? (
          <Profile state={state} update={update} />
        ) : (
          <div className="card center stack" style={{ maxWidth: '440px', margin: '2rem auto', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem' }}>🔒</div>
            <h2>Profile Access Required</h2>
            <p className="muted small">
              Please log in or sign up for an account to access your personal profile and custom worksheets.
            </p>
            <button className="btn primary" onClick={() => setShowAuthModal(true)}>
              Log In / Sign Up
            </button>
          </div>
        );
      case 'settings': return <Settings state={state} update={update} />;
      default: return <Home state={state} go={go} />;
    }
  }, [route, state, settings, update, go, currentUser]);

  return (
    <div className="app">
      {showAuthModal && (
        <AuthModal
          onAuthSuccess={() => {
            setShowAuthModal(false);
            window.location.reload();
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <header className="topbar no-print">
        <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('home'); }}>
          <span className="mark rune" title="Fee, Up, Thorn, Oak, Ride, Car — the alphabet is named after its first six runes">ᚠᚢᚦᚩᚱᚳ</span>
          <span className="name">Futhorc</span>
        </a>
        <nav className="nav">
          {navViews.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} aria-current={route.view === id}>{label}</button>
          ))}
          {currentUser ? (
            <button
              onClick={() => go('profile')}
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}
              title={`Logged in as ${currentUser.username}`}
            >
              👤 {currentUser.username}
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
            >
              🔑 Log In
            </button>
          )}
        </nav>
      </header>
      <main className={`main${route.view === 'print' ? ' wide' : ''}`}>{body}</main>
    </div>
  );
}
