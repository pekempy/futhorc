#!/usr/bin/env python3
"""
Prototype of the Android writing pad's segmenter, so the maths can be tested
somewhere it can actually be run. ink/Segmenter.kt is a port of this; keep the
two in step.

The problem: someone writes a line of runes with a finger. Split the strokes
into runes, and work out where the word breaks are.

The first version compared every gap against fixed fractions of the writing
height - 0.38 for "same rune", 1.05 for "new word". That fails the moment
someone writes with tighter or looser spacing than assumed, and it fails
differently on every line.

This version measures the line instead. Gaps between strokes fall into three
natural groups: within a rune (overlapping or nearly), between runes, and
between words. Rather than guess where the boundaries are, find the split that
best separates the observed gaps - Otsu's method, which picks the threshold
minimising the variance within each group. The height-based limits stay, but
only as sanity clamps for when there isn't enough data to measure.

Measured over synthetic lines in five writing styles: runes are split
correctly on 80% of lines (the fixed-threshold version managed 39%), and a
single word is never wrongly broken into two on 95% of lines.

Word-break detection is the weaker half, and honestly so: when someone writes
with word gaps only twice the size of their rune gaps, there is very little
signal to go on, and it gets those lines wrong more often than not. The screen
shows the split it chose so it can be corrected by eye.

Run: python3 scripts/proto_segment.py
"""
import random


def otsu(values, bins=48):
    """
    The threshold that best splits a set of numbers into two groups.

    Otsu's method, normally used for turning greyscale images into black and
    white: try every candidate split and keep the one where the two groups are
    each most tightly clustered. Here the "image" is the list of gaps.
    """
    if len(values) < 2:
        return None
    lo, hi = min(values), max(values)
    if hi - lo < 1e-6:
        return None

    hist = [0] * bins
    for v in values:
        idx = int((v - lo) / (hi - lo) * (bins - 1))
        hist[idx] += 1

    total = len(values)
    sum_all = sum(i * hist[i] for i in range(bins))
    sum_b = 0.0
    w_b = 0
    best_var, best_t = -1.0, 0

    for t in range(bins):
        w_b += hist[t]
        if w_b == 0:
            continue
        w_f = total - w_b
        if w_f == 0:
            break
        sum_b += t * hist[t]
        m_b = sum_b / w_b
        m_f = (sum_all - sum_b) / w_f
        between = w_b * w_f * (m_b - m_f) ** 2
        if between > best_var:
            best_var, best_t = between, t

    return lo + (best_t + 0.5) / (bins - 1) * (hi - lo)


def _widest_valley(values, floor=1.0):
    """
    The threshold sitting in the widest *multiplicative* gap in the data.

    Sort the values and look for the biggest jump from one to the next, judged
    as a ratio rather than a difference. Handwriting spacing is multiplicative:
    within a rune the gaps run to maybe 12, between runes around 50, between
    words 130 - the telling thing is the 4x jump from 12 to 50, not the 38
    units. The threshold goes at the geometric mean of the pair either side of
    the biggest jump, i.e. in the middle of the empty space.

    Otsu was tried here first and is the wrong tool: it minimises within-class
    variance, so a dozen small gaps and five large ones drag the threshold down
    into the small cluster's tail, splitting runes that should have stayed
    whole.
    """
    if len(values) < 3:
        return None
    xs = sorted(max(v, 0.0) + floor for v in values)
    best_ratio, best_at = 1.0, None
    for i in range(len(xs) - 1):
        ratio = xs[i + 1] / xs[i]
        if ratio > best_ratio:
            best_ratio, best_at = ratio, i
    # Anything under about 1.8x is not a real valley, just noise.
    if best_at is None or best_ratio < 1.8:
        return None
    return (xs[best_at] * xs[best_at + 1]) ** 0.5 - floor


