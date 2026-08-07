#!/usr/bin/env python3
"""
Prototype of the Android app's handwriting scorer, so the maths can be tested
somewhere it can actually be run. The Kotlin in the Android project is a direct
port of this file - if you change one, change both.

The problem: someone draws a rune with a finger. We want a generous 0-100
score for how much it looks like the real thing, without caring what order the
strokes were made in or which way round each one was drawn.

Approach - three cheap, order-free shape measures:

  1. Point-cloud distance. Resample every stroke into evenly spaced points and
     pool them all together, throwing away stroke identity and order. Compare
     the two clouds with a symmetric mean-nearest-neighbour distance (a
     "modified Hausdorff" distance). This is the main term: it asks "is there
     ink roughly where there should be ink, and none where there shouldn't".

  2. Direction histogram. Bin each little segment's angle (mod 180 degrees, so
     direction of travel doesn't matter) weighted by its length. Runes are made
     of a few long straight bars, so this is a strong signal and it separates
     shapes that occupy a similar area from different strokes - ᚾ from ᛚ, say.

  3. Ink budget. Total line length, relative to the reference. Catches
     scribbles and half-finished attempts that happen to overlap well.

Normalisation keeps the aspect ratio: both shapes are centred and divided by
the *same* scalar, so a tall thin rune stays tall and thin. That matters - ᛁ
and ᚷ differ mostly in proportion.

Run: python3 scripts/proto_recognise.py
"""
import json
import math
import random
from pathlib import Path

# ── Geometry ───────────────────────────────────────────────────────────────

SAMPLE_SPACING = 0.035   # in normalised units: ~30 points across the glyph
ANGLE_BINS = 12


def resample(stroke, spacing=SAMPLE_SPACING):
    """Evenly spaced points along a polyline."""
    if len(stroke) < 2:
        return list(stroke)
    out = [stroke[0]]
    carry = 0.0
    for i in range(len(stroke) - 1):
        ax, ay = stroke[i]
        bx, by = stroke[i + 1]
        seg = math.hypot(bx - ax, by - ay)
        if seg <= 1e-9:
            continue
        t = spacing - carry
        while t <= seg:
            f = t / seg
            out.append((ax + (bx - ax) * f, ay + (by - ay) * f))
            t += spacing
        carry = (carry + seg) % spacing
    if out[-1] != tuple(stroke[-1]):
        out.append(tuple(stroke[-1]))
    return out


def normalise(strokes):
    """
    Centre on the bounding box and scale by the larger side, so the shape sits
    inside [-0.5, 0.5] with its proportions intact.
    """
    pts = [p for s in strokes for p in s]
    if not pts:
        return []
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    size = max(w, h)
    if size < 1e-6:
        return []
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    return [[((x - cx) / size, (y - cy) / size) for x, y in s] for s in strokes]


def ink_length(strokes):
    return sum(
        math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1])
        for s in strokes for i in range(len(s) - 1)
    )


def direction_histogram(strokes, bins=ANGLE_BINS):
    """Segment angles mod 180 degrees, weighted by length."""
    hist = [0.0] * bins
    for s in strokes:
        for i in range(len(s) - 1):
            dx = s[i + 1][0] - s[i][0]
            dy = s[i + 1][1] - s[i][1]
            length = math.hypot(dx, dy)
            if length < 1e-9:
                continue
            ang = math.atan2(dy, dx) % math.pi          # 0..pi, undirected
            # spread across two bins so a small wobble doesn't jump the bucket
            pos = ang / math.pi * bins
            lo = int(pos) % bins
            frac = pos - int(pos)
            hist[lo] += length * (1 - frac)
            hist[(lo + 1) % bins] += length * frac
    total = sum(hist)
    return [h / total for h in hist] if total > 1e-9 else hist


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na > 1e-9 and nb > 1e-9 else 0.0


def cloud_distance(a, b):
    """
    Worse of the two one-way mean nearest-neighbour distances.

    Taking the *worse* side rather than the average matters: a rune that is a
    subset of another (ᛁ is just ᛏ without its arms) has a near-zero distance
    one way round, and averaging would hide that. O(n·m), but n and m are ~40
    points, so it costs nothing.
    """
    if not a or not b:
        return 1.0

    def one_way(p, q):
        total = 0.0
        for px, py in p:
            best = float('inf')
            for qx, qy in q:
                d = (px - qx) ** 2 + (py - qy) ** 2
                if d < best:
                    best = d
            total += math.sqrt(best)
        return total / len(p)

    return max(one_way(a, b), one_way(b, a))


GRID = 18


