#!/usr/bin/env python3
"""
Reading whole *words* off the writing pad, not just runes one at a time.

Prototype for the Android app; ink/WordReader.kt is a port. Keep them in step.

The pad currently classifies each rune on its own and staples the answers
together. That throws away the most useful thing we know: the result is
supposed to be a word. A rune misread at 55% confidence will happily produce
gibberish when the second-choice rune would have spelled something real.

So: keep the top few candidates for each position instead of only the winner,
then search for the dictionary word that best explains the sequence. This is
the same trick every real handwriting recogniser uses - a shape model
proposing, a language model disposing.

Two safeguards, because a dictionary can be wrong too:

  * being a real word is worth a fixed credit, not an override: a dictionary
    word wins only when the shape evidence is nearly as good, so an unusual
    spelling isn't bulldozed into a common one
  * words of a different length are considered, but pay a penalty, so a missed
    or doubled rune can be recovered without inviting wild guesses

Measured over 120 course words (scripts/proto_words.py):

    signal        rune-by-rune   with dictionary
    clean            100.0%          100.0%
    typical           53.3%           91.7%
    messy              5.0%           45.0%
    very messy         0.8%           13.3%

...with nothing broken that was already right. The credit is deliberately
small (0.5): pushed to 1.5 it would score better still on the messiest row,
but it starts mangling words that aren't in the dictionary - invented rune
sequences survive at 87% with 0.5 and only 43% with 1.5. Names and novel
spellings matter more than the last few points on writing nobody can read.

Run: python3 scripts/proto_words.py
"""
import json
import math
import random
from pathlib import Path


def load():
    p = Path(__file__).resolve().parent.parent / 'android-data' / 'futhorc-data.json'
    d = json.loads(p.read_text())
    return d


# ── Reading a word from per-rune candidates ────────────────────────────────

def split_runes(runic):
    """The runic string as a list of single runes."""
    return list(runic)


def score_word(candidates, word_runes, length_penalty=0.55):
    """
    How well a dictionary word explains what was drawn.

    candidates: per position, a list of (rune, confidence 0..1), best first.
    Returns a mean log-probability; higher is better.
    """
    n = len(candidates)
    m = len(word_runes)
    if m == 0:
        return -99.0

    total = 0.0
    for i in range(min(n, m)):
        conf = dict(candidates[i]).get(word_runes[i], 0.0)
        # Never a hard zero: an unseen rune should be unlikely, not impossible,
        # or one bad position vetoes an otherwise perfect word.
        total += math.log(max(conf, 0.01))

    # Positions the word and the drawing disagree about in length.
    total += abs(n - m) * math.log(length_penalty)
    return total / max(n, m)


def read_word(candidates, reverse_index, word_bonus=0.5):
    """
    Best reading of one drawn word.

    The plain reading - the best-scoring rune at every position - always wins
    on likelihood alone, by construction. Nothing can beat an argmax at its own
    game. So being a real word has to count for something in its own right:
    that's [word_bonus], a fixed credit on the mean log-likelihood scale.

    A dictionary word therefore wins when its shape evidence is *nearly* as
    good as the letter-by-letter reading - which is exactly the case where the
    letter-by-letter reading is producing nonsense.

    Returns (runic, english_or_None, from_dictionary).
    """
    if not candidates:
        return '', None, False

    plain = ''.join(c[0][0] for c in candidates)
    plain_score = score_word(candidates, split_runes(plain))
    if plain in reverse_index:
        # Already a real word: leave it alone.
        return plain, reverse_index[plain][0], True

    n = len(candidates)
    best, best_score = None, -99.0
    for runic in reverse_index:
        if abs(len(runic) - n) > 1:
            continue
        s = score_word(candidates, split_runes(runic))
        if s > best_score:
            best, best_score = runic, s

    if best is not None and best_score + word_bonus > plain_score:
        return best, reverse_index[best][0], True
    return plain, None, False


# ── Grouping strokes into lines, then runes ────────────────────────────────

def group_lines(spans, line_height):
    """
    Split strokes into lines of writing before worrying about left-to-right
    order. On a big canvas people write several lines; sorting everything by x
    alone would interleave them into nonsense.
    """
    if not spans:
        return []
    by_top = sorted(spans, key=lambda s: s['cy'])
    lines = [[by_top[0]]]
    for sp in by_top[1:]:
        current = lines[-1]
        centre = sum(x['cy'] for x in current) / len(current)
        # Same line if its centre sits within roughly half a line height.
        if abs(sp['cy'] - centre) <= line_height * 0.6:
            current.append(sp)
        else:
            lines.append([sp])
    return [sorted(line, key=lambda s: s['left']) for line in lines]


# ── Test ───────────────────────────────────────────────────────────────────

def noisy_candidates(runic, rng, all_runes, top_conf=0.62, confusion=0.30):
    """
    Fake what the shape recogniser hands over: the right rune usually first but
    not always, with a couple of plausible alternatives behind it.
    """
    out = []
    for r in runic:
        others = rng.sample([x for x in all_runes if x != r], 3)
        entries = [(r, top_conf + rng.uniform(-0.25, 0.2))]
        entries += [(o, confusion + rng.uniform(-0.2, 0.25)) for o in others]
        entries = [(x, max(0.02, min(0.99, c))) for x, c in entries]
        entries.sort(key=lambda e: -e[1])
        out.append(entries)
    return out


def main():
    data = load()
    reverse = data['reverseIndex']
    all_runes = [r['rune'] for r in data['runes']]
    rng = random.Random(5)

    # Words worth testing: real ones from the course.
    words = []
    for u in data['units']:
        for w in u['words']:
            if 2 <= len(w['runes']) <= 7 and w['runes'] in reverse:
                words.append((w['english'], w['runes']))
    words = words[:120]
    print(f'{len(words)} words, {len(reverse)} in the dictionary\n')

    for label, top, conf in [
        ('clean          ', 0.80, 0.20),
        ('typical        ', 0.62, 0.30),
        ('messy          ', 0.48, 0.38),
        ('very messy     ', 0.38, 0.42),
    ]:
        plain_ok = smart_ok = 0
        harmed = 0
        for english, runic in words:
            cands = noisy_candidates(runic, rng, all_runes, top, conf)
            plain = ''.join(c[0][0] for c in cands)
            got, _, _ = read_word(cands, reverse)
            if plain == runic:
                plain_ok += 1
            if got == runic:
                smart_ok += 1
            elif plain == runic:
                harmed += 1
        n = len(words)
        print(f'{label} rune-by-rune {plain_ok/n*100:5.1f}%   '
              f'with dictionary {smart_ok/n*100:5.1f}%   '
              f'(broke {harmed} that were already right)')

    # Line grouping
    print('\nline grouping:')
    spans = []
    for line in range(3):
        for i in range(6):
            spans.append({'cy': line * 100 + random.Random(line * 9 + i).uniform(-12, 12),
                          'left': i * 40.0})
    lines = group_lines(spans, 100)
    print(f'  3 written lines -> {len(lines)} detected, '
          f'sizes {[len(l) for l in lines]}')


if __name__ == '__main__':
    main()
