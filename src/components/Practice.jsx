import { useMemo, useState } from 'react';
import { RUNES, RUNE_BY_CHAR } from '../data/runes.js';
import { UNITS, wordsThrough, runesThrough } from '../data/lessons.js';
import { transliterateWord, readAloud } from '../lib/transliterate.js';
import { accuracy, learnedCount, practiceOrder, recordAnswer } from '../lib/progress.js';
import StrokeDiagram from './StrokeDiagram.jsx';
import RuneCanvas from './RuneCanvas.jsx';
import { GLYPHS } from '../data/glyphs.js';
import { judge, PASS_MARK } from '../lib/recognise.js';
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
    const words = wordsThrough(maxUnit);
    const kinds = mode === 'mixed' ? ['sound', 'rune', 'read', 'stroke'] : [mode];

    // Deal words from one deck rather than picking at random each time, so a
    // round doesn't ask about the same word twice while others never appear.
    let deck = shuffle(words);
    let di = 0;
    const nextWord = () => {
      if (!words.length) return null;
      if (di >= deck.length) { deck = shuffle(words); di = 0; }
      return deck[di++];
    };

    // Weakest first, but only as an ordering - taking the first twelve every
    // time meant the same handful came round session after session. Draw from
    // the front of the queue and let the rest of the pool in behind it.
    const ordered = practiceOrder(state, pool);
    const focus = shuffle(ordered.slice(0, Math.min(8, ordered.length)));
    const rest = shuffle(ordered.slice(8));
    const runeOrder = [...focus, ...rest];

    // A rune may come round more than once when little is known yet - a
    // six-rune pool used to give a six-question round - but never twice with
    // the same kind of question, which is what made it feel like a rerun.
    const used = new Map();
    const q = [];
    for (let i = 0; q.length < 12; i++) {
      if (!runeOrder.length) break;
      const r = runeOrder[i % runeOrder.length];
      const taken = used.get(r) || [];
      const free = kinds.filter((k) => !taken.includes(k));
      if (!free.length) { if (i > runeOrder.length * kinds.length) break; continue; }
      const kind = free[Math.floor(Math.random() * free.length)];
      used.set(r, [...taken, kind]);

      if (kind === 'read' && words.length > 4) {
        const w = nextWord();
        q.push({ kind: 'read', word: w, options: shuffle([w, ...shuffle(words.filter((x) => x !== w)).slice(0, 3)]) });
      } else if (kind === 'stroke') {
        q.push({ kind: 'stroke', rune: r });
      } else {
        q.push({
          kind: kind === 'read' ? 'sound' : kind,
          rune: r,
          options: shuffle([r, ...shuffle(pool.filter((x) => x !== r)).slice(0, 3)]),
        });
      }
    }

    setQueue(shuffle(q)); setPos(0); setAnswered(null); setScore({ right: 0, total: 0 }); setRunning(true);
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
            {state.completedUnits.length === 0 && ` Nothing completed yet, so this covers all ${RUNES.length} runes.`}
          </p>
        </div>

        <div className="stat-row">
          <div className="stat"><div className="v">{learnedCount(state)}<span className="muted small">/{RUNES.length}</span></div><div className="k">Solid</div></div>
          <div className="stat"><div className="v">{accuracy(state) === null ? '-' : `${accuracy(state)}%`}</div><div className="k">Accuracy</div></div>
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
              <td>{RUNE_BY_CHAR[r].name} <span className="muted small">- {RUNE_BY_CHAR[r].gloss}</span></td>
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
      {answered && <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{r.name} - {r.gloss}</div>}
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
      {answered && <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{runic} = “{q.word}” - {readAloud(runic)}</div>}
    </div>
  );
}

/**
 * Draw the rune, and be told whether you actually drew it.
 *
 * This used to say "sketch it on paper, then check yourself" and offer two
 * buttons marked "I got it right" and "Not quite" - which asks the one person
 * who cannot yet tell the difference to be the judge, on a device perfectly
 * capable of judging for itself.
 */
function QStroke({ q, answered, onAnswer }) {
  const [strokes, setStrokes] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const r = RUNE_BY_CHAR[q.rune];
  const glyph = GLYPHS[q.rune];

  const check = () => {
    // judge, not identify: we asked for this rune, so the question is whether
    // they drew it - not which of thirty runes it most resembles.
    const v = judge(strokes, q.rune);
    setVerdict(v);
    onAnswer(v.ok, q.rune);
  };

  return (
    <div className="stack">
      <h2>Draw {r.name}</h2>
      <p className="muted small">{r.gloss} - from memory if you can.</p>

      <RuneCanvas
        strokes={strokes}
        setStrokes={setStrokes}
        disabled={!!answered}
        guide={showGuide && glyph ? glyph.strokes : null}
        guideWidth={glyph?.w ?? 60}
      />

      {!answered && (
        <div className="row">
          <button className="btn small" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? 'Hide the shape' : 'Show me the shape'}
          </button>
          <button className="btn small" disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0, -1))}>
            Undo
          </button>
          <button className="btn small" disabled={!strokes.length} onClick={() => setStrokes([])}>
            Clear
          </button>
          <span className="grow" />
          <button className="btn primary" disabled={!strokes.length} onClick={check}>Check</button>
        </div>
      )}

      {verdict && (
        <div className={`feedback ${verdict.ok ? 'ok' : 'no'}`}>
          <strong>{verdict.score}%</strong>{' '}
          {verdict.ok
            ? "- that's the one."
            : verdict.rival
              ? `- that came out nearer ${verdict.rival} (${RUNE_BY_CHAR[verdict.rival]?.name}).`
              : `- not clear enough yet. It needs ${PASS_MARK}% to count.`}
          {verdict.ok && verdict.tooClose && verdict.rival && (
            <div className="tiny muted" style={{ marginTop: '0.3rem' }}>
              Close to {verdict.rival} though - worth watching the difference.
            </div>
          )}
        </div>
      )}

      {answered && (
        <div className="card center">
          <StrokeDiagram rune={q.rune} size={150} animate />
        </div>
      )}
    </div>
  );
}
