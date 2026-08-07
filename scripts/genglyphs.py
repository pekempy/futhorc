#!/usr/bin/env python3
"""
Generate src/data/glyphs.js from the Noto Sans Runic font.

For each rune we emit two things:

  path     the exact glyph outline, so the app and the print sheets trace the
           real letterform rather than an approximation of it;
  strokes  the skeleton - the path a pen would take - derived from the outline.

Deriving the skeleton: every rune is built from straight bars of uniform width,
so the outline contains pairs of antiparallel edges one stroke-width apart. The
midline between each such pair is a stroke centreline. We then merge collinear
fragments (a stave interrupted by a crossbar comes through in pieces), discard
any candidate whose midpoint falls outside the glyph (the gap between two
parallel arms looks like a bar to the pairing test), and extend each end out to
the outline boundary.

Strokes are ordered stave first, then top to bottom, and each is oriented the
way you'd naturally draw it: verticals downward, arms outward from the stave.

Requires: fonttools, brotli.
Usage:    python3 scripts/genglyphs.py path/to/NotoSansRunic.woff2
"""
import json
import math
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

RUNES = 'ᚠᚢᚦᚩᚱᚳᚷᚹᚻᚾᛁᛡᛄᛈᛉᛋᛏᛒᛖᛗᛚᛝᛟᛞᚪᚫᛠᚣᛥᛢ'
W = 92.0        # stroke width in font units (measured from the ᛁ rune)
CAP = 714.0     # cap height in font units

sub = lambda a, b: (a[0] - b[0], a[1] - b[1])
add = lambda a, b: (a[0] + b[0], a[1] + b[1])
mul = lambda a, s: (a[0] * s, a[1] * s)
dot = lambda a, b: a[0] * b[0] + a[1] * b[1]
length = lambda a: math.hypot(*a)


def norm(a):
    l = math.hypot(*a)
    return (a[0] / l, a[1] / l) if l else (0.0, 0.0)


CURVE_STEPS = 12


def _quad(p0, p1, p2, n=CURVE_STEPS):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
            for t in (i / n for i in range(1, n + 1))]


def _cubic(p0, p1, p2, p3, n=CURVE_STEPS):
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def contours_of(glyph_set, name):
    """
    The outline, twice over:

      edges     one entry per drawing command, each carrying its endpoints and
                a sampled version of itself. Straight edges sample to two
                points; curved ones to CURVE_STEPS+1. The pairing below tests
                against the endpoints (so a curved bar is matched by its chord,
                which is what makes the geometry tractable) but builds the
                centreline from the samples, so the result follows the curve.

      polygon   the same outline flattened to point lists, for inside tests.
    """
    rp = RecordingPen()
    glyph_set[name].draw(rp)
    edges, polys = [], []
    cur_edges, cur_pts, start = [], [], None

    def push(samples):
        cur_edges.append({'a': samples[0], 'b': samples[-1], 's': samples})
        cur_pts.extend(samples[1:])

    for op, args in rp.value:
        if op == 'moveTo':
            start = args[0]
            cur_pts = [start]
            cur_edges = []
        elif op == 'lineTo':
            push([cur_pts[-1], args[0]])
        elif op == 'curveTo':
            push([cur_pts[-1]] + _cubic(cur_pts[-1], *args))
        elif op == 'qCurveTo':
            pts = list(args)
            on = pts.pop()
            prev = cur_pts[-1]
            if len(pts) == 1:
                push([prev] + _quad(prev, pts[0], on))
            else:                              # TrueType implied on-curve points
                for i, c in enumerate(pts):
                    nxt = on if i == len(pts) - 1 else ((c[0] + pts[i + 1][0]) / 2,
                                                        (c[1] + pts[i + 1][1]) / 2)
                    push([prev] + _quad(prev, c, nxt))
                    prev = nxt
        elif op == 'closePath':
            if cur_pts:
                if length(sub(cur_pts[-1], start)) > 1:
                    push([cur_pts[-1], start])
                edges.extend(cur_edges)
                polys.append(cur_pts)
                cur_edges, cur_pts = [], []
    if cur_pts:
        edges.extend(cur_edges)
        polys.append(cur_pts)
    return edges, polys


