import { useMemo, useState } from 'react';
import { RUNES, RUNE_BY_CHAR } from '../data/runes.js';
import { UNITS, wordsThrough, runesThrough } from '../data/lessons.js';
import { transliterateWord, readAloud } from '../lib/transliterate.js';
import { accuracy, learnedCount, practiceOrder, recordAnswer } from '../lib/progress.js';
import StrokeDiagram from './StrokeDiagram.jsx';
import SpeakButton from './SpeakButton.jsx';

const MODES = [
  ['mixed', 'Mixed'],
  ['sound', 'Rune → sound'],
  ['rune', 'Sound → rune'],
  ['read', 'Read words'],
  ['stroke', 'How to draw'],
];

const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

export default function Practice({ state, update }) {
  const [mode, setMode] = useState('mixed');
  const [running, setRunning] = useState(false);
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const maxUnit = state.completedUnits.length ? Math.max(...state.completedUnits) : UNITS.length;
  const pool = useMemo(() => {
    const known = [...runesThrough(maxUnit)].filter((c) => RUNE_BY_CHAR[c]);
    return known.length >= 6 ? known : RUNES.map((r) => r.r);
  }, [maxUnit]);

  const start = () => {
    const ordered = shuffle(practiceOrder(state, pool)).slice(0, 12);
    const words = wordsThrough(maxUnit);
    const q = shuffle(ordered.map((r) => {
      const kinds = mode === 'mixed' ? ['sound', 'rune', 'read', 'stroke'] : [mode];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      if (kind === 'read' && words.length > 4) {
        const w = words[Math.floor(Math.random() * words.length)];
        return { kind: 'read', word: w, options: shuffle([w, ...shuffle(words.filter((x) => x !== w)).slice(0, 3)]) };
      }
      if (kind === 'stroke') return { kind: 'stroke', rune: r };
      return { kind: kind === 'read' ? 'sound' : kind, rune: r, options: shuffle([r, ...shuffle(pool.filter((x) => x !== r)).slice(0, 3)]) };
    }));
    setQueue(q); setPos(0); setAnswered(null); setScore({ right: 0, total: 0 }); setRunning(true);
    update((s) => { s.sessionCount = (s.sessionCount || 0) + 1; });
  };

  const answer = (ok, rune) => {
    setAnswered(ok ? 'ok' : 'no');
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    if (rune) update((s) => recordAnswer(s, rune, ok));
  };

  const next = () => {
    setAnswered(null);
    if (pos + 1 >= queue.length) setRunning(false);
    else setPos(pos + 1);
  };

  if (!running) {
    return (
      <div className="stack">
        <div>
          <h1>Practice</h1>
          <p className="muted">
            Twelve quick questions, weighted towards whatever you've been getting wrong.
            {state.completedUnits.length === 0 && ' Nothing completed yet, so this covers all thirty runes.'}
          </p>
        </div>

        <div className="stat-row">
          <div className="stat"><div className="v">{learnedCount(state)}<span className="muted small">/{RUNES.length}</span></div><div className="k">Solid</div></div>
          <div className="stat"><div className="v">{accuracy(state) === null ? '—' : `${accuracy(state)}%`}</div><div className="k">Accuracy</div></div>
          <div className="stat"><div className="v">{state.sessionCount || 0}</div><div className="k">Sessions</div></div>
          {score.total > 0 && <div className="stat"><div className="v">{score.right}/{score.total}</div><div className="k">Last round</div></div>}
        </div>

        <div className="card">
          <label className="field">What kind of practice?</label>
          <div className="row">
            {MODES.map(([id, label]) => (
              <button key={id} className={`btn small${mode === id ? ' primary' : ''}`} onClick={() => setMode(id)}>{label}</button>
            ))}
          </div>
        </div>

        <button className="btn primary" onClick={start}>Start</button>

        {Object.keys(state.strength).length > 0 && <Weakest state={state} />}
      </div>
    );
  }

  const q = queue[pos];
  return (
    <div className="stack">
      <div className="spread">
        <button className="btn ghost small" onClick={() => setRunning(false)}>← Stop</button>
        <span className="small muted">{pos + 1} of {queue.length} · {score.right}/{score.total} right</span>
      </div>
      <div className="progress"><i style={{ width: `${(pos / queue.length) * 100}%` }} /></div>

      {q.kind === 'sound' && <QSound q={q} answered={answered} onAnswer={answer} />}
      {q.kind === 'rune' && <QRune q={q} answered={answered} onAnswer={answer} />}
      {q.kind === 'read' && <QRead q={q} answered={answered} onAnswer={answer} />}
      {q.kind === 'stroke' && <QStroke q={q} onAnswer={answer} answered={answered} />}

      {answered && <button className="btn primary" onClick={next} autoFocus>Continue</button>}
    </div>
  );
}

