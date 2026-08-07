#!/usr/bin/env python3
"""
The daily session: what to revise, what today's challenge is, and how the
streak survives a missed day.

Prototype for the Android app; data/Daily.kt is a port. Keep them in step.

Three pieces, each with a way of going wrong that only shows up weeks in:

  * revision picks runes by how shaky they are and how long since you saw them.
    The failure mode is a queue that fixates - the same six runes every day
    because they're the worst and practising them once doesn't clear them.

  * the streak has to forgive one missed day a week. A streak that snaps after
    a single bad day tends to make people stop entirely rather than start
    again, and the arithmetic for "did I have a rest day in hand" is the sort
    that's fine for a fortnight and wrong at a month boundary.

  * the challenge rotates by weekday so the day has a shape, but must be
    deterministic - the same day has to give the same challenge however many
    times the screen is opened, or leaving and coming back rerolls it.

Run: python3 scripts/proto_daily.py
"""
import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

# ── Revision ───────────────────────────────────────────────────────────────

# How many days a rune waits before coming round again, by how well it's known.
# Doubling each step is the usual spaced-repetition ladder: get it right and
# the gap grows, get it wrong and you drop a rung.
INTERVALS = [0, 1, 2, 4, 8, 16, 32]
MAX_BOX = len(INTERVALS) - 1

DAILY_REVISION = 8


def box_of(p):
    """
    Which rung of the ladder a rune sits on, from its history.

    A rune counts as known on three fronts, not one: the sound it makes, the
    shape you have to draw, and its *name*. Feoh, ur, thorn, os, rad, cen are
    what the alphabet is actually called and how it is taught - knowing that ᚠ
    says "f" without knowing it is feoh is half an answer. So a weak name score
    caps the box in the same way a weak drawing does, and the rune keeps coming
    round until all three hold up.
    """
    seen = p.get('seen', 0)
    if seen == 0:
        return 0
    right = p.get('right', 0)
    ratio = right / seen
    draw = p.get('bestDraw', 0)
    name_seen = p.get('nameSeen', 0)
    name_ratio = (p.get('nameRight', 0) / name_seen) if name_seen else 0.0

    box = 0
    if ratio >= 0.5: box = 1
    if ratio >= 0.65 and seen >= 3: box = 2
    if ratio >= 0.75 and seen >= 5: box = 3
    if ratio >= 0.85 and seen >= 8: box = 4
    if ratio >= 0.9 and seen >= 12: box = 5
    if ratio >= 0.95 and seen >= 20: box = 6

    # Can't write it: no further than box 2.
    if draw and draw < 70:
        box = min(box, 2)
    # Can't name it, or has never been asked: no further than box 2 either.
    # Untested is treated as unknown deliberately - otherwise a rune drilled
    # hard on sound alone would graduate to a 32-day gap having never once
    # been asked what it is called.
    if name_seen < 3 or name_ratio < 0.75:
        box = min(box, 2)
    return box


def days_since(last, today):
    if not last:
        return 9999
    return (today - date.fromisoformat(last)).days


def due_runes(progress, today, limit=DAILY_REVISION):
    """
    Runes worth revising, most overdue first.

    Scored rather than filtered: on a day when nothing is technically due we
    still want a session, so everything gets a number and the top few win.
    """
    scored = []
    for rune, p in progress.items():
        box = box_of(p)
        wait = INTERVALS[box]
        elapsed = days_since(p.get('lastSeen'), today)
        overdue = elapsed - wait
        # Never-seen runes come first; then most overdue; a low draw score
        # nudges a rune up so writing practice isn't crowded out by reading.
        never = 1 if p.get('seen', 0) == 0 else 0
        draw_gap = max(0, 70 - p.get('bestDraw', 0)) / 70
        # An unnamed rune is pushed up the queue the same way an undrawable
        # one is, so name practice isn't crowded out by reading practice.
        ns = p.get('nameSeen', 0)
        name_gap = 1.0 if ns == 0 else max(0.0, 0.75 - p.get('nameRight', 0) / ns)
        scored.append((never, overdue + draw_gap + name_gap, rune))
    scored.sort(reverse=True)
    return [r for _, _, r in scored[:limit]]


# ── The daily challenge ────────────────────────────────────────────────────

CHALLENGES = [
    ('draw',     'Drawing',   'Draw {n} runes from memory'),
    ('names',    'Names',     'Name {n} runes - rune to name, and back'),
    ('read',     'Reading',   'Read {n} words without help'),
    ('listen',   'Listening', 'Write {n} words you hear'),
    ('speed',    'Speed',     'Name {n} runes against the clock'),
    ('write',    'Writing',   'Write {n} words in runes'),
    ('sentence', 'Sentences', 'Read a whole sentence'),
    ('mixed',    'Mixed bag', 'A bit of everything - {n} questions'),
]


