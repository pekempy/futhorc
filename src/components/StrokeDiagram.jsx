import { useMemo } from 'react';
import { GLYPHS, outlineTransform } from '../data/glyphs.js';

const PAD = 14;

export const strokePath = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

const polyLength = (pts) => {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
};

/** Timings for the drawing animation: one entry per stroke. */
function timeline(strokes, speed = 190, gap = 0.16) {
  let at = 0;
  return strokes.map((pts) => {
    const len = polyLength(pts) || 1;
    const dur = Math.max(0.3, len / speed);
    const entry = { len, dur, delay: at };
    at += dur + gap;
    return entry;
  });
}

/**
 * How to write a rune: the letterform in outline, with each stroke numbered
 * and drawn in the direction the pen travels.
 *
 * With `animate`, the strokes draw themselves on in order, one line growing
 * from its starting point rather than appearing all at once.
 *
 * Outline and stroke paths both come from the same font, so a curved bar gets
 * a curved stroke — see scripts/genglyphs.py.
 */
export default function StrokeDiagram({ rune, size = 120, animate = false, showNumbers = true, ghost = true, replayKey = 0 }) {
  const g = GLYPHS[rune];
  const times = useMemo(() => (g ? timeline(g.strokes) : []), [g]);
  if (!g) return null;

  const w = g.w + PAD * 2;
  const h = 100 + PAD * 2;
  const scale = size / h;
  const total = times.length ? times[times.length - 1].delay + times[times.length - 1].dur : 0;

  return (
    <svg
      key={`${rune}-${replayKey}`}
      className={`stroke-svg${animate ? ' animating' : ''}`}
      width={w * scale}
      height={size}
      viewBox={`${-PAD} ${-PAD} ${w} ${h}`}
      role="img"
      aria-label={`How to write the rune ${rune}`}
      style={animate ? { '--total': `${total}s` } : undefined}
    >
      {ghost && <path className="glyph-ghost" d={g.path} transform={outlineTransform(rune)} />}

      {g.strokes.map((pts, i) => {
        const t = times[i];
        return (
          <path
            key={i}
            className="stroke-line"
            d={strokePath(pts)}
            style={animate ? {
              strokeDasharray: t.len,
              strokeDashoffset: t.len,
              animation: `rune-draw ${t.dur}s linear ${t.delay}s forwards`,
            } : undefined}
          />
        );
      })}

      {g.strokes.map((pts, i) => (
        <g key={`a${i}`} style={animate ? { opacity: 0, animation: `rune-appear 0.2s linear ${times[i].delay + times[i].dur - 0.1}s forwards` } : undefined}>
          <Arrow pts={pts} />
        </g>
      ))}

      {showNumbers && g.strokes.map((pts, i) => (
        <g key={`n${i}`} style={animate ? { opacity: 0, animation: `rune-appear 0.2s linear ${times[i].delay}s forwards` } : undefined}>
          <circle className="badge" cx={pts[0][0]} cy={pts[0][1]} r={9} />
          <text className="badge-text" x={pts[0][0]} y={pts[0][1] + 4.5} textAnchor="middle">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

/** Arrowhead at the finishing end, pointing the way the stroke was drawn. */
export function Arrow({ pts, opacity = 0.85, size = 5.5, className = 'badge' }) {
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = b[0] - ux * 4, py = b[1] - uy * 4;
  return (
    <polygon
      className={className}
      opacity={opacity}
      points={`${px + ux * size},${py + uy * size} ${px - uy * size * 0.65 - ux},${py + ux * size * 0.65 - uy} ${px + uy * size * 0.65 - ux},${py - ux * size * 0.65 - uy}`}
    />
  );
}

/** Just the letterform, for tracing over. */
export function GlyphTrace({ rune, size = 50, opacity = 0.35 }) {
  const g = GLYPHS[rune];
  if (!g) return null;
  const w = g.w + 24;
  return (
    <svg width={(w / 124) * size} height={size} viewBox={`-12 -12 ${w} 124`} aria-hidden="true">
      <path d={g.path} transform={outlineTransform(rune)} fill="#000" opacity={opacity} />
    </svg>
  );
}
