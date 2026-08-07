import { useCallback, useEffect, useMemo, useState } from 'react';
import { load, save } from './lib/progress.js';
import Home from './components/Home.jsx';
import Lessons from './components/Lessons.jsx';
import Reference from './components/Reference.jsx';
import Practice from './components/Practice.jsx';
import Translator from './components/Translator.jsx';
import Settings from './components/Settings.jsx';
import PrintView from './print/PrintView.jsx';

const VIEWS = [
  ['learn', 'Learn'],
  ['reference', 'Runes'],
  ['practice', 'Practice'],
  ['write', 'Write'],
  ['print', 'Print'],
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

  const body = useMemo(() => {
    switch (route.view) {
      case 'learn': return <Lessons state={state} update={update} go={go} unitId={route.arg ? Number(route.arg) : null} />;
      case 'reference': return <Reference settings={settings} focus={route.arg} />;
      case 'practice': return <Practice state={state} update={update} settings={settings} />;
      case 'write': return <Translator settings={settings} update={update} />;
      case 'print': return <PrintView />;
      case 'settings': return <Settings state={state} update={update} />;
      default: return <Home state={state} go={go} />;
    }
  }, [route, state, settings, update, go]);

  return (
    <div className="app">
      <header className="topbar no-print">
        <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('home'); }}>
          <span className="mark rune" title="Fee, Up, Thorn, Oak, Ride, Car — the alphabet is named after its first six runes">ᚠᚢᚦᚩᚱᚳ</span>
          <span className="name">Futhorc</span>
        </a>
        <nav className="nav">
          {VIEWS.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} aria-current={route.view === id}>{label}</button>
          ))}
        </nav>
      </header>
      <main className={`main${route.view === 'print' ? ' wide' : ''}`}>{body}</main>
    </div>
  );
}