def inside(pt, polys):
    x, y = pt
    hit = False
    for cont in polys:
        n = len(cont)
        for i in range(n):
            x1, y1 = cont[i]
            x2, y2 = cont[(i + 1) % n]
            if (y1 > y) != (y2 > y):
                if x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                    hit = not hit
    return hit


def resample(samples, n):
    """n+1 points spaced evenly by arc length along a sampled edge."""
    if len(samples) == 2:
        a, b = samples
        return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]
    cum = [0.0]
    for i in range(1, len(samples)):
        cum.append(cum[-1] + length(sub(samples[i], samples[i - 1])))
    total = cum[-1] or 1.0
    out, j = [], 0
    for i in range(n + 1):
        target = total * i / n
        while j < len(cum) - 2 and cum[j + 1] < target:
            j += 1
        span = cum[j + 1] - cum[j]
        f = 0.0 if span == 0 else (target - cum[j]) / span
        out.append(add(samples[j], mul(sub(samples[j + 1], samples[j]), f)))
    return out


def march(p, d, polys, limit=2.0 * W):
    """How far from p you can travel along d before leaving the glyph."""
    step, dist = 2.0, 0.0
    while dist < limit:
        q = (p[0] + d[0] * (dist + step), p[1] + d[1] * (dist + step))
        if not inside(q, polys):
            return dist
        dist += step
    return dist


def width_ok(path, polys, tol=(0.55, 1.7)):
    """Is this really the centre of a one-stroke-wide bar all the way along?"""
    good = total = 0
    for k in range(len(path) - 1):
        mid = add(path[k], mul(sub(path[k + 1], path[k]), 0.5))
        tangent = norm(sub(path[k + 1], path[k]))
        n = (-tangent[1], tangent[0])
        span = march(mid, n, polys) + march(mid, (-n[0], -n[1]), polys)
        total += 1
        if tol[0] * W <= span <= tol[1] * W:
            good += 1
    return total == 0 or good / total >= 0.7


def centrelines(edges, polys):
    """
    Midlines between antiparallel edges a stroke-width apart.

    Returned as polylines: two points for a straight bar, more for a curved one,
    where the midline is built by averaging the two bounding curves sample for
    sample so it follows the arc rather than cutting across its chord.
    """
    out = []
    for i in range(len(edges)):
        for j in range(i + 1, len(edges)):
            e1, e2 = edges[i], edges[j]
            p1, q1, p2, q2 = e1['a'], e1['b'], e2['a'], e2['b']
            d1, d2 = norm(sub(q1, p1)), norm(sub(q2, p2))
            if dot(d1, d2) > -0.985:
                continue
            curved = len(e1['s']) > 2 or len(e2['s']) > 2
            n1 = (-d1[1], d1[0])
            gap = abs(dot(sub(p2, p1), n1))
            # Concentric arcs sit closer chord-to-chord than they do radially,
            # so curved edges get a wider window; width_ok throws out anything
            # that isn't really a bar.
            lo_gap, hi_gap = (0.25 * W, 1.8 * W) if curved else (0.5 * W, 1.6 * W)
            if not (lo_gap <= gap <= hi_gap):
                continue
            lo = max(0.0, min(dot(sub(p2, p1), d1), dot(sub(q2, p1), d1)))
            hi = min(length(sub(q1, p1)), max(dot(sub(p2, p1), d1), dot(sub(q2, p1), d1)))
            if hi - lo < 0.6 * W:
                continue

            if curved:
                n = 10
                s1 = resample(e1['s'], n)
                s2 = list(reversed(resample(e2['s'], n)))
                path = [mul(add(s1[k], s2[k]), 0.5) for k in range(n + 1)]
            else:
                off = dot(sub(p2, p1), n1) / 2.0
                path = [add(add(p1, mul(d1, lo)), mul(n1, off)),
                        add(add(p1, mul(d1, hi)), mul(n1, off))]

            # Reject phantoms - the gap between two parallel arms looks like a
            # bar to the test above. A real bar is solid all along, and one
            # stroke-width across.
            probes = [add(path[k], mul(sub(path[k + 1], path[k]), 0.5)) for k in range(len(path) - 1)]
            if sum(1 for q in probes if inside(q, polys)) < max(1, int(len(probes) * 0.85)):
                continue
            if not width_ok(path, polys):
                continue
            out.append([tuple(q) for q in path])
    return out


