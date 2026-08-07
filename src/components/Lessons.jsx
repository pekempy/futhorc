import { useEffect, useMemo, useState } from 'react';
import { UNITS, PARTS, runesThrough, wordsThrough, sentencesThrough } from '../data/lessons.js';
import { RUNE_BY_CHAR, DIGRAPH_BY_STR, SEP } from '../data/runes.js';
import { transliterate, transliterateWord, readAloud } from '../lib/transliterate.js';
import { recordAnswer } from '../lib/progress.js';
import StrokeDiagram from './StrokeDiagram.jsx';
import SpeakButton from './SpeakButton.jsx';

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

function describe(seq) {
  const r = RUNE_BY_CHAR[seq];
  if (r) return { label: r.gloss, name: r.name, ipa: r.ipa.join(', ') };
  const d = DIGRAPH_BY_STR[seq];
  if (d) return { label: d.gloss, name: null, ipa: d.ipa };
  return { label: seq, name: null, ipa: '' };
}

// ── Unit list ──────────────────────────────────────────────────────────────

function UnitList({ state, go }) {
  const done = state.completedUnits;
  return (
    <div className="stack">
      <div>
        <h1>The course</h1>
        <p className="muted">
          Eighteen units in five parts. Work through in order — each one only ever asks you
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

function buildSteps(unit) {
  const steps = [{ type: 'teach' }];
  const newSeqs = unit.runes || [];
  const knownSeqs = [];
  for (const u of UNITS) { if (u.id > unit.id) break; knownSeqs.push(...(u.runes || [])); }
  const pool = knownSeqs.length >= 4 ? knownSeqs : ['ᛏ', 'ᚾ', 'ᛋ', 'ᛗ', 'ᛁ', 'ᚫ', 'ᛒ', 'ᛞ'];

  // 1. meet each new rune both ways round
  for (const seq of newSeqs) {
    steps.push({ type: 'identify', seq, options: shuffle([seq, ...sample(pool, 3, [seq])]) });
  }
  for (const seq of shuffle(newSeqs)) {
    steps.push({ type: 'pick', seq, options: shuffle([seq, ...sample(pool, 3, [seq])]) });
  }

  const words = unit.words || [];
  const allWords = wordsThrough(unit.id);

  // 2. read words — multiple choice first, then unaided
  const mcWords = shuffle(words).slice(0, Math.min(5, words.length));
  for (const w of mcWords) {
    steps.push({ type: 'read', word: w, options: shuffle([w, ...sample(allWords, 3, [w])]) });
  }
  for (const w of sample(words, Math.min(4, words.length), mcWords)) {
    steps.push({ type: 'readType', word: w });
  }

  // 3. write words
  for (const w of shuffle(words).slice(0, Math.min(5, words.length))) {
    steps.push({ type: 'write', word: w });
  }

  // 4. listen and write
  for (const w of shuffle(words).slice(0, Math.min(2, words.length))) {
    steps.push({ type: 'listen', word: w });
  }

  // 5. sentences
  for (const s of unit.sentences || []) {
    steps.push({ type: 'sentenceType', sentence: s });
  }

  // 6. unaided reading and writing drills
  for (const s of unit.freeRead || []) steps.push({ type: 'sentenceType', sentence: s });
  for (const s of unit.freeWrite || []) steps.push({ type: 'writePhrase', phrase: s });

  // 7. passages
  for (const p of unit.passages || []) steps.push({ type: 'passage', passage: p });

  // 8. a mixed look back
  if (unit.review || unit.finalReview) {
    const back = unit.finalReview ? 1 : Math.max(1, unit.id - 3);
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
    void back;
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

      {step.type === 'teach' && <Teach unit={unit} onNext={next} />}
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
      )}
    </div>
  );
}

// ── Teaching screen ────────────────────────────────────────────────────────

