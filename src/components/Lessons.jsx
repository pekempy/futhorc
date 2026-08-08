import { Fragment, useEffect, useMemo, useState } from 'react';
import { UNITS, PARTS, runesThrough, wordsThrough, sentencesThrough } from '../data/lessons.js';
import { RUNE_BY_CHAR, DIGRAPH_BY_STR, SEP } from '../data/runes.js';
import { transliterate, transliterateWord, readAloud } from '../lib/transliterate.js';
import { recordAnswer } from '../lib/progress.js';
import StrokeDiagram from './StrokeDiagram.jsx';
import SpeakButton from './SpeakButton.jsx';
import RuneTextReader from './RuneTextReader.jsx';

export default function Lessons({ state, update, go, unitId }) {
  if (unitId) {
    const unit = UNITS.find((u) => u.id === unitId);
    if (!unit) return <p>Unit not found.</p>;
    return <LessonPlayer unit={unit} state={state} update={update} go={go} />;
  }
  return <UnitList state={state} go={go} />;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
};
const sample = (a, n, not = []) => shuffle(a.filter((v) => !not.includes(v))).slice(0, n);
const toRunes = (s) => transliterate(s).text;
const normalise = (s) => s.toLowerCase().replace(/[^a-z' ]/g, '').replace(/\s+/g, ' ').trim();

const NUMBER_LABELS = {
  'ᚪᚾ': { label: '1 - one (ān)', name: 'One', ipa: 'ɑːn' },
  'ᛏᚹᚪ': { label: '2 - two (twā)', name: 'Two', ipa: 'twɑː' },
  'ᚦᚱᛁᛖ': { label: '3 - three (þrīe)', name: 'Three', ipa: 'θriːe' },
  'ᚠᛖᚩᚹᛖᚱ': { label: '4 - four (feōwer)', name: 'Four', ipa: 'feowər' },
  'ᚠᛁᚠ': { label: '5 - five (fīf)', name: 'Five', ipa: 'fiːf' },
  'ᛋᛁᚳᛋ': { label: '6 - six (six)', name: 'Six', ipa: 'siks' },
  'ᛋᛖᚩᚠᚩᚾ': { label: '7 - seven (seofon)', name: 'Seven', ipa: 'seovon' },
  'ᛠᚻᛏᚪ': { label: '8 - eight (eahta)', name: 'Eight', ipa: 'æːɑxtɑ' },
  'ᚾᛁᚷᚩᚾ': { label: '9 - nine (nigon)', name: 'Nine', ipa: 'nijon' },
  'ᛏᛁᛖᚾ': { label: '10 - ten (tīen)', name: 'Ten', ipa: 'tiːen' },
};

function describe(seq) {
  const r = RUNE_BY_CHAR[seq];
  if (r) return { label: r.gloss, name: r.name, ipa: r.ipa.join(', ') };
  const d = DIGRAPH_BY_STR[seq];
  if (d) return { label: d.gloss, name: null, ipa: d.ipa };
  const n = NUMBER_LABELS[seq];
  if (n) return { label: n.label, name: n.name, ipa: n.ipa };
  return { label: seq, name: null, ipa: '' };
}

// ── Unit list ──────────────────────────────────────────────────────────────

function UnitList({ state, go }) {
  const done = state.completedUnits;
  return (
    <div className="stack">
      <div>
        <span className="page-header-runes rune">ᛚᚢᚢᚾ</span>
        <h1>Learn</h1>
        <p className="muted">
          {UNITS.length} units in {PARTS.length} parts. Work through in order - each one only ever asks you
          to use runes you have already met. About ten minutes each.
        </p>
      </div>
      {PARTS.map((part) => (
        <section key={part}>
          <h2 style={{ marginBottom: '0.55rem' }}>{part}</h2>
          <div className="unit-list">
            {UNITS.filter((u) => u.part === part).map((u) => {
              const complete = done.includes(u.id);
              const runic = /^[\p{Script=Runic}\s]+$/u.test(u.subtitle);
              return (
                <button key={u.id} className={`unit${complete ? ' done' : ''}`} onClick={() => go('learn', u.id)}>
                  <span className="num">{complete ? '✓' : u.id}</span>
                  <span className="grow">
                    <span className="u-title">{u.title}</span>
                    {runic
                      ? <span className="u-runes rune">{'  '}{u.subtitle}</span>
                      : <span className="small muted"> · {u.subtitle}</span>}
                    <span className="u-blurb" style={{ display: 'block' }}>{u.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Exercise generation ────────────────────────────────────────────────────

/**
 * Deal items out without repeating.
 *
 * The reason exercises kept coming round twice: reading, typing, writing and
 * listening each shuffled the unit's word list and took the first few,
 * independently of one another. Four separate draws from the same 20 words ask
 * for 16 of them, so the same word turned up two or three times a unit even
 * though there were plenty to go round.
 *
 * One deck, dealt from the top. Only reshuffles when it runs out, and then
 * avoids repeating the word it just finished on so the seam isn't obvious.
 */
function dealer(items) {
  let deck = shuffle(items);
  let i = 0;
  return (n) => {
    const out = [];
    for (let k = 0; k < n && items.length; k++) {
      if (i >= deck.length) {
        const last = deck[deck.length - 1];
        deck = shuffle(items);
        if (deck.length > 1 && deck[0] === last) [deck[0], deck[1]] = [deck[1], deck[0]];
        i = 0;
      }
      out.push(deck[i++]);
    }
    return out;
  };
}

function buildSteps(unit) {
  const newSeqs = unit.runes || [];
  const knownSeqs = [];
  for (const u of UNITS) { if (u.id > unit.id) break; knownSeqs.push(...(u.runes || [])); }
  const pool = knownSeqs.length >= 4 ? knownSeqs : ['ᛏ', 'ᚾ', 'ᛋ', 'ᛗ', 'ᛁ', 'ᚫ', 'ᛒ', 'ᛞ'];

  const exercises = [];

  // 1. meet each new rune both ways round (shuffled order)
  for (const seq of shuffle(newSeqs)) {
    exercises.push({ type: 'identify', seq, options: shuffle([seq, ...sample(pool, 3, [seq])]) });
  }
  for (const seq of shuffle(newSeqs)) {
    exercises.push({ type: 'pick', seq, options: shuffle([seq, ...sample(pool, 3, [seq])]) });
  }

  const words = unit.words || [];
  const allWords = wordsThrough(unit.id);

  // Every word exercise below draws from this one deck, so a unit with enough
  // words never asks about the same one twice.
  const deal = dealer(words);
  const share = (want) => Math.min(want, Math.max(1, Math.ceil(words.length / 4)));

  // 2. read words - multiple choice first, then unaided
  for (const w of deal(share(5))) {
    exercises.push({ type: 'read', word: w, options: shuffle([w, ...sample(allWords, 3, [w])]) });
  }
  for (const w of deal(share(4))) {
    exercises.push({ type: 'readType', word: w });
  }

  // 3. write words
  for (const w of deal(share(5))) {
    exercises.push({ type: 'write', word: w });
  }

  // 4. listen and write
  for (const w of deal(share(2))) {
    exercises.push({ type: 'listen', word: w });
  }

  // 5. sentences
  for (const s of shuffle(unit.sentences || [])) {
    exercises.push({ type: 'sentenceType', sentence: s });
  }

  // 6. unaided reading and writing drills
  for (const s of shuffle(unit.freeRead || [])) exercises.push({ type: 'sentenceType', sentence: s });
  for (const s of shuffle(unit.freeWrite || [])) exercises.push({ type: 'writePhrase', phrase: s });

  // Shuffle exercises so runes and question types do not appear in the same order
  const steps = [{ type: 'teach' }, ...shuffle(exercises)];

  // 7. passages
  for (const p of unit.passages || []) steps.push({ type: 'passage', passage: p });

  // 8. a mixed look back
  if (unit.review || unit.finalReview) {
    const oldWords = wordsThrough(unit.id).filter((w) => !words.includes(w));
    const oldRunes = [...runesThrough(unit.id)].filter((c) => RUNE_BY_CHAR[c]);
    const n = unit.finalReview ? 10 : 5;
    for (const w of shuffle(oldWords).slice(0, n)) {
      steps.push({ type: Math.random() < 0.5 ? 'readType' : 'write', word: w, review: true });
    }
    for (const seq of shuffle(oldRunes).slice(0, unit.finalReview ? 6 : 3)) {
      steps.push({ type: 'identify', seq, options: shuffle([seq, ...sample(oldRunes, 3, [seq])]), review: true });
    }
    if (unit.finalReview) {
      for (const s of shuffle(sentencesThrough(unit.id)).slice(0, 3)) {
        steps.push({ type: 'sentenceType', sentence: s, review: true });
      }
    }
  }

  steps.push({ type: 'done' });
  return steps;
}

// ── Player ─────────────────────────────────────────────────────────────────

function LessonPlayer({ unit, state, update, go }) {
  const steps = useMemo(() => buildSteps(unit), [unit]);
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const [replayMap, setReplayMap] = useState({});
  useEffect(() => { setI(0); setAnswered(null); setScore({ right: 0, total: 0 }); }, [unit.id]);

  const step = steps[i];
  const pct = Math.round((i / (steps.length - 1)) * 100);

  const next = () => { setAnswered(null); setI((v) => Math.min(v + 1, steps.length - 1)); };

  const answer = (ok, runeSeq) => {
    setAnswered(ok ? 'ok' : 'no');
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    if (runeSeq) update((s) => { for (const ch of runeSeq) if (RUNE_BY_CHAR[ch]) recordAnswer(s, ch, ok); });
  };

  const finish = () => {
    update((s) => {
      if (!s.completedUnits.includes(unit.id)) s.completedUnits.push(unit.id);
      s.sessionCount = (s.sessionCount || 0) + 1;
    });
    go('learn');
  };

  const common = { key: i, step, answered, onAnswer: answer, onNext: next };

  return (
    <div className="stack">
      <div className="spread">
        <button className="btn ghost small" onClick={() => go('learn')}>← All units</button>
        <span className="small muted">
          Unit {unit.id} · {unit.title}
          {score.total > 0 && ` · ${score.right}/${score.total}`}
        </span>
      </div>
      <div className="progress"><i style={{ width: `${pct}%` }} /></div>

      {step.review && <span className="pill">Review</span>}

      {step.type === 'teach' && <Teach unit={unit} onNext={next} replayMap={replayMap} setReplayMap={setReplayMap} />}
      {step.type === 'identify' && <Identify {...common} />}
      {step.type === 'pick' && <Pick {...common} />}
      {step.type === 'read' && <ReadChoice {...common} />}
      {step.type === 'readType' && <ReadType {...common} />}
      {step.type === 'write' && <WriteWord {...common} unit={unit} />}
      {step.type === 'listen' && <Listen {...common} unit={unit} />}
      {step.type === 'sentenceType' && <SentenceType {...common} />}
      {step.type === 'writePhrase' && <WritePhrase {...common} unit={unit} />}
      {step.type === 'passage' && <Passage {...common} />}
      {step.type === 'done' && (
        (() => {
          const wrong = score.total - score.right;
          const passed = wrong <= 2;
          return passed ? (
            <div className="card center stack">
              <div className="rune" style={{ fontSize: '3rem', color: 'var(--accent)' }}>ᚹᛖᛚ᛫ᛞᚢᚾ</div>
              <h2>Unit {unit.id} complete</h2>
              <p className="muted">
                That says <em>well done</em>. {score.total > 0 && `You got ${score.right} of ${score.total}.`}
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn primary" onClick={finish}>Finish unit</button>
                <button className="btn" onClick={() => { setI(0); setAnswered(null); setScore({ right: 0, total: 0 }); }}>
                  Run it again
                </button>
              </div>
            </div>
          ) : (
            <div className="card center stack">
              <div className="rune" style={{ fontSize: '3rem', color: 'var(--bad)' }}>ᚾᛟᛏ᛫ᚳᚹᛡᛏ</div>
              <h2>Unit not passed</h2>
              <p className="muted">
                That says <em>not quite</em>. You got {wrong} wrong (limit is 2).
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn primary" onClick={() => { setI(0); setAnswered(null); setScore({ right: 0, total: 0 }); }}>
                  Try again
                </button>
                <button className="btn" onClick={() => go('learn')}>Back to units</button>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

// ── Teaching screen ────────────────────────────────────────────────────────

function Teach({ unit, onNext, replayMap, setReplayMap }) {
  const triggerReplay = (seq) => setReplayMap((prev) => ({ ...prev, [seq]: (prev[seq] || 0) + 1 }));

  return (
    <div className="stack">
      <div>
        <span className="pill accent">{unit.part}</span>
        <h1 style={{ marginTop: '0.4rem' }}>{unit.title}</h1>
        <p className="muted">{unit.blurb}</p>
      </div>

      {unit.runes.length > 0 && (
        <div className="card">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'max-content 1fr',
              gap: '1rem 1.5rem',
              alignItems: 'flex-start',
            }}
          >
            {unit.runes.map((seq, idx) => {
              const d = describe(seq);
              const single = seq.length === 1;
              const meta = RUNE_BY_CHAR[seq] || DIGRAPH_BY_STR[seq];
              return (
                <Fragment key={seq}>
                  <div
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                      paddingTop: idx > 0 ? '0.9rem' : 0,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                    }}
                  >
                    {single ? (
                      <div className="stack" style={{ alignItems: 'center', gap: '0.2rem', minWidth: 92 }}>
                        <div onClick={() => triggerReplay(seq)} style={{ cursor: 'pointer' }} title="Click to replay drawing animation">
                          <StrokeDiagram rune={seq} size={92} animate loop={false} replayKey={replayMap[seq] || 0} />
                        </div>
                        <button className="btn small ghost" onClick={() => triggerReplay(seq)} style={{ padding: '0.15rem 0.4rem', fontSize: '0.78rem' }}>
                          ↻ Replay
                        </button>
                      </div>
                    ) : (
                      <div
                        className="rune"
                        style={{
                          fontSize: '2.6rem',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.1,
                          minWidth: 92,
                          textAlign: 'center',
                        }}
                      >
                        {seq}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                      paddingTop: idx > 0 ? '0.9rem' : 0,
                      minWidth: 180,
                    }}
                  >
                    <div className="row" style={{ gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{d.name || seq}</strong>
                      {d.ipa && <span className="pill">/{d.ipa}/</span>}
                      <SpeakButton runic={seq} />
                    </div>
                    <div className="small">{d.label}</div>
                    {meta?.eg && (
                      <div className="small muted">
                        {meta.eg.map((e, k) => <span key={k}>{k > 0 && ' · '}<Example text={e} /></span>)}
                      </div>
                    )}
                    {meta?.note && <div className="tiny muted" style={{ marginTop: '0.35rem' }}>{meta.note}</div>}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '0.6rem' }}>What to remember</h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {unit.teach.map((t, k) => (
            <li key={k} style={{ marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: mdish(t) }} />
          ))}
        </ul>
      </div>

      <button className="btn primary" onClick={onNext}>Start the exercises</button>
    </div>
  );
}

function mdish(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/([ᚠ-᛿]+)/g, '<span class="rune">$1</span>');
}

function Example({ text }) {
  const parts = text.split(/[{}]/);
  return <em>{parts.map((p, k) => (k % 2 ? <strong key={k}>{p}</strong> : <span key={k}>{p}</span>))}</em>;
}

// ── Exercise shells ────────────────────────────────────────────────────────

function Shell({ title, hint, children, answered, onNext, feedback }) {
  return (
    <div className="stack">
      <div>
        <h2>{title}</h2>
        {hint && <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{hint}</p>}
      </div>
      {children}
      {answered && (
        <>
          <div className={`feedback ${answered === 'ok' ? 'ok' : 'no'}`}>{feedback}</div>
          <button className="btn primary" onClick={onNext} autoFocus>Continue</button>
        </>
      )}
    </div>
  );
}

function TypeAnswer({ value, onChange, onSubmit, disabled, placeholder, big }) {
  return (
    <form
      className="row"
      onSubmit={(e) => { e.preventDefault(); if (!disabled && value.trim()) onSubmit(); }}
    >
      <input
        type="text"
        className="grow"
        style={big ? { fontSize: '1.15rem' } : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <button className="btn primary" type="submit" disabled={disabled || !value.trim()}>Check</button>
    </form>
  );
}

// ── The exercises ──────────────────────────────────────────────────────────

function Identify({ step, answered, onAnswer, onNext }) {
  const d = describe(step.seq);
  return (
    <Shell
      title="What sound is this?"
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? `Yes - ${d.label}.` : `This one is ${d.label}${d.name ? ` (${d.name})` : ''}.`}
    >
      <div className="card center">
        <div className="prompt-rune rune">{step.seq}</div>
        <SpeakButton runic={step.seq} label="Hear it" />
      </div>
      <div className="choices">
        {step.options.map((o) => (
          <button
            key={o}
            className={`choice${answered && o === step.seq ? ' correct' : ''}`}
            disabled={!!answered}
            onClick={() => onAnswer(o === step.seq, step.seq)}
          >
            {describe(o).label}
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Pick({ step, answered, onAnswer, onNext }) {
  const d = describe(step.seq);
  return (
    <Shell
      title="Which rune?"
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Correct.' : `It's ${step.seq} - ${d.label}.`}
    >
      <div className="card center">
        <div className="prompt-word">{d.label}</div>
        {d.name && <div className="muted small">called “{d.name}”</div>}
      </div>
      <div className="choices">
        {step.options.map((o) => (
          <button
            key={o}
            className={`choice${answered && o === step.seq ? ' correct' : ''}`}
            disabled={!!answered}
            onClick={() => onAnswer(o === step.seq, step.seq)}
          >
            <span className="c-rune rune">{o}</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function ReadChoice({ step, unit, answered, onAnswer, onNext }) {
  const runic = transliterateWord(step.word, { ligatures: unit.id >= 13 }).runes;
  return (
    <Shell
      title="Read this word"
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok'
        ? `Right - ${runic} is “${step.word}”.`
        : `It says “${step.word}”. Sound it out: ${readAloud(runic)}.`}
    >
      <div className="card center">
        <div className="prompt-rune rune">{runic}</div>
        <SpeakButton runic={runic} label="Hear it" />
      </div>
      <div className="choices">
        {step.options.map((o) => (
          <button
            key={o}
            className={`choice${answered && o === step.word ? ' correct' : ''}`}
            disabled={!!answered}
            onClick={() => onAnswer(o === step.word, runic)}
          >
            {o}
          </button>
        ))}
      </div>
    </Shell>
  );
}

function ReadType({ step, unit, answered, onAnswer, onNext }) {
  const runic = transliterateWord(step.word, { ligatures: unit.id >= 13 }).runes;
  const [typed, setTyped] = useState('');
  return (
    <Shell
      title="What does this say?"
      hint="No options this time - sound it out and type the English."
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok'
        ? 'Correct.'
        : `It says “${step.word}” - ${readAloud(runic)}.`}
    >
      <div className="card center">
        <div className="prompt-rune rune">{runic}</div>
        <SpeakButton runic={runic} label="Hear it" />
      </div>
      <TypeAnswer
        value={typed}
        onChange={setTyped}
        disabled={!!answered}
        placeholder="type the English word"
        onSubmit={() => onAnswer(normalise(typed) === normalise(step.word), runic)}
      />
    </Shell>
  );
}

function SentenceType({ step, unit, answered, onAnswer, onNext }) {
  const runic = transliterate(step.sentence, { ligatures: unit.id >= 13 }).text;
  const [typed, setTyped] = useState('');
  return (
    <Shell
      title="Read the sentence"
      hint="Type what it says. Punctuation and capitals don't matter."
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Correct.' : `It says: “${step.sentence}”`}
    >
      <div className="card center stack" style={{ padding: '1.25rem' }}>
        <RuneTextReader runic={runic} label="Hear it" fontSize="clamp(1.35rem, 4.5vw, 2rem)" />
      </div>
      <TypeAnswer
        big
        value={typed}
        onChange={setTyped}
        disabled={!!answered}
        placeholder="type the English"
        onSubmit={() => onAnswer(normalise(typed) === normalise(step.sentence), '')}
      />
    </Shell>
  );
}

function RuneKeyboard({ unitId, target, altTarget = '', onKey, disabled }) {
  const keys = useMemo(() => {
    const known = [...runesThrough(unitId)];
    const needed1 = [...new Set(target.replace(new RegExp(SEP, 'g'), '').split(''))];
    const needed2 = unitId >= 13
      ? [...new Set(altTarget.replace(new RegExp(SEP, 'g'), '').split(''))]
      : [];
    return [...new Set([...needed1, ...needed2, ...known])].filter((k) => k.trim()).sort();
  }, [unitId, target, altTarget]);
  return (
    <div className="rune-keys">
      {keys.map((k) => (
        <button key={k} disabled={disabled} onClick={() => onKey(k)}>{k}</button>
      ))}
      <button disabled={disabled} onClick={() => onKey(SEP)} title="word separator">{SEP}</button>
    </div>
  );
}

function Builder({ title, hint, prompt, target, altTarget = '', unit, answered, onAnswer, onNext, extra }) {
  const [typed, setTyped] = useState('');
  const isMatch = typed === target || (altTarget && typed === altTarget);
  return (
    <Shell
      title={title}
      hint={hint}
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Exactly right.' : `Not quite - it's ${target}.`}
    >
      {prompt}
      <div className="answer-box rune">
        {typed || <span className="muted" style={{ fontSize: '1rem', fontFamily: 'var(--sans)' }}>tap the runes below</span>}
      </div>
      <div className="row">
        <button className="btn small" disabled={!typed || !!answered} onClick={() => setTyped((t) => t.slice(0, -1))}>Delete</button>
        <button className="btn small" disabled={!typed || !!answered} onClick={() => setTyped('')}>Clear</button>
        <span className="grow" />
        <button className="btn primary small" disabled={!typed || !!answered} onClick={() => onAnswer(isMatch, target)}>Check</button>
      </div>
      <RuneKeyboard unitId={unit.id} target={target} altTarget={altTarget} disabled={!!answered} onKey={(k) => setTyped((t) => t + k)} />
      {answered === 'no' && (
        <div className="card small">
          <div className="muted">You wrote <span className="rune" style={{ fontSize: '1.4rem' }}>{typed}</span></div>
          <div className="muted">Answer <span className="rune" style={{ fontSize: '1.4rem' }}>{target}</span> - {readAloud(target)}</div>
        </div>
      )}
      {extra}
    </Shell>
  );
}

function WriteWord({ step, unit, answered, onAnswer, onNext }) {
  const useLigatures = unit.id >= 13;
  const target = transliterateWord(step.word, { ligatures: useLigatures }).runes;
  const altTarget = transliterateWord(step.word, { ligatures: !useLigatures }).runes;
  return (
    <Builder
      title={`Write “${step.word}” in runes`}
      hint="Sound out each part and tap the runes in order."
      prompt={<div className="card center"><div className="prompt-word">{step.word}</div></div>}
      target={target}
      altTarget={altTarget}
      unit={unit}
      answered={answered}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

function WritePhrase({ step, unit, answered, onAnswer, onNext }) {
  const useLigatures = unit.id >= 13;
  const target = transliterate(step.phrase, { ligatures: useLigatures }).text;
  const altTarget = transliterate(step.phrase, { ligatures: !useLigatures }).text;
  return (
    <Builder
      title="Write this in runes"
      hint={`Use ${SEP} between words.`}
      prompt={<div className="card center"><div className="prompt-word" style={{ fontSize: '1.4rem' }}>{step.phrase}</div></div>}
      target={target}
      altTarget={altTarget}
      unit={unit}
      answered={answered}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

function Listen({ step, unit, answered, onAnswer, onNext }) {
  const useLigatures = unit.id >= 13;
  const target = transliterateWord(step.word, { ligatures: useLigatures }).runes;
  const altTarget = transliterateWord(step.word, { ligatures: !useLigatures }).runes;
  return (
    <Builder
      title="Listen, then write it"
      hint="Play it as often as you like."
      prompt={<div className="card center"><SpeakButton runic={target} label="Listen to the word" /></div>}
      target={target}
      altTarget={altTarget}
      unit={unit}
      answered={answered}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

function Passage({ step, unit, answered, onAnswer, onNext }) {
  const runic = transliterate(step.passage.english, { ligatures: unit.id >= 13 }).text;
  const [revealed, setRevealed] = useState(false);
  return (
    <Shell
      title={step.passage.title}
      hint="Read it through, aloud if you can. Reveal the English when you want to check."
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Good - that is reading.' : 'Worth another pass later.'}
    >
      <div className="card stack" style={{ gap: '1rem', padding: '1.25rem' }}>
        <RuneTextReader runic={runic} label="Hear it" fontSize="clamp(1.15rem, 3.6vw, 1.6rem)" />
        <div className="row" style={{ marginTop: '0.4rem' }}>
          <button className="btn small" onClick={() => setRevealed((v) => !v)}>
            {revealed ? 'Hide the English' : 'Show the English'}
          </button>
        </div>
        {revealed && (
          <p style={{ marginTop: '0.5rem', paddingTop: '0.9rem', borderTop: '1px solid var(--line)' }}>
            {step.passage.english}
          </p>
        )}
      </div>
      {!answered && revealed && (
        <div className="row">
          <button className="btn primary grow" onClick={() => onAnswer(true, '')}>I read that correctly</button>
          <button className="btn grow" onClick={() => onAnswer(false, '')}>I struggled</button>
        </div>
      )}
      {!answered && !revealed && <p className="small muted">Reveal the English to carry on.</p>}
    </Shell>
  );
}
