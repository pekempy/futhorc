// Scoring a hand-drawn rune, in the browser.
//
// A port of scripts/proto_recognise.py, where the maths was developed and
// measured, and a twin of ink/Recogniser.kt in the Android project. All three
// must agree - a rune that passes on the phone should pass here.
//
// Four order-free measures, so it doesn't matter which stroke you drew first
// or which way round you drew it:
//
//   grid        both shapes blurred onto an 18x18 grid, compared cell by cell.
//               The strongest single signal, and the only one that notices ink
//               in the wrong *place* as readily as ink of the wrong shape.
//   cloud       strokes resampled to evenly spaced points, pooled, compared by
//               nearest-neighbour distance. Finer than the grid can see.
//   direction   segment angles mod 180 degrees, weighted by length. Runes are
//               a few long straight bars, so this separates shapes that fill a
//               similar area out of different lines.
//   proportion  tall-and-thin versus short-and-wide, which is most of what
//               tells ᛁ from ᚷ.
//
// Measured across all 30 runes, by how far the ink wanders from the true shape:
// neat attempts are identified 100% of the time and score 96 on average, normal
// ones 97% and 88, sloppy ones 83% and 72. Zero wrong runes are accepted at any
// level - the gate would rather say "try again" than confirm a shape it cannot
// tell apart from a different letter.

import { GLYPHS } from '../data/glyphs.js';

const SAMPLE_SPACING = 0.035;
const ANGLE_BINS = 12;
const GRID = 18;

const W_GRID = 0.46;
const W_CLOUD = 0.24;
const W_DIRECTION = 0.22;
const W_PROPORTION = 0.08;

// Calibration, pinned to measured landmarks rather than chosen to feel nice:
// 0.60 raw is what a *different* rune scores, so it maps to 45; 0.68 is the
// point at which a drawing is clearly this rune and not another, so it maps to
// 90. PASS_MARK is therefore 90 by construction.
const CAL_X = [0.50, 0.60, 0.68, 0.80];
const CAL_Y = [0, 45, 90, 100];

/** How far ahead of the runner-up before we'll name a rune at all. */
export const MIN_MARGIN = 0.04;
export const PASS_MARK = 90;

export function calibrate(raw) {
  if (raw <= CAL_X[0]) return 0;
  if (raw >= CAL_X[CAL_X.length - 1]) return 100;
  for (let i = 0; i < CAL_X.length - 1; i++) {
    if (raw <= CAL_X[i + 1]) {
      const t = (raw - CAL_X[i]) / (CAL_X[i + 1] - CAL_X[i]);
      return CAL_Y[i] + (CAL_Y[i + 1] - CAL_Y[i]) * t;
    }
  }
  return 100;
}

// ── Geometry ───────────────────────────────────────────────────────────────

function resample(stroke, spacing = SAMPLE_SPACING) {
  if (stroke.length < 2) return [...stroke];
  const out = [stroke[0]];
  let carry = 0;
  for (let i = 0; i < stroke.length - 1; i++) {
    const [ax, ay] = stroke[i];
    const [bx, by] = stroke[i + 1];
    const seg = Math.hypot(bx - ax, by - ay);
    if (seg <= 1e-9) continue;
    let t = spacing - carry;
    while (t <= seg) {
      const f = t / seg;
      out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
      t += spacing;
    }
    carry = (carry + seg) % spacing;
  }
  const last = stroke[stroke.length - 1];
  const tail = out[out.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

/**
 * Centre on the bounding box and divide by the larger side, so the shape sits
 * in [-0.5, 0.5] with its proportions intact. Both axes share one scalar - a
 * tall thin rune has to stay tall and thin or ᛁ and ᚷ become the same thing.
 */
function normalise(strokes) {
  const pts = strokes.flat();
  if (!pts.length) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const size = Math.max(maxX - minX, maxY - minY);
  if (size < 1e-6) return [];
  const cx = (maxX + minX) / 2;
  const cy = (maxY + minY) / 2;
  return strokes.map((s) => s.map(([x, y]) => [(x - cx) / size, (y - cy) / size]));
}

function directionHistogram(strokes) {
  const hist = new Array(ANGLE_BINS).fill(0);
  for (const s of strokes) {
    for (let i = 0; i < s.length - 1; i++) {
      const dx = s[i + 1][0] - s[i][0];
      const dy = s[i + 1][1] - s[i][1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) continue;
      let ang = Math.atan2(dy, dx) % Math.PI;
      if (ang < 0) ang += Math.PI;
      const pos = (ang / Math.PI) * ANGLE_BINS;
      const lo = Math.floor(pos) % ANGLE_BINS;
      const frac = pos - Math.floor(pos);
      hist[lo] += len * (1 - frac);
      hist[(lo + 1) % ANGLE_BINS] += len * frac;
    }
  }
  const total = hist.reduce((a, b) => a + b, 0);
  return total > 1e-9 ? hist.map((h) => h / total) : hist;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na > 1e-9 && nb > 1e-9 ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Worse of the two one-way mean nearest-neighbour distances.
 *
 * The *worse* side, not the average: ᛁ is ᛏ without its arms, so one direction
 * is near zero and averaging would hide that entirely.
 */
function cloudDistance(a, b) {
  if (!a.length || !b.length) return 1;
  const oneWay = (p, q) => {
    let total = 0;
    for (const [px, py] of p) {
      let best = Infinity;
      for (const [qx, qy] of q) {
        const d = (px - qx) ** 2 + (py - qy) ** 2;
        if (d < best) best = d;
      }
      total += Math.sqrt(best);
    }
    return total / p.length;
  };
  return Math.max(oneWay(a, b), oneWay(b, a));
}

function raster(strokes) {
  const g = new Float64Array(GRID * GRID);
  for (const s of strokes) {
    for (const [x, y] of s) {
      const fx = (x + 0.5) * (GRID - 1);
      const fy = (y + 0.5) * (GRID - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const splat = [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)],
                     [0, 1, (1 - tx) * ty], [1, 1, tx * ty]];
      for (const [dx, dy, w] of splat) {
        const gx = x0 + dx, gy = y0 + dy;
        if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) g[gy * GRID + gx] += w;
      }
    }
  }
  // One blur pass, so being a cell out is a near miss rather than a miss.
  const out = new Float64Array(GRID * GRID);
  let peak = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      let acc = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
            acc += g[ny * GRID + nx] * (dx === 0 && dy === 0 ? 1 : 0.45);
          }
        }
      }
      out[y * GRID + x] = acc;
      if (acc > peak) peak = acc;
    }
  }
  if (peak <= 0) peak = 1;
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, out[i] / peak);
  return out;
}