def challenge_for(day, unlocked_runes):
    """
    Today's challenge. Deterministic: the same date always gives the same one,
    so reopening the screen doesn't reroll it.

    The type follows the weekday so the week has a shape; the size varies with
    a seed derived from the date, so it isn't identical week to week.
    """
    # Rotated by weekday *and* week number. Indexing on the weekday alone
    # would be neater, but there are eight kinds and only seven weekdays, so
    # the eighth would never once come up. Adding the week number walks the
    # whole set past every day of the week over eight weeks, and still leaves
    # any given week with seven different kinds in it.
    iso = day.isocalendar()
    kind, title, template = CHALLENGES[(day.weekday() + iso[1]) % len(CHALLENGES)]
    rng = random.Random(day.toordinal())
    base = 3 if unlocked_runes < 10 else 5 if unlocked_runes < 20 else 6
    n = base + rng.randint(0, 2)
    return {'kind': kind, 'title': title, 'text': template.format(n=n), 'target': n}


# ── Streak ─────────────────────────────────────────────────────────────────

REST_DAYS_PER_WEEK = 1


def update_streak(state, today):
    """
    Bring the streak up to date for [today], spending a rest day if that's
    what saves it.

    Returns a new state dict. Idempotent: calling it twice on the same day
    does nothing the second time, which matters because it runs on every
    launch.
    """
    s = dict(state)
    last = s.get('lastActiveDate')
    if last == today.isoformat():
        return s

    if last is None:
        s['streak'] = 1
        s['bestStreak'] = max(1, s.get('bestStreak', 0))
        s['lastActiveDate'] = today.isoformat()
        s['restDaysUsed'] = 0
        s['restWeek'] = week_key(today)
        return s

    gap = (today - date.fromisoformat(last)).days

    # New week, new allowance.
    if week_key(today) != s.get('restWeek'):
        s['restWeek'] = week_key(today)
        s['restDaysUsed'] = 0

    if gap <= 0:
        return s
    if gap == 1:
        s['streak'] = s.get('streak', 0) + 1
    else:
        missed = gap - 1
        allowance = REST_DAYS_PER_WEEK - s.get('restDaysUsed', 0)
        if missed <= allowance:
            # Covered by rest days: the streak survives and grows by one, not
            # by the days skipped - you don't get credit for days off.
            s['restDaysUsed'] = s.get('restDaysUsed', 0) + missed
            s['streak'] = s.get('streak', 0) + 1
        else:
            s['streak'] = 1
            s['restDaysUsed'] = 0

    s['bestStreak'] = max(s.get('bestStreak', 0), s['streak'])
    s['lastActiveDate'] = today.isoformat()
    return s


def week_key(d):
    """ISO year and week, so the allowance resets on a Monday."""
    iso = d.isocalendar()
    return f'{iso[0]}-{iso[1]}'


def rest_days_left(state, today):
    if week_key(today) != state.get('restWeek'):
        return REST_DAYS_PER_WEEK
    return max(0, REST_DAYS_PER_WEEK - state.get('restDaysUsed', 0))


# ── Tests ──────────────────────────────────────────────────────────────────

def load_runes():
    p = Path(__file__).resolve().parent.parent / 'android-data' / 'futhorc-data.json'
    return [r['rune'] for r in json.loads(p.read_text())['runes']]


def test_streak():
    print('=== streak ===')
    d = date(2026, 3, 2)          # a Monday
    s = {}
    cases = []

    # Practise every day for a week.
    st = {}
    for i in range(7):
        st = update_streak(st, d + timedelta(days=i))
    cases.append(('seven days in a row', st['streak'], 7))

    # Miss one day - should survive on the rest allowance.
    st = {}
    st = update_streak(st, d)
    st = update_streak(st, d + timedelta(days=1))
    st = update_streak(st, d + timedelta(days=3))     # skipped day 2
    cases.append(('missed one day', st['streak'], 3))

    # Miss two days in one week - allowance is one, so it resets.
    st = {}
    st = update_streak(st, d)
    st = update_streak(st, d + timedelta(days=4))     # skipped 3
    cases.append(('missed three days', st['streak'], 1))

    # Two separate single misses in the *same* week - second one breaks it.
    st = {}
    st = update_streak(st, d)                          # Mon
    st = update_streak(st, d + timedelta(days=2))      # Wed, spent the rest day
    st = update_streak(st, d + timedelta(days=4))      # Fri, none left
    cases.append(('two misses in one week', st['streak'], 1))

    # One miss in each of two weeks - the allowance refreshes on the Monday.
    st = {}
    st = update_streak(st, d + timedelta(days=4))      # Fri, week 10
    st = update_streak(st, d + timedelta(days=6))      # Sun, missed Sat
    st = update_streak(st, d + timedelta(days=8))      # Tue, missed Mon (week 11)
    cases.append(('one miss in each of two weeks', st['streak'], 3))

    # Opening the app twice in a day mustn't double-count.
    st = {}
    st = update_streak(st, d)
    st = update_streak(st, d)
    st = update_streak(st, d)
    cases.append(('opened three times in one day', st['streak'], 1))

    # Coming back after a month.
    st = {}
    st = update_streak(st, d)
    st = update_streak(st, d + timedelta(days=40))
    cases.append(('back after a month', st['streak'], 1))

    ok = True
    for name, got, want in cases:
        flag = 'ok ' if got == want else 'FAIL'
        if got != want: ok = False
        print(f'  [{flag}] {name}: streak {got} (expected {want})')
    return ok