def segment(strokes):
    """
    strokes: list of [(x, y), ...]
    returns: list of groups, each {'strokes': [...], 'starts_word': bool}
    """
    usable = [s for s in strokes if len(s) >= 2]
    if not usable:
        return []

    ys = [p[1] for s in usable for p in s]
    height = max(max(ys) - min(ys), 1.0)

    spans = sorted(
        ({'stroke': s,
          'left': min(p[0] for p in s),
          'right': max(p[0] for p in s)} for s in usable),
        key=lambda sp: sp['left'],
    )

    # Gap between each stroke and the rightmost edge so far. Negative means
    # they overlap horizontally, which almost always means one rune.
    gaps = []
    right = spans[0]['right']
    for sp in spans[1:]:
        gaps.append(sp['left'] - right)
        right = max(right, sp['right'])

    if not gaps:
        return [{'strokes': [spans[0]['stroke']], 'starts_word': False}]

    # Strokes of the same rune usually overlap, so their gap is negative.
    # Clamp to zero rather than dropping them: that near-zero cluster is
    # exactly the one we're trying to separate from the rest, and leaving it
    # out makes Otsu split the *other* two groups instead - which put the
    # threshold above the between-rune gaps and merged whole words into one
    # rune.
    clamped = [max(g, 0.0) for g in gaps]

    # Split in log space. Spacing in handwriting is multiplicative - a word gap
    # is some *multiple* of a rune gap, not a fixed number of pixels bigger -
    # so the three clusters are evenly spread on a log scale and bunched up on
    # a linear one. Linear Otsu put the threshold at 10 when the within-rune
    # gaps ran to 12 and the between-rune gaps started at 50, because one large
    # word gap stretched the range and squashed everything else into the first
    # few bins.
    rune_split = _widest_valley(clamped)
    if rune_split is None:
        rune_split = height * 0.38
    rune_split = min(max(rune_split, height * 0.06), height * 0.60)

    # Of the gaps that separate runes, which are big enough to be spaces?
    between = sorted(g for g in gaps if g > rune_split)
    word_split = float('inf')
    if len(between) >= 3:
        measured = _widest_valley(between)
        if measured is not None:
            typical = between[len(between) // 2]      # median rune gap
            # A space has to be clearly wider than the ordinary rune gap on
            # this line, not merely the widest one - otherwise a single word
            # gets split at whichever gap happens to be largest.
            word_split = max(measured, typical * 1.6, rune_split * 1.8)
    elif between:
        typical = between[len(between) // 2]
        word_split = max(typical * 1.6, height * 0.75)

    groups = []
    current = [spans[0]['stroke']]
    starts_word = False
    right = spans[0]['right']

    for i, sp in enumerate(spans[1:]):
        gap = gaps[i]
        if gap <= rune_split:
            current.append(sp['stroke'])
        else:
            groups.append({'strokes': current, 'starts_word': starts_word})
            starts_word = gap >= word_split
            current = [sp['stroke']]
        right = max(right, sp['right'])

    groups.append({'strokes': current, 'starts_word': starts_word})
    return groups


# ── Test harness ───────────────────────────────────────────────────────────

def make_line(word_lengths, rng, height=100.0,
              rune_gap=0.30, word_gap=1.10, jitter=0.05, stroke_gap=0.06):
    """
    Fake a line of handwriting.

    Each rune is 2-3 strokes sitting close together; runes are separated by
    rune_gap and words by word_gap, both as fractions of the writing height,
    with per-gap jitter so nothing is uniform.
    """
    strokes = []
    truth = []          # starts_word for each rune
    x = 0.0
    first = True
    for wi, n_runes in enumerate(word_lengths):
        for ri in range(n_runes):
            if not first:
                base = word_gap if ri == 0 else rune_gap
                x += height * base * (1 + rng.uniform(-jitter, jitter) * 4)
            truth.append(ri == 0 and not first)
            first = False
            for si in range(rng.randint(2, 3)):
                sx = x + si * height * stroke_gap
                strokes.append([
                    (sx + rng.gauss(0, 1), rng.uniform(0, height)),
                    (sx + rng.gauss(0, 1) + rng.uniform(-8, 8), rng.uniform(0, height)),
                ])
                x = max(x, sx)
            x += height * 0.30      # rune body width
    return strokes, truth


def main():
    rng = random.Random(11)
    styles = [
        ('normal          ', dict(rune_gap=0.30, word_gap=1.10)),
        ('tight writing   ', dict(rune_gap=0.12, word_gap=0.45)),
        ('loose writing   ', dict(rune_gap=0.55, word_gap=1.80)),
        ('barely spaced   ', dict(rune_gap=0.20, word_gap=0.50)),
        ('very jittery    ', dict(rune_gap=0.30, word_gap=1.10, jitter=0.18)),
    ]
    layouts = [[3], [3, 4], [2, 3, 3], [4, 2], [1, 5, 2], [3, 3, 3, 2]]

    print(f'{"style":18} {"rune count":>11} {"word breaks":>12}')
    print('-' * 44)
    overall_r, overall_w, trials = 0, 0, 0

    for name, opts in styles:
        rune_ok = word_ok = total = 0
        for layout in layouts:
            for _ in range(12):
                strokes, truth = make_line(layout, rng, **opts)
                groups = segment(strokes)
                total += 1
                if len(groups) == len(truth):
                    rune_ok += 1
                    if [g['starts_word'] for g in groups] == truth:
                        word_ok += 1
        print(f'{name} {rune_ok/total*100:9.0f}% {word_ok/total*100:11.0f}%')
        overall_r += rune_ok
        overall_w += word_ok
        trials += total

    print('-' * 44)
    print(f'{"overall":18} {overall_r/trials*100:9.0f}% {overall_w/trials*100:11.0f}%')

    # A single word must never be split into two "words".
    print('\nsingle word, no spurious break:', end=' ')
    bad = 0
    for _ in range(60):
        strokes, truth = make_line([5], rng)
        groups = segment(strokes)
        if any(g['starts_word'] for g in groups):
            bad += 1
    print(f'{60 - bad}/60 clean')


if __name__ == '__main__':
    main()


# ── Lines ──────────────────────────────────────────────────────────────────

def group_lines(strokes):
    """
    Split strokes into lines of writing before anything else.

    This is the step that was missing. Everything below sorts strokes by x and
    measures gaps against the height of the *whole* drawing, both of which are
    only correct for a single line. Give it two lines and the strokes of one
    interleave with the other - so the runes come out scrambled - while the
    height roughly doubles, which scales every gap threshold wrong and takes
    the word breaks with it. On a pad four times taller than a line of writing,
    two lines is the normal case rather than the exceptional one.

    Lines are found from the gaps between stroke centres, not from any estimate
    of how tall a line ought to be. Guessing the line height from stroke heights
    is tempting and wrong: a rune like the bare vertical is full height while
    the arms of another are a third of it, so the estimate lands well under a
    true line and splits one row into several. The vertical gap *between* rows
    is far more distinctive than the height of anything within them.
    """
    usable = [s for s in strokes if len(s) >= 2]
    if not usable:
        return []

    spans = []
    for s in usable:
        ys = [p[1] for p in s]
        xs = [p[0] for p in s]
        spans.append({'stroke': s, 'cy': (min(ys) + max(ys)) / 2, 'left': min(xs)})

    by_top = sorted(spans, key=lambda s: s['cy'])
    if len(by_top) < 3:
        return [[s['stroke'] for s in sorted(by_top, key=lambda s: s['left'])]]

    diffs = [by_top[i + 1]['cy'] - by_top[i]['cy'] for i in range(len(by_top) - 1)]
    split = _widest_valley(diffs)

    heights = [max(ys) - min(ys) for s in usable for ys in [[p[1] for p in s]]]
    typical_height = sum(heights) / len(heights) if heights else 0.0

    if split is None or split < typical_height * 0.5:
        # No clear valley: one line. Much better to under-split than over - a
        # single line wrongly cut in two scrambles nothing, but two lines
        # treated as one interleaves every stroke.
        return [[s['stroke'] for s in sorted(by_top, key=lambda s: s['left'])]]

    lines = [[by_top[0]]]
    for i, sp in enumerate(by_top[1:]):
        if diffs[i] > split:
            lines.append([sp])
        else:
            lines[-1].append(sp)
    return [[s['stroke'] for s in sorted(line, key=lambda s: s['left'])]
            for line in lines]


def segment_page(strokes):
    """
    Segment a whole pad: lines first, then runes and words within each line.

    Each line is measured against its *own* height, so a small line under a
    large one is not judged by the large one's proportions.
    """
    out = []
    for line in group_lines(strokes):
        groups = segment(line)
        if groups:
            groups[0]['starts_word'] = True     # a new line always starts a word
            out.extend(groups)
    return out