function Teach({ unit, onNext }) {
  return (
    <div className="stack">
      <div>
        <span className="pill accent">{unit.part}</span>
        <h1 style={{ marginTop: '0.4rem' }}>{unit.title}</h1>
        <p className="muted">{unit.blurb}</p>
      </div>

      {unit.runes.length > 0 && (
        <div className="card">
          <div className="stack">
            {unit.runes.map((seq) => {
              const d = describe(seq);
              const single = seq.length === 1;
              const meta = RUNE_BY_CHAR[seq] || DIGRAPH_BY_STR[seq];
              return (
                <div key={seq} className="row" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--line)', paddingTop: '0.9rem' }}>
                  {single
                    ? <StrokeDiagram rune={seq} size={92} animate />
                    : <div className="rune" style={{ fontSize: '2.6rem', width: 92, textAlign: 'center' }}>{seq}</div>}
                  <div className="grow" style={{ minWidth: 180 }}>
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
                </div>
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
      feedback={answered === 'ok' ? `Yes — ${d.label}.` : `This one is ${d.label}${d.name ? ` (${d.name})` : ''}.`}
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
      feedback={answered === 'ok' ? 'Correct.' : `It's ${step.seq} — ${d.label}.`}
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

function ReadChoice({ step, answered, onAnswer, onNext }) {
  const runic = transliterateWord(step.word).runes;
  return (
    <Shell
      title="Read this word"
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok'
        ? `Right — ${runic} is “${step.word}”.`
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

function ReadType({ step, answered, onAnswer, onNext }) {
  const runic = transliterateWord(step.word).runes;
  const [typed, setTyped] = useState('');
  return (
    <Shell
      title="What does this say?"
      hint="No options this time — sound it out and type the English."
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok'
        ? 'Correct.'
        : `It says “${step.word}” — ${readAloud(runic)}.`}
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

function SentenceType({ step, answered, onAnswer, onNext }) {
  const runic = toRunes(step.sentence);
  const [typed, setTyped] = useState('');
  return (
    <Shell
      title="Read the sentence"
      hint="Type what it says. Punctuation and capitals don't matter."
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Correct.' : `It says: “${step.sentence}”`}
    >
      <div className="card center">
        <div className="rune" style={{ fontSize: 'clamp(1.35rem, 4.5vw, 2rem)', lineHeight: 1.7 }}>{runic}</div>
        <SpeakButton runic={runic} label="Hear it" />
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

function RuneKeyboard({ unitId, target, onKey, disabled }) {
  const keys = useMemo(() => {
    const known = [...runesThrough(unitId)];
    const needed = [...new Set(target.replace(new RegExp(SEP, 'g'), '').split(''))];
    return [...new Set([...needed, ...known])].filter((k) => k.trim()).sort();
  }, [unitId, target]);
  return (
    <div className="rune-keys">
      {keys.map((k) => (
        <button key={k} disabled={disabled} onClick={() => onKey(k)}>{k}</button>
      ))}
      <button disabled={disabled} onClick={() => onKey(SEP)} title="word separator">{SEP}</button>
    </div>
  );
}

function Builder({ title, hint, prompt, target, unit, answered, onAnswer, onNext, extra }) {
  const [typed, setTyped] = useState('');
  return (
    <Shell
      title={title}
      hint={hint}
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Exactly right.' : `Not quite — it's ${target}.`}
    >
      {prompt}
      <div className="answer-box rune">
        {typed || <span className="muted" style={{ fontSize: '1rem', fontFamily: 'var(--sans)' }}>tap the runes below</span>}
      </div>
      <div className="row">
        <button className="btn small" disabled={!typed || !!answered} onClick={() => setTyped((t) => t.slice(0, -1))}>Delete</button>
        <button className="btn small" disabled={!typed || !!answered} onClick={() => setTyped('')}>Clear</button>
        <span className="grow" />
        <button className="btn primary small" disabled={!typed || !!answered} onClick={() => onAnswer(typed === target, target)}>Check</button>
      </div>
      <RuneKeyboard unitId={unit.id} target={target} disabled={!!answered} onKey={(k) => setTyped((t) => t + k)} />
      {answered === 'no' && (
        <div className="card small">
          <div className="muted">You wrote <span className="rune" style={{ fontSize: '1.4rem' }}>{typed}</span></div>
          <div className="muted">Answer <span className="rune" style={{ fontSize: '1.4rem' }}>{target}</span> — {readAloud(target)}</div>
        </div>
      )}
      {extra}
    </Shell>
  );
}

function WriteWord({ step, unit, answered, onAnswer, onNext }) {
  const target = transliterateWord(step.word).runes;
  return (
    <Builder
      title={`Write “${step.word}” in runes`}
      target={target}
      unit={unit}
      answered={answered}
      onAnswer={onAnswer}
      onNext={onNext}
      prompt={null}
    />
  );
}

function WritePhrase({ step, unit, answered, onAnswer, onNext }) {
  const target = toRunes(step.phrase);
  return (
    <Builder
      title="Write this in runes"
      hint={`Use ${SEP} between words.`}
      target={target}
      unit={unit}
      answered={answered}
      onAnswer={onAnswer}
      onNext={onNext}
      prompt={<div className="card center"><div className="prompt-word">{step.phrase}</div></div>}
    />
  );
}

function Listen({ step, unit, answered, onAnswer, onNext }) {
  const target = transliterateWord(step.word).runes;
  return (
    <Builder
      title="Listen, then write it"
      hint="Play it as often as you like."
      target={target}
      unit={unit}
      answered={answered}
      onAnswer={onAnswer}
      onNext={onNext}
      prompt={
        <div className="card center stack" style={{ alignItems: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🔊</div>
          <SpeakButton runic={target} label="Play the word" />
        </div>
      }
      extra={answered ? <div className="small muted">The word was “{step.word}”.</div> : null}
    />
  );
}

function Passage({ step, answered, onAnswer, onNext }) {
  const runic = toRunes(step.passage.english);
  const [revealed, setRevealed] = useState(false);
  return (
    <Shell
      title={step.passage.title}
      hint="Read it through, aloud if you can. Reveal the English when you want to check."
      answered={answered}
      onNext={onNext}
      feedback={answered === 'ok' ? 'Good — that is reading.' : 'Worth another pass later.'}
    >
      <div className="card">
        <div className="rune" style={{ fontSize: 'clamp(1.15rem, 3.6vw, 1.6rem)', lineHeight: 1.9 }}>{runic}</div>
        <div className="row" style={{ marginTop: '0.9rem' }}>
          <SpeakButton runic={runic} label="Hear it" />
          <button className="btn small" onClick={() => setRevealed((v) => !v)}>
            {revealed ? 'Hide the English' : 'Show the English'}
          </button>
        </div>
        {revealed && (
          <p style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--line)' }}>
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
