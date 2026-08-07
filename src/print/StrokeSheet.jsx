import { FUTHORC_ORDER, RUNE_BY_CHAR } from '../data/runes.js';
import { GLYPHS, outlineTransform } from '../data/glyphs.js';
import { Arrow, strokePath } from '../components/StrokeDiagram.jsx';
import { SAY } from '../lib/phonology.js';

const PER_PAGE = 7;

/**
 * How to write each rune: the finished shape, the numbered strokes with
 * direction arrows, then faint outlines to trace and empty boxes to copy into.
 */
export default function StrokeSheet() {
  const runes = FUTHORC_ORDER.filter((c) => RUNE_BY_CHAR[c]);
  const pages = [];
  for (let i = 0; i < runes.length; i += PER_PAGE) pages.push(runes.slice(i, i + PER_PAGE));

  return (
    <>
      {pages.map((page, p) => (
        <div className="sheet" key={p}>
          <h1>How to write the runes</h1>
          <div className="sheet-sub">
            Follow the numbers; the arrow shows which way the pen travels.
            Trace the grey shapes, then write your own in the empty boxes.
            {' '}Page {p + 1} of {pages.length}.
          </div>
          <div className="stroke-rows">
            {page.map((c) => <Row key={c} rune={c} />)}
          </div>
          <div style={{ fontSize: '7.5pt', color: '#777', marginTop: '4mm', borderTop: '1px solid #ddd', paddingTop: '2mm' }}>
            Futhorc for British English · rune shapes from Noto Sans Runic
          </div>
        </div>
      ))}
    </>
  );
}

function Row({ rune }) {
  const r = RUNE_BY_CHAR[rune];
  const g = GLYPHS[rune];
  return (
    <div className="stroke-row">
      <div className="info">
        <div className="nm">
          <span className="rune" style={{ fontSize: '16pt', marginRight: '2mm' }}>{rune}</span>
          {r.name}
        </div>
        <div className="sd">{r.gloss}</div>
        <div className="ex">
          /{r.ipa.join(', ')}/ · say “{r.ipa.map((p) => SAY[p] ?? p).join('/')}” · {g.strokes.length} stroke{g.strokes.length > 1 ? 's' : ''}
        </div>
        <div className="ex">
          {r.eg.map((e) => e.replace(/[{}]/g, '')).join(', ')}
        </div>
        <div className="ex">
          in runes: <span className="rune" style={{ fontSize: '11pt' }}>{r.runic}</span>
        </div>
      </div>

      <StrokeSteps rune={rune} />

      <div className="trace-boxes">
        {[0, 1, 2].map((k) => (
          <div className="trace-box" key={`t${k}`}>
            <Ghost rune={rune} opacity={0.45 - k * 0.14} />
          </div>
        ))}
        {[0, 1, 2].map((k) => <div className="trace-box" key={`e${k}`} />)}
      </div>
    </div>
  );
}

/** One small diagram per stroke, so the order is unambiguous on paper. */
function StrokeSteps({ rune }) {
  const g = GLYPHS[rune];
  const H = 100, PAD = 12;
  const w = g.w + PAD * 2;
  const size = 15; // mm tall
  return (
    <div style={{ display: 'flex', gap: '1.2mm', alignItems: 'center', flexWrap: 'wrap' }}>
      {g.strokes.map((_, step) => (
        <svg
          key={step}
          width={`${(w / (H + PAD * 2)) * size}mm`}
          height={`${size}mm`}
          viewBox={`${-PAD} ${-PAD} ${w} ${H + PAD * 2}`}
        >
          <path d={g.path} transform={outlineTransform(rune)} fill="#eeece8" />
          {g.strokes.slice(0, step).map((pts, i) => (
            <path key={i} d={strokePath(pts)} fill="none" stroke="#b6b1a8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <path d={strokePath(g.strokes[step])} fill="none" stroke="#000" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <Arrow pts={g.strokes[step]} opacity={1} size={7} className="" />
          <circle cx={g.strokes[step][0][0]} cy={g.strokes[step][0][1]} r="13" fill="#000" />
          <text x={g.strokes[step][0][0]} y={g.strokes[step][0][1] + 6.5} textAnchor="middle" fontSize="19" fill="#fff" fontWeight="700" fontFamily="Helvetica, Arial, sans-serif">{step + 1}</text>
        </svg>
      ))}
    </div>
  );
}

function Ghost({ rune, opacity }) {
  const g = GLYPHS[rune];
  return (
    <svg viewBox={`${-12} ${-12} ${g.w + 24} ${124}`} preserveAspectRatio="xMidYMid meet">
      <path d={g.path} transform={outlineTransform(rune)} fill="#000" opacity={opacity} />
    </svg>
  );
}