def chain(segs, near=0.5 * W, angle=45.0):
    """
    Join short midline pieces into strokes.

    A curved bar produces a run of short midline pieces along its arc, so we
    link pieces whose ends meet and whose directions differ only gradually.
    Result is a polyline per stroke.
    """
    paths = [list(s) for s in segs]
    cos_lim = math.cos(math.radians(angle))

    def d_end(path, at_start):
        return norm(sub(path[1], path[0])) if at_start else norm(sub(path[-1], path[-2]))

    changed = True
    while changed:
        changed = False
        for i in range(len(paths)):
            for j in range(len(paths)):
                if i == j:
                    continue
                A, B = paths[i], paths[j]
                # A's tail to B's head
                if length(sub(B[0], A[-1])) < near and dot(d_end(A, False), d_end(B, True)) > cos_lim:
                    paths[i] = A + B[1:]
                    paths.pop(j)
                    changed = True
                    break
                # A's tail to B's tail (B reversed)
                if length(sub(B[-1], A[-1])) < near and dot(d_end(A, False), mul(d_end(B, False), -1)) > cos_lim:
                    paths[i] = A + list(reversed(B))[1:]
                    paths.pop(j)
                    changed = True
                    break
            if changed:
                break
    return paths


def bridge(paths, gap=220.0, angle=10.0):
    """
    Close the gaps a crossing stroke leaves behind - a stave interrupted by a
    crossbar arrives as two pieces, an X's diagonal as two halves. Unlike
    chain(), this joins across a gap, so it insists the two pieces are properly
    collinear rather than merely heading the same way.
    """
    cos_lim = math.cos(math.radians(angle))
    paths = [list(p) for p in paths]

    def ends(pth):
        # (point, outward direction) for the head and the tail
        return [(pth[0], norm(sub(pth[0], pth[1]))), (pth[-1], norm(sub(pth[-1], pth[-2])))]

    changed = True
    while changed:
        changed = False
        for i in range(len(paths)):
            for j in range(i + 1, len(paths)):
                A, B = paths[i], paths[j]
                joined = None
                for ai, (pa, da) in enumerate(ends(A)):
                    for bi, (pb, db) in enumerate(ends(B)):
                        span = sub(pb, pa)
                        d = length(span)
                        if d < 1e-6 or d >= gap:
                            continue
                        u = norm(span)
                        # both pieces must point along the bridge, and be parallel
                        if dot(da, u) > cos_lim and dot(db, mul(u, -1)) > cos_lim and dot(da, mul(db, -1)) > cos_lim:  # noqa: E501
                            left = list(reversed(A)) if ai == 0 else list(A)
                            right = list(B) if bi == 0 else list(reversed(B))
                            joined = left + right
                            break
                    if joined:
                        break
                if joined:
                    paths[i] = joined
                    paths.pop(j)
                    changed = True
                    break
            if changed:
                break
    return absorb_overlaps([p for p in paths if arc_length(p) > 0.35 * W])


