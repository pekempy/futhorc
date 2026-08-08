import { useState, useEffect, useRef, Fragment } from 'react';
import { RUNES, RUNE_BY_CHAR, DIGRAPHS, FUTHORC_ORDER, PUNCTUATION } from '../data/runes.js';
import { GLYPHS } from '../data/glyphs.js';
import { NUMBER_REFERENCE_TABLE } from '../lib/numbers.js';
import StrokeDiagram from './StrokeDiagram.jsx';
import SpeakButton from './SpeakButton.jsx';

const ORDERS = [
  ['futhorc', 'Traditional order'],
  ['kind', 'Grouped by sound'],
];

export default function Reference({ focus }) {
  const [order, setOrder] = useState('futhorc');
  const [sel, setSel] = useState(focus && RUNE_BY_CHAR[focus] ? focus : RUNES[0].r);
  const [replay, setReplay] = useState(0);
  const cardRef = useRef(null);

  const select = (r) => { setSel(r); setReplay((v) => v + 1); };

  useEffect(() => {
    if (sel && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [sel, replay]);

  const list = order === 'futhorc'
    ? FUTHORC_ORDER.map((c) => RUNE_BY_CHAR[c]).filter(Boolean)
    : [...RUNES].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

  const r = RUNE_BY_CHAR[sel];

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <span className="page-header-runes rune">ᚱᚣᚣᚾᛋ</span>
          <h1>Runes</h1>
          <p className="muted small" style={{ margin: 0 }}>Thirty runes. Tap one to see how it's drawn.</p>
        </div>
        <div className="row">
          {ORDERS.map(([id, label]) => (
            <button key={id} className={`btn small${order === id ? ' primary' : ''}`} onClick={() => setOrder(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="ref-split-layout">
        <div className="ref-preview-col">
          {r && (
            <div className="card sticky-preview">
              <div className="stack" style={{ gap: '0.8rem', alignItems: 'center', textAlignment: 'center' }}>
                <StrokeDiagram rune={r.r} size={150} animate replayKey={replay} />
                <button className="btn small ghost" onClick={() => setReplay((v) => v + 1)}>↻ Replay</button>
              </div>

              <div style={{ marginTop: '0.8rem' }}>
                <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <h2>{r.name}</h2>
                  <span className="rune" style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>{r.runic}</span>
                  <span className="pill accent">/{r.ipa.join(', ')}/</span>
                  <span className="pill">{r.kind}</span>
                </div>
                <p style={{ margin: '0.4rem 0' }}>{r.gloss}</p>
                <p className="small muted" style={{ margin: '0 0 0.5rem' }}>
                  {r.eg.map((e, k) => <span key={k}>{k > 0 && ' · '}<Ex text={e} /></span>)}
                </p>
                <SpeakButton runic={r.r} label="Hear the sound" />
                {r.note && <p className="small" style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--line)' }}>{r.note}</p>}
                <p className="tiny muted" style={{ margin: '0.5rem 0 0' }}>
                  {GLYPH_STROKES(r.r)} strokes · draw them in the numbered order, following the arrows.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="ref-buttons-col">
          <div className="ref-grid">
            {list.map((x) => (
              <button key={x.r} className={`ref-cell${x.r === sel ? ' on' : ''}`} onClick={() => select(x.r)}>
                <span className="g rune">{x.r}</span>
                <span className="n">{x.name}</span>
                <span className="s">{x.gloss.split(',')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h2 style={{ marginBottom: '0.6rem' }}>Sounds written with two runes</h2>
        <table className="chart">
          <thead><tr><th>Runes</th><th>Sound</th><th>As in</th></tr></thead>
          <tbody>
            {DIGRAPHS.map((d) => (
              <tr key={d.d}>
                <td className="r rune">{d.d}</td>
                <td>{d.gloss} <span className="muted tiny">/{d.ipa}/</span></td>
                <td className="small">{d.eg.map((e, k) => <span key={k}>{k > 0 && ' · '}<Ex text={e} /></span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ marginBottom: '0.6rem' }}>Punctuation</h2>
        <table className="chart">
          <tbody>
            {PUNCTUATION.map((p) => (
              <tr key={p.r}>
                <td className="r rune">{p.r}</td>
                <td><strong>{p.name}</strong> - {p.gloss}</td>
                <td className="rune" style={{ fontSize: '1.1rem' }}>{p.eg || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ marginBottom: '0.6rem' }}>Anglo-Saxon Runic Numbers (Spelled Out)</h2>
        <p className="muted small" style={{ marginBottom: '0.8rem' }}>
          In historical Anglo-Saxon inscriptions, numbers were written out as spelled phonetic words in Futhorc runes.
        </p>
        <table className="chart">
          <thead>
            <tr>
              <th>Number</th>
              <th>Old English Name</th>
              <th>Runic Spelling</th>
            </tr>
          </thead>
          <tbody>
            {NUMBER_REFERENCE_TABLE.map((n) => (
              <tr key={n.val}>
                <td><strong>{n.val}</strong></td>
                <td><em>{n.oe}</em></td>
                <td className="r rune" style={{ fontSize: '1.4rem', textAlign: 'left', width: 'auto' }}>
                  {n.runes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Ex({ text }) {
  const parts = text.split(/[{}]/);
  return <em>{parts.map((p, k) => (k % 2 ? <strong key={k}>{p}</strong> : <span key={k}>{p}</span>))}</em>;
}

function GLYPH_STROKES(rune) {
  return GLYPHS[rune]?.strokes.length ?? '-';
}