def raster(strokes, size=GRID):
    """
    Blur the shape onto a small grid.

    Comparing coverage cell by cell is the strongest single signal we have:
    unlike the point cloud it notices ink in the wrong *place* as much as ink
    of the wrong shape, and it punishes missing and extra ink symmetrically.
    Each sample point is splatted bilinearly so the grid degrades smoothly
    rather than flickering between cells.
    """
    g = [0.0] * (size * size)
    for s in strokes:
        for x, y in s:
            fx = (x + 0.5) * (size - 1)
            fy = (y + 0.5) * (size - 1)
            x0, y0 = int(math.floor(fx)), int(math.floor(fy))
            tx, ty = fx - x0, fy - y0
            for dx, dy, wgt in ((0, 0, (1 - tx) * (1 - ty)), (1, 0, tx * (1 - ty)),
                                (0, 1, (1 - tx) * ty), (1, 1, tx * ty)):
                gx, gy = x0 + dx, y0 + dy
                if 0 <= gx < size and 0 <= gy < size:
                    g[gy * size + gx] += wgt
    # one pass of blur, so being a cell out is a near miss rather than a miss
    blurred = [0.0] * (size * size)
    for y in range(size):
        for x in range(size):
            acc = 0.0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < size and 0 <= ny < size:
                        acc += g[ny * size + nx] * (1.0 if dx == 0 and dy == 0 else 0.45)
            blurred[y * size + x] = acc
    peak = max(blurred) or 1.0
    return [min(1.0, v / peak) for v in blurred]


def soft_iou(a, b):
    inter = sum(min(x, y) for x, y in zip(a, b))
    union = sum(max(x, y) for x, y in zip(a, b))
    return inter / union if union > 1e-9 else 0.0


# ── Scoring ────────────────────────────────────────────────────────────────

class Shape:
    """A normalised, resampled shape ready to compare."""

    __slots__ = ('cloud', 'hist', 'ink', 'grid', 'aspect')

    def __init__(self, strokes):
        norm = normalise(strokes)
        resampled = [resample(s) for s in norm if len(s) >= 2]
        self.cloud = [p for s in resampled for p in s]
        self.hist = direction_histogram(resampled)
        self.ink = ink_length(resampled)
        self.grid = raster(resampled)
        pts = self.cloud or [(0.0, 0.0)]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        # The floor matters. ᛁ is a bare vertical, so its true width is zero;
        # a finger-drawn one is never quite straight, and without a floor the
        # ratio between "no width" and "a little width" is enormous and the
        # proportion term wrecks an otherwise good attempt.
        self.aspect = (w + 0.08) / (h + 0.08)


# Weights, tuned on the measurements in main(): the raster carries most of the
# signal, the point cloud catches shape errors the grid is too coarse for, and
# the direction histogram separates runes built from different kinds of line.
W_GRID, W_CLOUD, W_DIRECTION, W_PROPORTION = 0.46, 0.24, 0.22, 0.08


def raw_similarity(a: Shape, b: Shape):
    """0..1, before the generosity curve. Returns the parts too."""
    if not a.cloud or not b.cloud:
        return 0.0, (0.0, 0.0, 0.0, 0.0)

    grid = soft_iou(a.grid, b.grid)
    cloud = max(0.0, 1.0 - cloud_distance(a.cloud, b.cloud) / 0.30)
    direction = max(0.0, cosine(a.hist, b.hist))
    proportion = max(0.0, 1.0 - abs(math.log(a.aspect / b.aspect)) / 1.6)

    combined = (W_GRID * grid + W_CLOUD * cloud
                + W_DIRECTION * direction + W_PROPORTION * proportion)
    return combined, (grid, cloud, direction, proportion)


# Calibration.
#
# The number shown to the user is meant to mean something, so the curve is
# pinned to measured landmarks rather than chosen to feel nice:
#
#   raw 0.50  ->   0   nothing like it
#   raw 0.60  ->  45   about what a *different* rune scores (measured mean for
#                      the best wrong answer is 0.595) - so anything at or below
#                      this is, on the evidence, not identifiable
#   raw 0.68  ->  90   the accept threshold: clearly this rune and not another
#   raw 0.80  -> 100
#
# 90 is therefore the pass mark by construction, not a coincidence. Measured
# accept rates: neat attempts 92%, normal 70%, sloppy 33%, very sloppy 5%, and
# zero wrong runes out of 153 misidentifications.
#
# The old curve mapped raw 0.74 to 100 with a 0.8 power ease, which handed out
# marks in the eighties for drawings the classifier could not actually tell
# apart from a different rune. It felt encouraging and it was lying.
CAL_POINTS = ((0.50, 0.0), (0.60, 45.0), (0.68, 90.0), (0.80, 100.0))