def test_best_streak_kept():
    st = {}
    d = date(2026, 3, 2)
    for i in range(10):
        st = update_streak(st, d + timedelta(days=i))
    before = st['bestStreak']
    st = update_streak(st, d + timedelta(days=30))   # long gap, resets
    print(f'\n=== best streak ===\n  [{"ok " if st["bestStreak"] == before == 10 else "FAIL"}] '
          f'best kept at {st["bestStreak"]} after the run reset to {st["streak"]}')
    return st['bestStreak'] == 10


def test_revision_does_not_fixate():
    """
    The queue must move on. If the eight worst runes are simply the eight
    lowest scores, they come back every single day and nothing else is ever
    seen - which is the complaint that started this.
    """
    print('\n=== revision spread over 14 days ===')
    runes = load_runes()
    rng = random.Random(4)
    progress = {}
    for r in runes:
        seen = rng.randint(0, 15)
        nseen = rng.randint(0, 8)
        progress[r] = {
            'seen': seen,
            'right': int(seen * rng.uniform(0.4, 1.0)),
            'bestDraw': rng.choice([0, 40, 60, 75, 90]),
            'nameSeen': nseen,
            'nameRight': int(nseen * rng.uniform(0.3, 1.0)),
            'lastSeen': None,
        }

    today = date(2026, 3, 2)
    appearances = {r: 0 for r in runes}
    for day in range(14):
        d = today + timedelta(days=day)
        picked = due_runes(progress, d)
        for r in picked:
            appearances[r] += 1
            p = progress[r]
            p['seen'] += 1
            # Assume they mostly get it right, as you would when revising.
            if rng.random() < 0.8:
                p['right'] += 1
            p['bestDraw'] = min(100, p['bestDraw'] + rng.randint(0, 15))
            p['nameSeen'] += 1
            if rng.random() < 0.8:
                p['nameRight'] += 1
            p['lastSeen'] = d.isoformat()

    covered = sum(1 for v in appearances.values() if v > 0)
    worst = max(appearances.values())
    print(f'  {covered}/{len(runes)} runes seen at least once in a fortnight')
    print(f'  most-repeated rune appeared {worst} times in 14 days')
    ok = covered >= len(runes) * 0.8 and worst <= 8
    print(f'  [{"ok " if ok else "FAIL"}] queue moves on rather than fixating')
    return ok


def test_challenge_deterministic():
    print('\n=== challenge ===')
    d = date(2026, 3, 4)
    a = challenge_for(d, 20)
    b = challenge_for(d, 20)
    same = a == b
    print(f'  [{"ok " if same else "FAIL"}] same day gives the same challenge')
    # A calendar week - Monday to Sunday - should hold seven different kinds.
    monday = d - timedelta(days=d.weekday())
    kinds = {challenge_for(monday + timedelta(days=i), 20)['kind'] for i in range(7)}
    varied = len(kinds) == 7
    print(f'  [{"ok " if varied else "FAIL"}] a Mon-Sun week covers {len(kinds)} '
          f'different kinds')

    over8 = {challenge_for(d + timedelta(days=i), 20)['kind'] for i in range(56)}
    all_kinds = len(over8) == len(CHALLENGES)
    print(f'  [{"ok " if all_kinds else "FAIL"}] eight weeks covers all '
          f'{len(over8)}/{len(CHALLENGES)} kinds (the eighth is never stranded)')

    # The thing that would actually feel repetitive: the same challenge twice
    # in a row. The week-number term shifts by one across a Sunday, so check.
    adjacent = [i for i in range(120)
                if challenge_for(d + timedelta(days=i), 20)['kind']
                == challenge_for(d + timedelta(days=i + 1), 20)['kind']]
    no_repeat = not adjacent
    print(f'  [{"ok " if no_repeat else "FAIL"}] no two consecutive days share a '
          f'kind over 120 days')
    varied = varied and all_kinds and no_repeat
    for i in range(7):
        day = monday + timedelta(days=i)
        c = challenge_for(day, 20)
        print(f'    {day.strftime("%a")}  {c["title"]:10} {c["text"]}')
    return same and varied


def main():
    results = [
        test_streak(),
        test_best_streak_kept(),
        test_revision_does_not_fixate(),
        test_challenge_deterministic(),
    ]
    print(f'\n{sum(results)}/{len(results)} groups passed')


if __name__ == '__main__':
    main()