def absorb_overlaps(paths, perp=18.0):
    """
    Two detections of the same straight bar can overlap rather than abut - the
    stave of ᚣ comes through twice, each copy covering part of it. Collapse any
    such pair into their union.
    """
    paths = [list(p) for p in paths]
    changed = True
    while changed:
        changed = False
        for i in range(len(paths)):
            for j in range(i + 1, len(paths)):
                A, B = paths[i], paths[j]
                if len(A) != 2 or len(B) != 2:
                    continue
                d = norm(sub(A[1], A[0]))
                n = (-d[1], d[0])
                if abs(dot(sub(B[0], A[0]), n)) > perp or abs(dot(sub(B[1], A[0]), n)) > perp:
                    continue
                ts = [0.0, length(sub(A[1], A[0])),
                      dot(sub(B[0], A[0]), d), dot(sub(B[1], A[0]), d)]
                lo, hi = min(ts), max(ts)
                if hi - lo > length(sub(A[1], A[0])) + length(sub(B[1], B[0])) + 1.0:
                    continue                      # a gap, not an overlap
                paths[i] = [add(A[0], mul(d, lo)), add(A[0], mul(d, hi))]
                paths.pop(j)
                changed = True
                break
            if changed:
                break
    return paths


def arc_length(path):
    return sum(length(sub(path[i + 1], path[i])) for i in range(len(path) - 1))


def dist_to_path(p, path):
    best = float('inf')
    for i in range(len(path) - 1):
        a, b = path[i], path[i + 1]
        ab = sub(b, a)
        l2 = dot(ab, ab)
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, dot(sub(p, a), ab) / l2))
        best = min(best, length(sub(p, add(a, mul(ab, t)))))
    return best


def extend(path, polys, others):
    """
    Push each free end out to the outline. The edge overlap that produced the
    centreline stops short of the tip, so strokes come out a little shy.

    An end that meets another stroke is left where it is - otherwise an arm
    would run straight through the stave and out the far side.
    """
    path = [tuple(p) for p in path]
    head, tail = list(path[0]), list(path[-1])
    d_tail = norm(sub(path[-1], path[-2]))
    d_head = norm(sub(path[0], path[1]))

    if all(dist_to_path(path[-1], o) > 0.8 * W for o in others):
        for _ in range(int(W)):
            n = (tail[0] + d_tail[0] * 2, tail[1] + d_tail[1] * 2)
            if inside((n[0] + d_tail[0] * 4, n[1] + d_tail[1] * 4), polys):
                tail = list(n)
            else:
                break
    if all(dist_to_path(path[0], o) > 0.8 * W for o in others):
        for _ in range(int(W)):
            n = (head[0] + d_head[0] * 2, head[1] + d_head[1] * 2)
            if inside((n[0] + d_head[0] * 4, n[1] + d_head[1] * 4), polys):
                head = list(n)
            else:
                break
    return [tuple(head)] + list(path[1:-1]) + [tuple(tail)]