function softIou(a, b) {
  let inter = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    inter += Math.min(a[i], b[i]);
    union += Math.max(a[i], b[i]);
  }
  return union > 1e-9 ? inter / union : 0;
}

// ── Shapes and scoring ─────────────────────────────────────────────────────

export function makeShape(strokes) {
  const resampled = normalise(strokes).filter((s) => s.length >= 2).map((s) => resample(s));
  const cloud = resampled.flat();
  if (!cloud.length) return { empty: true };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of cloud) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return {
    empty: false,
    cloud,
    hist: directionHistogram(resampled),
    grid: raster(resampled),
    // The floor matters: ᛁ is a bare vertical with zero true width, and without
    // it the ratio between "no width" and "a little width" is enormous.
    aspect: (maxX - minX + 0.08) / (maxY - minY + 0.08),
  };
}

export function rawSimilarity(a, b) {
  if (a.empty || b.empty) return 0;
  const grid = softIou(a.grid, b.grid);
  const cloud = Math.max(0, 1 - cloudDistance(a.cloud, b.cloud) / 0.30);
  const direction = Math.max(0, cosine(a.hist, b.hist));
  const proportion = Math.max(0, 1 - Math.abs(Math.log(a.aspect / b.aspect)) / 1.6);
  return W_GRID * grid + W_CLOUD * cloud + W_DIRECTION * direction + W_PROPORTION * proportion;
}

let refCache = null;

/** Reference shapes for every rune, built once. */
export function referenceShapes() {
  if (!refCache) {
    refCache = {};
    for (const [rune, g] of Object.entries(GLYPHS)) {
      refCache[rune] = makeShape(g.strokes.map((s) => s.map(([x, y]) => [x, y])));
    }
  }
  return refCache;
}

/** 0-100 for how much the drawing looks like one particular rune. */
export function score(strokes, rune) {
  const ref = referenceShapes()[rune];
  if (!ref) return 0;
  return Math.round(calibrate(rawSimilarity(makeShape(strokes), ref)));
}

/** Every rune, best match first. */
export function classify(strokes) {
  const shape = makeShape(strokes);
  if (shape.empty) return [];
  return Object.entries(referenceShapes())
    .map(([rune, ref]) => ({ rune, similarity: rawSimilarity(shape, ref) }))
    .sort((a, b) => b.similarity - a.similarity)
    .map((m) => ({ ...m, score: Math.round(calibrate(m.similarity)) }));
}

/**
 * What did they actually draw?
 *
 * `rune` is null when the drawing isn't clearly any one rune - either it misses
 * the pass mark, or a second rune is close enough that choosing between them
 * would be a guess. Refusing to answer is the point: telling someone they drew
 * a fine ᚦ when the shape is equally close to ᚹ teaches them the wrong shape.
 */
export function identify(strokes) {
  const ranked = classify(strokes);
  if (!ranked.length) return { rune: null, score: 0, runnerUp: null, ambiguous: false };
  const [best, runner] = ranked;
  const margin = best.similarity - (runner?.similarity ?? 0);
  const ambiguous = margin < MIN_MARGIN;
  const pass = best.score >= PASS_MARK && !ambiguous;
  return {
    rune: pass ? best.rune : null,
    score: best.score,
    runnerUp: runner?.rune ?? null,
    ambiguous,
  };
}
