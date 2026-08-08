import { useMemo, useState } from 'react';
import { transliterate, readAloud, splitUnits } from '../lib/transliterate.js';
import { runesToPhonemes } from '../lib/phonology.js';
import { RUNE_BY_CHAR } from '../data/runes.js';
import SpeakButton from './SpeakButton.jsx';
import RuneTextReader from './RuneTextReader.jsx';

const SAMPLES = [
  'The cat sat on the mat.',
  'To be, or not to be, that is the question.',
  'I lift my lamp beside the golden door.',
  'Now is the winter of our discontent.',
];

export default function Translator({ settings, update }) {
  const [dir, setDir] = useState('to');
  return (
    <div className="stack">
      <div className="spread">
        <div>
          <span className="page-header-runes rune">ᚱᛡᛏ</span>
          <h1>Write</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Type English and get runes back, or paste runes to have them sounded out.
          </p>
        </div>
        <div className="row">
          <button className={`btn small${dir === 'to' ? ' primary' : ''}`} onClick={() => setDir('to')}>English → runes</button>
          <button className={`btn small${dir === 'from' ? ' primary' : ''}`} onClick={() => setDir('from')}>Runes → sounds</button>
        </div>
      </div>
      {dir === 'to' ? <ToRunes settings={settings} update={update} /> : <FromRunes settings={settings} />}
    </div>
  );
}

function ToRunes({ settings, update }) {
  const [text, setText] = useState('The cat sat on the mat.');
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => transliterate(text, settings), [text, settings]);

  const set = (k, v) => update((s) => { s.settings[k] = v; });

  return (
    <div className="stack">
      <div>
        <label className="field" htmlFor="src">English</label>
        <textarea id="src" value={text} onChange={(e) => { setText(e.target.value); setCopied(false); }} placeholder="Type here…" />
      </div>

      <div className="row">
        <label className="toggle">
          <input type="checkbox" checked={settings.ligatures} onChange={(e) => set('ligatures', e.target.checked)} />
          Use the ᛥ and ᛢ ligatures
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.markVoiceless} onChange={(e) => set('markVoiceless', e.target.checked)} />
          Mark voiceless endings (ᚠᚠ, ᛋᛋ)
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.separator === 'interpunct'}
            onChange={(e) => set('separator', e.target.checked ? 'interpunct' : 'space')}
          />
          Separate words with ᛫
        </label>
      </div>

      <div>
        <div className="spread" style={{ marginBottom: '0.35rem' }}>
          <label className="field" style={{ margin: 0 }}>Runes</label>
          <button
            className="btn small"
            onClick={() => { navigator.clipboard?.writeText(result.text); setCopied(true); }}
          >{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="trans-out card" style={{ padding: '1.25rem' }}>
          <RuneTextReader runic={result.text} label="Read aloud" fontSize="1.6rem" />
        </div>
      </div>

      {result.guesses.length > 0 && (
        <div className="card small">
          <strong>Worked out from spelling:</strong>{' '}
          <span className="muted">{[...new Set(result.guesses)].join(', ')}</span>
          <p className="tiny muted" style={{ margin: '0.4rem 0 0' }}>
            These weren't in the dictionary, so the pronunciation was derived from the letters.
            Usually right, occasionally not - worth a glance if it matters.
          </p>
        </div>
      )}

      <div className="row">
        <span className="small muted">Try:</span>
        {SAMPLES.map((s) => (
          <button key={s} className="btn small ghost" onClick={() => setText(s)}>{s.slice(0, 26)}…</button>
        ))}
      </div>
    </div>
  );
}

function FromRunes({ settings }) {
  const [text, setText] = useState('ᛏᚣᚣ᛫ᛒᛁᛁ, ᛟᛟ᛫ᚾᛟᛏ᛫ᛏᚣᚣ᛫ᛒᛁᛁ');

  const words = useMemo(
    () => text.split(/([^\p{Script=Runic}]+)/gu).filter(Boolean),
    [text]
  );

  return (
    <div className="stack">
      <div>
        <label className="field" htmlFor="rsrc">Runes</label>
        <textarea id="rsrc" className="rune" style={{ fontSize: '1.5rem', lineHeight: 1.6 }} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <SpeakButton runic={text} label="Read aloud" />

      <div className="card">
        <h3 style={{ marginBottom: '0.6rem' }}>Sound it out</h3>
        <div className="row" style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
          {words.map((w, k) =>
            /\p{Script=Runic}/u.test(w) ? (
              <div key={k} style={{ textAlign: 'center' }}>
                <div className="rune" style={{ fontSize: '1.8rem' }}>{w}</div>
                <div className="tiny muted">{readAloud(w)}</div>
              </div>
            ) : (
              <span key={k} className="muted">{w.trim()}</span>
            )
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.6rem' }}>Rune by rune</h3>
        <table className="chart">
          <thead><tr><th>Rune</th><th>Name</th><th>Sound</th></tr></thead>
          <tbody>
            {[...new Set(text.split('').filter((c) => RUNE_BY_CHAR[c]))].map((c) => {
              const r = RUNE_BY_CHAR[c];
              return (
                <tr key={c}>
                  <td className="r rune">{c}</td>
                  <td>{r.name}</td>
                  <td className="small">{r.gloss}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