def simplify(pts, tol=6.0):
    """Douglas-Peucker: a straight stroke collapses back to two points."""
    if len(pts) < 3:
        return list(pts)
    a, b = pts[0], pts[-1]
    d = norm(sub(b, a))
    n = (-d[1], d[0])
    worst, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        dev = abs(dot(sub(pts[i], a), n))
        if dev > worst:
            worst, idx = dev, i
    if worst <= tol:
        return [a, b]
    return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def trails(paths, tol=0.45 * W):
    """
    Join strokes into continuous trails, so the pen lifts as rarely as it
    sensibly can.

    Where strokes meet end to end they can be written without lifting. Treating
    the meeting points as nodes and the strokes as edges gives a small graph;
    the fewest pen strokes needed is one per pair of odd-degree nodes (or one
    for a closed loop), which is just Euler's result about bridges. ᛟ comes out
    as a single line this way, ᛞ as one closed circuit.

    Crossings are not junctions - two lines passing through each other don't
    give the pen anywhere to turn - and only stroke *endpoints* become nodes,
    so they're handled correctly for free.
    """
    nodes = []                      # representative point per node

    def node_of(pt):
        for i, q in enumerate(nodes):
            if length(sub(pt, q)) <= tol:
                return i
        nodes.append(pt)
        return len(nodes) - 1

    edges = []                      # (node_a, node_b, points)
    for pth in paths:
        edges.append([node_of(pth[0]), node_of(pth[-1]), [tuple(q) for q in pth]])

    incident = {}
    for idx, (a, b, _) in enumerate(edges):
        incident.setdefault(a, []).append(idx)
        incident.setdefault(b, []).append(idx)

    used = [False] * len(edges)
    out = []

    def walk(start):
        trail, node = [], start
        while True:
            nxt = None
            for idx in incident.get(node, []):
                if not used[idx]:
                    nxt = idx
                    break
            if nxt is None:
                return trail, node
            used[nxt] = True
            a, b, pts = edges[nxt]
            if a == node:
                trail.append(pts)
                node = b
            else:
                trail.append(list(reversed(pts)))
                node = a

    # Start from odd-degree nodes: those are the only places a trail can begin
    # or end. Prefer the highest, then the leftmost, so strokes start at the top.
    order = sorted(incident, key=lambda n: (-nodes[n][1], nodes[n][0]))
    for start in [n for n in order if len(incident[n]) % 2 == 1] + order:
        while any(not used[i] for i in incident.get(start, [])):
            segs, _ = walk(start)
            if not segs:
                break
            pts = list(segs[0])
            for s in segs[1:]:
                pts.extend(s[1:])
            out.append(pts)
    return out


def order_and_orient(paths):
    """
    Stave first, then the rest top to bottom; each stroke oriented the way you
    would naturally draw it - verticals downward, arms outward from the stave.
    """
    def overall(pth):
        return norm(sub(pth[-1], pth[0]))

    verts = [p for p in paths if abs(overall(p)[0]) < 0.15]
    stave = None
    if verts:
        longest = max(arc_length(p) for p in verts)
        stave = min((p for p in verts if arc_length(p) > longest * 0.85),
                    key=lambda p: min(q[0] for q in p))

    rest = [p for p in paths if p is not stave]
    rest.sort(key=lambda p: (-max(q[1] for q in p), min(q[0] for q in p)))

    out = []
    for pth in ([stave] if stave else []) + rest:
        d = overall(pth)
        flip = False
        if abs(d[0]) < 0.15:                            # vertical: top to bottom
            flip = pth[0][1] < pth[-1][1]
        elif stave is not None and pth is not stave:     # arm: outward from stave
            sx = sum(q[0] for q in stave) / len(stave)
            flip = abs(pth[0][0] - sx) > abs(pth[-1][0] - sx)
        else:
            flip = pth[0][1] < pth[-1][1] or (pth[0][1] == pth[-1][1] and pth[0][0] > pth[-1][0])
        out.append(list(reversed(pth)) if flip else list(pth))
    return out


def arc(cx, cy, r, n=9):
    """Quarter arc from directly below the centre round to directly right."""
    out = []
    for i in range(n):
        th = math.radians(90.0 * i / (n - 1))
        out.append([round(cx + r * math.sin(th), 2), round(cy + r * math.cos(th), 2)])
    return out


