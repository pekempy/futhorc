import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { load, save } from './lib/progress.js';
import * as account from './lib/account.js';
import Home from './components/Home.jsx';
import Lessons from './components/Lessons.jsx';
import Reference from './components/Reference.jsx';
import Practice from './components/Practice.jsx';
import Translator from './components/Translator.jsx';
import Settings from './components/Settings.jsx';
import PrintView from './print/PrintView.jsx';
import Profile from './components/Profile.jsx';

const VIEWS = [
  ['learn', 'Learn'],
  ['reference', 'Runes'],
  ['practice', 'Practice'],
  ['write', 'Write'],
  ['print', 'Print'],
  ['profile', 'You'],
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
  const [user, setUser] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { save(state); }, [state]);

  // Show who you are straight away from the remembered account, then confirm
  // it against Google in the background. Waiting for the round trip first
  // means the header flickers from "Sign in" to your name on every load.
  useEffect(() => {
    const remembered = account.previouslyConnected();
    if (remembered) setUser(remembered);
    account.resumeQuietly().then((u) => setUser(u ?? null));
  }, []);

  // Once signed in, keep Drive up to date without anyone having to press a
  // button. stateRef keeps the uploader looking at current state without
  // restarting the timer on every keystroke.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!user) return undefined;
    
    // Sync on launch or sign-in
    account.sync(stateRef.current, (next) => update((st) => { Object.assign(st, next); }))
      .catch((e) => console.error('Initial sync failed:', e));

    account.startAutoBackup(() => stateRef.current);
    return () => account.stopAutoBackup();
  }, [user, update]);

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

  const signIn = useCallback(async () => {
    setSigningIn(true);
    setSignInError('');
    try {
      setUser(await account.signIn());
    } catch (e) {
      setSignInError(e.message || 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => { account.signOut(); setUser(null); }, []);

  const settings = state.settings;

  const body = useMemo(() => {
    switch (route.view) {
      case 'learn': return <Lessons state={state} update={update} go={go} unitId={route.arg ? Number(route.arg) : null} />;
      case 'reference': return <Reference settings={settings} focus={route.arg} />;
      case 'practice': return <Practice state={state} update={update} settings={settings} />;
      case 'write': return <Translator settings={settings} update={update} />;
      case 'print': return <PrintView state={state} />;
      case 'profile': return <Profile state={state} update={update} user={user} onSignIn={signIn} onSignOut={signOut} signingIn={signingIn} />;
      case 'settings': return <Settings state={state} update={update} />;
      default: return <Home state={state} go={go} />;
    }
  }, [route, state, settings, update, go, user, signIn, signOut, signingIn]);

  return (
    <div className="app">
      <header className="topbar no-print">
        <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('home'); }}>
          <span className="mark rune" title="Fee, Up, Thorn, Oak, Ride, Car - the alphabet is named after its first six runes">ᚠᚢᚦᚩᚱᚳ</span>
          <span className="name">Futhorc</span>
        </a>
        <nav className="nav">
          {VIEWS.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} aria-current={route.view === id}>{label}</button>
          ))}
          {user ? (
            <button
              onClick={() => go('profile')}
              className="signed-in"
              title={`Signed in as ${user.email ?? user.name}`}
            >
              {user.picture
                ? <img src={user.picture} alt="" width="20" height="20" style={{ borderRadius: '50%' }} />
                : null}
              {account.displayName(user)}
            </button>
          ) : (
            <button className="sign-in" onClick={signIn} disabled={signingIn}>
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          )}
        </nav>
      </header>
      {signInError && (
        <div className="main"><p className="feedback no small">{signInError}</p></div>
      )}
      <main className={`main${route.view === 'print' ? ' wide' : ''}`}>{body}</main>
    </div>
  );
}
