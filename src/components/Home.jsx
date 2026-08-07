import { UNITS, PARTS } from '../data/lessons.js';
import { RUNES } from '../data/runes.js';
import { accuracy, learnedCount } from '../lib/progress.js';

export default function Home({ state, go }) {
  const done = state.completedUnits.length;
  const acc = accuracy(state);
  const learned = learnedCount(state);
  const next = UNITS.find((u) => !state.completedUnits.includes(u.id)) || UNITS[UNITS.length - 1];

  return (
    <div className="stack" style={{ gap: '1.75rem' }}>
      <section className="hero">
        <div className="big-runes rune">ᚱᚣᚣᚾᛋ</div>
        <h1>Read and write English in runes</h1>
        <p>
          A complete beginner's course in the Anglo-Saxon futhorc, adapted to a British accent.
          {UNITS.length} short units take you from knowing nothing to reading whole passages.
        </p>
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="btn primary" onClick={() => go('learn', next.id)}>
            {done ? `Continue — Unit ${next.id}` : 'Start Unit 1'}
          </button>
          <button className="btn" onClick={() => go('print')}>Print a practice sheet</button>
        </div>
      </section>

      {(done > 0 || learned > 0) && (
        <section className="stat-row">
          <div className="stat"><div className="v">{done}<span className="muted small">/{UNITS.length}</span></div><div className="k">Units done</div></div>
          <div className="stat"><div className="v">{learned}<span className="muted small">/{RUNES.length}</span></div><div className="k">Runes known</div></div>
          <div className="stat"><div className="v">{acc === null ? '—' : `${acc}%`}</div><div className="k">Accuracy</div></div>
        </section>
      )}

      <section>
        <h2 style={{ marginBottom: '0.75rem' }}>Where to go</h2>
        <div className="tiles">
          <button className="tile" onClick={() => go('learn')}>
            <span className="t-rune rune">ᛚᛖᛋᚢᚾᛋ</span>
            <h3>Lessons</h3>
            <p>{UNITS.length} units in {PARTS.length} parts. Each teaches a handful of runes, then makes you use them.</p>
          </button>
          <button className="tile" onClick={() => go('reference')}>
            <span className="t-rune rune">ᚱᚣᚣᚾᛋ</span>
            <h3>The runes</h3>
            <p>All {RUNES.length}, with names, sounds, examples and how to draw each one.</p>
          </button>
          <button className="tile" onClick={() => go('practice')}>
            <span className="t-rune rune">ᛈᚱᚫᚳᛏᛁᛋᛋ</span>
            <h3>Practice</h3>
            <p>Quick drills that come back to whatever you keep getting wrong.</p>
          </button>
          <button className="tile" onClick={() => go('write')}>
            <span className="t-rune rune">ᚱᛡᛏ</span>
            <h3>Write anything</h3>
            <p>Type English, get runes. Or paste runes and have them read back to you.</p>
          </button>
          <button className="tile" onClick={() => go('print')}>
            <span className="t-rune rune">ᛈᚱᛁᚾᛏ</span>
            <h3>Printable sheets</h3>
            <p>Stroke-order guide, wall chart, cut-out flashcards and worksheets.</p>
          </button>
        </div>
      </section>

      <section className="card">
        <h2>How this system works</h2>
        <p className="muted small" style={{ marginBottom: '0.9rem' }}>
          The three things that trip people up, up front.
        </p>
        <div className="stack" style={{ gap: '0.7rem' }}>
          <div>
            <strong>1. Spell what you hear, not what you'd type.</strong>
            <p className="small muted" style={{ margin: '0.2rem 0 0' }}>
              Runes are phonetic. <em>Laugh</em> is <span className="rune">ᛚᚪᚠᚠ</span> and <em>through</em> is <span className="rune">ᚦᚱᚣᚣ</span>. Silent letters simply vanish.
            </p>
          </div>
          <div>
            <strong>2. Double a vowel to make it long.</strong>
            <p className="small muted" style={{ margin: '0.2rem 0 0' }}>
              <span className="rune">ᛁ</span> is the i of <em>sit</em>; <span className="rune">ᛁᛁ</span> is the ee of <em>seed</em>. One rule covers every long vowel.
            </p>
          </div>
          <div>
            <strong>3. Only write <span className="rune">ᚱ</span> when you actually say it.</strong>
            <p className="small muted" style={{ margin: '0.2rem 0 0' }}>
              In a British accent that means before a vowel. <em>Car</em> is <span className="rune">ᚳᚪ</span>, but <em>carry</em> is <span className="rune">ᚳᚫᚱᛁ</span>.
            </p>
          </div>
        </div>
      </section>

      <p className="tiny muted">
        Based on the futhorc system devised by{' '}
        <a href="https://www.harysdalvi.com/futhorc" target="_blank" rel="noreferrer">Harys Dalvi</a>{' '}
        (<a href="https://github.com/crackalamoo/futhorc" target="_blank" rel="noreferrer">source</a>), with the vowels re-mapped for British English.
        Rune shapes come from Noto Sans Runic.
      </p>
    </div>
  );
}