function Weakest({ state }) {
  const rows = Object.entries(state.strength)
    .filter(([r]) => RUNE_BY_CHAR[r])
    .sort((a, b) => (a[1].box - b[1].box) || (b[1].wrong - a[1].wrong))
    .slice(0, 6);
  if (!rows.length) return null;
  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.6rem' }}>Needs the most work</h3>
      <table className="chart">
        <thead><tr><th>Rune</th><th>Name</th><th>Right</th><th>Wrong</th></tr></thead>
        <tbody>
          {rows.map(([r, s]) => (
            <tr key={r}>
              <td className="r rune">{r}</td>
              <td>{RUNE_BY_CHAR[r].name} <span className="muted small">— {RUNE_BY_CHAR[r].gloss}</span></td>
              <td>{s.right}</td>
              <td>{s.wrong}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QSound({ q, answered, onAnswer }) {
  const r = RUNE_BY_CHAR[q.rune];
  return (
    <div className="stack">
      <h2>What sound is this?</h2>
      <div className="card center">
        <div className="prompt-rune rune">{q.rune}</div>
        <SpeakButton runic={q.rune} label="Hear it" />
      </div>
      <div className="choices">
        {q.options.map((o) => (
          <button key={o} className={`choice${answered && o === q.rune ? ' correct' : ''}`} disabled={!!answered} onClick={() => onAnswer(o === q.rune, q.rune)}>
            {RUNE_BY_CHAR[o].gloss}
          </button>
        ))}
      </div>
      {answered && <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{r.name} — {r.gloss}</div>}
    </div>
  );
}

function QRune({ q, answered, onAnswer }) {
  const r = RUNE_BY_CHAR[q.rune];
  return (
    <div className="stack">
      <h2>Which rune?</h2>
      <div className="card center">
        <div className="prompt-word">{r.gloss}</div>
        <div className="muted small">“{r.name}”</div>
      </div>
      <div className="choices">
        {q.options.map((o) => (
          <button key={o} className={`choice${answered && o === q.rune ? ' correct' : ''}`} disabled={!!answered} onClick={() => onAnswer(o === q.rune, q.rune)}>
            <span className="c-rune rune">{o}</span>
          </button>
        ))}
      </div>
      {answered && <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{q.rune} is {r.name}.</div>}
    </div>
  );
}

function QRead({ q, answered, onAnswer }) {
  const runic = transliterateWord(q.word).runes;
  return (
    <div className="stack">
      <h2>Read this word</h2>
      <div className="card center">
        <div className="prompt-rune rune">{runic}</div>
        <SpeakButton runic={runic} label="Hear it" />
      </div>
      <div className="choices">
        {q.options.map((o) => (
          <button key={o} className={`choice${answered && o === q.word ? ' correct' : ''}`} disabled={!!answered} onClick={() => onAnswer(o === q.word, runic[0])}>
            {o}
          </button>
        ))}
      </div>
      {answered && <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{runic} = “{q.word}” — {readAloud(runic)}</div>}
    </div>
  );
}

function QStroke({ q, answered, onAnswer }) {
  const [revealed, setRevealed] = useState(false);
  const r = RUNE_BY_CHAR[q.rune];
  return (
    <div className="stack">
      <h2>Draw {r.name} from memory</h2>
      <p className="muted small">Sketch it on paper, then check yourself.</p>
      <div className="card center">
        {revealed
          ? <StrokeDiagram rune={q.rune} size={150} animate />
          : <div className="prompt-word" style={{ padding: '2rem 0' }}>{r.name} — {r.gloss}</div>}
      </div>
      {!revealed && <button className="btn" onClick={() => setRevealed(true)}>Show me</button>}
      {revealed && !answered && (
        <div className="row">
          <button className="btn primary grow" onClick={() => onAnswer(true, q.rune)}>I got it right</button>
          <button className="btn grow" onClick={() => onAnswer(false, q.rune)}>Not quite</button>
        </div>
      )}
      {answered && <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{answered === 'ok' ? 'Good.' : "It'll come back round."}</div>}
    </div>
  );
}