# A couple of glyphs the automatic pass can't resolve on its own, given in
# output coordinates (100-unit box, y downward).
#
# ᚠ: both arms are quarter arcs about the same centre. The tighter upper arc
# bends too sharply for the edge pairing to follow it round the corner, so both
# arms are stated here as arcs - which is exactly what the font draws.
def overrides():
    cx, cy = 6.3, 0.63
    return {
        'ᚠ': [
            [[6.3, 0.0], [6.3, 100.0]],
            list(reversed(arc(cx, cy, 59.4))),
            list(reversed(arc(cx, cy, 32.2))),
        ],
        # ᚦ: the bowl leaves the stave, goes round and comes back to it - one
        # stroke, not two. The detector splits it where the outline turns.
        'ᚦ': [
            [[5.95, 0.0], [5.95, 100.0]],
            [[5.95, 16.8], [11.9, 17.93], [22.77, 19.96], [33.05, 23.98], [39.41, 28.72],
             [44.43, 36.91], [46.29, 48.81], [44.87, 60.89], [40.81, 69.25], [33.68, 75.56],
             [27.1, 78.78], [11.9, 82.35], [5.95, 83.75]],
        ],
        # ᚢ: likewise - left side down, then over the top and down the right in
        # a single sweep.
        'ᚢ': [
            [[6.3, 6.6], [6.3, 100.0]],
            [[6.3, 6.6], [28.04, 8.26], [47.2, 10.5], [57.86, 17.28], [61.5, 28.0],
             [62.76, 41.01], [63.52, 100.0]],
        ],
        # ᛄ: the lozenge comes out as four disconnected sides whose tips stop
        # short of the points. It's one continuous loop with a pen - round
        # anticlockwise from the top, like drawing an O - so that's how it's
        # given here. (Straight sides, not a circle: that's the letterform.)
        'ᛄ': [
            [[27.1, 0.0], [27.1, 100.0]],
            [[27.1, 28.0], [1.3, 48.9], [27.1, 72.5], [52.9, 48.9], [27.1, 28.0]],
        ],
        # ᛟ: the whole thing is one continuous line. Only the two leg ends have
        # an odd number of lines meeting them, so a single stroke starting at
        # one and finishing at the other covers every part exactly once - up
        # the left leg, round the diamond, down the right.
        'ᛟ': [
            [[7.8, 99.5], [60.7, 31.7], [35.1, 0.6], [10.1, 31.6], [62.8, 99.4]],
        ],
    }


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else 'src/assets/NotoSansRunic.woff2')
    font = TTFont(str(src))
    gs, cmap = font.getGlyphSet(), font.getBestCmap()

    scale = 100.0 / CAP
    lines = [
        '// AUTO-GENERATED by scripts/genglyphs.py from Noto Sans Runic - do not edit by hand.',
        '// Coordinates are in a 100-unit-tall box with y increasing downward.',
        '//   w        glyph width in that box',
        '//   strokes  pen paths in drawing order; each is a polyline of [x,y]',
        '//            points (two for a straight stroke, more for a curved one)',
        '//   path     the raw font outline (y-up); apply outlineTransform()',
        'export const GLYPHS = {',
    ]
    for r in RUNES:
        name = cmap[ord(r)]
        edges, polys = contours_of(gs, name)
        paths = bridge(chain(centrelines(edges, polys)))
        paths = [extend(p, polys, [o for o in paths if o is not p]) for p in paths]
        paths = absorb_overlaps([simplify(p) for p in paths])
        paths = order_and_orient(trails(paths))

        bp = BoundsPen(gs); gs[name].draw(bp)
        xmin, _, xmax, _ = bp.bounds
        pen = SVGPathPen(gs); gs[name].draw(pen)

        T = lambda q: [round((q[0] - xmin) * scale, 2), round((CAP - q[1]) * scale, 2)]
        strokes = overrides().get(r) or [[T(q) for q in path] for path in paths]
        lines.append(
            "  '%s': { w: %s, strokes: %s, path: '%s', xmin: %s, scale: %s },"
            % (r, round((xmax - xmin) * scale, 2), json.dumps(strokes),
               pen.getCommands(), xmin, round(scale, 6))
        )
        print(f'  {r}  {len(strokes)} strokes  ({",".join(str(len(s)) for s in strokes)} pts)')
    lines.append('};\n')
    lines.append("""// Puts the raw outline into the same 100-unit space as the strokes.
export function outlineTransform(r) {
  const g = GLYPHS[r];
  return `translate(${-g.xmin * g.scale} 100) scale(${g.scale} ${-g.scale})`;
}
""")
    out = Path('src/data/glyphs.js')
    out.write_text('\n'.join(lines))
    print(f'wrote {out} - {len(RUNES)} runes')


if __name__ == '__main__':
    main()