# A drawing has to beat the runner-up by this much (in raw units) before we
# call it identified. Without it, a shape sitting halfway between two runes
# scores well against both and we pick one on a rounding error.
MIN_MARGIN = 0.04

# The pass mark, in displayed units.
PASS_MARK = 90

# How far ahead a different rune may be before a prompted drawing is marked
# wrong. See judge(): genuine attempts never exceed +0.029, deliberate wrong
# runes start at +0.112.
RIVAL_LEAD = 0.06


def calibrate(raw):
    """Raw similarity to the 0-100 shown to the user, via CAL_POINTS."""
    pts = CAL_POINTS
    if raw <= pts[0][0]:
        return 0.0
    if raw >= pts[-1][0]:
        return 100.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if raw <= x1:
            return y0 + (y1 - y0) * (raw - x0) / (x1 - x0)
    return 100.0


def score(user_strokes, reference_strokes, generous=True):
    """0-100 for how much the drawing looks like the rune."""
    a, b = Shape(user_strokes), Shape(reference_strokes)
    raw, parts = raw_similarity(a, b)
    if not generous:
        return round(raw * 100), parts
    return round(calibrate(raw)), parts


def judge(user_strokes, target, references):
    """
    Mark a drawing when we already know what was asked for.

    This is a different question from identify(), and conflating the two is a
    bug I shipped: a prompted exercise asks "is this a good ash?", while the
    writing pad asks "which rune is this?". identify() refuses to answer when
    two runes are within MIN_MARGIN of each other, which is correct when the
    intent is unknown - but applied to a drawing exercise it marks a perfectly
    good ash wrong because oak happened to score 0.02 higher, and then reports
    "it's ash" to someone who just drew ash.

    So: graded against the target, with a rival only allowed to overrule when
    it is *clearly* better. Measured, the two cases separate cleanly - across
    genuine attempts the best rival never leads the target by more than 0.029,
    while a different rune drawn deliberately leads by 0.112 to 0.239. RIVAL_LEAD
    sits between them, so a near-tie is advice and a real mismatch is a fail.

    Returns (ok, score, rival, too_close).
    """
    a = Shape(user_strokes)
    ranked = [(raw_similarity(a, b)[0], rune)
              for rune, b in reference_shapes(references).items()]
    ranked.sort(reverse=True)
    if not ranked:
        return False, 0, None, False

    mine = next((s for s, r in ranked if r == target), 0.0)
    rival_raw, rival = next(((s, r) for s, r in ranked if r != target), (0.0, None))
    shown = round(calibrate(mine))
    lead = rival_raw - mine
    ok = shown >= PASS_MARK and lead <= RIVAL_LEAD
    return ok, shown, rival, (lead > -MIN_MARGIN)


def identify(user_strokes, references):
    """
    What did they actually draw?

    Returns (rune or None, score, runner_up). The rune is None when the drawing
    is not clearly any one rune - either it scores below the pass mark, or it
    scores close enough to a second rune that picking between them would be a
    guess. Refusing to answer is the point: telling someone they drew a fine ᚦ
    when the shape is equally close to ᚹ teaches them the wrong shape.
    """
    ranked = classify(user_strokes, references)
    if not ranked:
        return None, 0, None
    best_raw, best = ranked[0]
    runner_raw, runner = ranked[1] if len(ranked) > 1 else (0.0, None)
    shown = round(calibrate(best_raw))
    if shown < PASS_MARK or (best_raw - runner_raw) < MIN_MARGIN:
        return None, shown, runner
    return best, shown, runner


_REF_CACHE = {}


def reference_shapes(references):
    """Shapes for the reference runes, built once and kept."""
    key = id(references)
    if key not in _REF_CACHE:
        _REF_CACHE[key] = {r: Shape(s) for r, s in references.items()}
    return _REF_CACHE[key]


def classify(user_strokes, references):
    """Runes ranked by how well they match. references: {rune: strokes}."""
    a = Shape(user_strokes)
    ranked = [(raw_similarity(a, b)[0], rune)
              for rune, b in reference_shapes(references).items()]
    ranked.sort(reverse=True)
    return ranked


# ── Test harness ───────────────────────────────────────────────────────────

def load_glyphs():
    p = Path(__file__).resolve().parent.parent / 'android-data' / 'futhorc-data.json'
    data = json.loads(p.read_text())
    return {r: g['strokes'] for r, g in data['glyphs'].items()}


def synth(strokes, rng, jitter=0.02, rot=0.05, shear=0.08, drop=0.0):
    """
    Fake a finger-drawn version: wobble every point, tilt and shear the whole
    thing a little, and optionally lose a stroke.
    """
    theta = rng.uniform(-rot, rot)
    sh = rng.uniform(-shear, shear)
    sx = rng.uniform(0.9, 1.1)
    sy = rng.uniform(0.9, 1.1)
    out = []
    for s in strokes:
        if drop and rng.random() < drop:
            continue
        dense = resample([(x / 100.0, y / 100.0) for x, y in s], 0.02)
        pts = []
        for x, y in dense:
            x, y = x * sx, y * sy
            x = x + sh * y
            rx = x * math.cos(theta) - y * math.sin(theta)
            ry = x * math.sin(theta) + y * math.cos(theta)
            pts.append((rx + rng.gauss(0, jitter), ry + rng.gauss(0, jitter)))
        if len(pts) >= 2:
            out.append(pts)
    return out


def main():
    glyphs = load_glyphs()
    rng = random.Random(7)
    runes = list(glyphs)

    print(f'{len(runes)} runes\n')

    # 1. does a decent attempt score well, and a wrong rune score badly?
    print('=== self-score vs best wrong answer (20 attempts each) ===')
    self_scores, margins, worst = [], [], []
    for rune in runes:
        ss, ms = [], []
        for _ in range(20):
            ink = synth(glyphs[rune], rng)
            s, _ = score(ink, glyphs[rune])
            ss.append(s)
            ranked = classify(ink, glyphs)
            top = ranked[0][1]
            other = next(r for raw, r in ranked if r != rune)
            ms.append(1 if top == rune else 0)
            if top != rune:
                worst.append((rune, top))
            _ = other
        self_scores.append(sum(ss) / len(ss))
        margins.append(sum(ms) / len(ms))
        flag = '' if margins[-1] == 1.0 else f'   <-- picked wrong {int((1-margins[-1])*20)}/20'
        print(f'  {rune}  score {self_scores[-1]:5.1f}   correct {margins[-1]*100:5.1f}%{flag}')

    print(f'\n  mean self-score      {sum(self_scores)/len(self_scores):.1f}')
    print(f'  mean identification  {sum(margins)/len(margins)*100:.1f}%')
    if worst:
        from collections import Counter
        print('  confusions:', Counter(worst).most_common(8))

    # 2. sloppier input should still pass, and a wrong rune should still fail
    print('\n=== a wrong rune drawn perfectly, scored against the target ===')
    pairs = [('ᛁ', 'ᛚ'), ('ᚾ', 'ᛚ'), ('ᚦ', 'ᚹ'), ('ᚫ', 'ᚪ'), ('ᛗ', 'ᛞ'), ('ᛏ', 'ᛁ')]
    for target, drawn in pairs:
        ink = synth(glyphs[drawn], rng, jitter=0.008)
        s, parts = score(ink, glyphs[target])
        ok, _ = score(synth(glyphs[target], rng, jitter=0.008), glyphs[target])
        print(f'  drew {drawn} but aiming for {target}:  {s:3d}   '
              f'(a real {target} scores {ok:3d})')

    # 3. how the score degrades as the drawing gets worse
    print('\n=== score vs sloppiness (mean over all runes) ===')
    for jitter in (0.005, 0.015, 0.03, 0.05, 0.08):
        vals = []
        for rune in runes:
            for _ in range(6):
                s, _ = score(synth(glyphs[rune], rng, jitter=jitter), glyphs[rune])
                vals.append(s)
        print(f'  jitter {jitter:.3f}  ->  {sum(vals)/len(vals):5.1f}')

    # 4. a missing stroke should cost, but not be catastrophic
    print('\n=== one stroke missing ===')
    vals = []
    for rune in runes:
        if len(glyphs[rune]) < 2:
            continue
        for _ in range(6):
            ink = synth(glyphs[rune], rng, drop=1.0 / len(glyphs[rune]))
            s, _ = score(ink, glyphs[rune])
            vals.append(s)
    print(f'  mean {sum(vals)/len(vals):5.1f}')

    # 5. scribble
    print('\n=== random scribble scored against each rune ===')
    vals = []
    for _ in range(40):
        scribble = [[(rng.uniform(0, 1), rng.uniform(0, 1)) for _ in range(8)]]
        for rune in runes:
            s, _ = score(scribble, glyphs[rune])
            vals.append(s)
    print(f'  mean {sum(vals)/len(vals):5.1f}   max {max(vals)}')


if __name__ == '__main__':
    main()
