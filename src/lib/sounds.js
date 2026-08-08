// Talking about a sound without always saying it the same way.
//
// Every rune already carries example words with the relevant letters marked:
// ᛁ has s{i}t, b{i}g, g{i}ve. Until now the app showed one fixed gloss - "short
// i as in sit" - every single time, which teaches the sentence rather than the
// sound. Rotating through the examples costs nothing and means you meet the
// rune in three different words instead of memorising one.
//
// The more useful half is what this makes possible for wrong answers. If the
// options are "i as in sit", "n as in now" and "k as in kite", the letter alone
// gives it away and no thought is required. If they are "i as in sit", "i as in
// time" and "i as in bird", the letter tells you nothing and you have to hear
// the word. English spelling maps many sounds onto the same letter, which is a
// nuisance everywhere else and a gift here.

import { RUNES, DIGRAPHS } from '../data/runes.js';

/** Every rune and digraph, as one list with a common shape. */
const ALL = [
  ...RUNES.map((r) => ({ key: r.r, gloss: r.gloss, eg: r.eg || [], ipa: r.ipa || [] })),
  ...DIGRAPHS.map((d) => ({ key: d.d, gloss: d.gloss, eg: d.eg || [], ipa: [d.ipa] })),
];

/**
 * Pull the marked letters and the plain word out of an example.
 *
 * 's{i}t' becomes { letters: 'i', word: 'sit' }. A word can mark more than one
 * span - 'ba{ck}' is one, but 'be{h}ind' and '{wh}en' show the marks are not
 * always a single letter - so the letters are joined in the order they appear.
 */
export function parseExample(eg) {
  const letters = [...eg.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).join('');
  const word = eg.replace(/[{}]/g, '');
  return { letters, word };
}

const EXAMPLES = new Map(
  ALL.map((r) => [r.key, r.eg.map(parseExample).filter((e) => e.letters && e.word)]),
);

/** The parsed examples for a rune, or an empty list. */
export const examplesFor = (rune) => EXAMPLES.get(rune) ?? [];

/**
 * "i as in sit", varying with [n] so the same rune reads differently between
 * sessions. Falls back to the rune's fixed gloss when it has no examples.
 */
export function glossFor(rune, n = 0) {
  const list = examplesFor(rune);
  if (!list.length) return ALL.find((r) => r.key === rune)?.gloss ?? rune;
  const { letters, word } = list[Math.abs(n) % list.length];
  return `${letters} as in ${word}`;
}

/**
 * "i as in time" rather than "ie as in lie" - the same rune, described using
 * the spelling the question is trying to make you think about.
 *
 * Picking each option's example independently wastes most of the effect: the
 * target might read "i as in sit" while its rival reads "ie as in lie", and the
 * eye separates them on the letters again. Asked to match "i", the rival now
 * offers its own i-spelled word and all the options start the same way.
 *
 * Falls back to the varying example when the rune has no word spelled that way.
 */
export function glossMatching(rune, letters, n = 0) {
  const list = examplesFor(rune);
  if (!list.length) return glossFor(rune, n);
  const same = list.filter((e) => e.letters.toLowerCase() === letters.toLowerCase());
  if (!same.length) return glossFor(rune, n);
  const { letters: l, word } = same[Math.abs(n) % same.length];
  return `${l} as in ${word}`;
}

/**
 * Which runes are spelled with the same letters but sound different.
 *
 * Built from the examples rather than hand-listed, so it stays true when the
 * word lists change. A rune is only confusable with another if they share a
 * spelling *and* differ in sound - ᛁ and ᛡ are both written i, which is the
 * whole point, but two runes that share a spelling and a sound would be a
 * trick question with two right answers.
 */
const BY_LETTERS = new Map();
for (const { key } of ALL) {
  for (const { letters } of examplesFor(key)) {
    const k = letters.toLowerCase();
    if (!BY_LETTERS.has(k)) BY_LETTERS.set(k, new Set());
    BY_LETTERS.get(k).add(key);
  }
}

const soundOf = (rune) => (ALL.find((r) => r.key === rune)?.ipa ?? []).join(',');

export function confusableWith(rune) {
  const mine = soundOf(rune);
  const out = new Set();
  for (const { letters } of examplesFor(rune)) {
    for (const other of BY_LETTERS.get(letters.toLowerCase()) ?? []) {
      if (other !== rune && soundOf(other) !== mine) out.add(other);
    }
  }
  return [...out];
}

/**
 * Options for a "what sound is this?" question.
 *
 * Fills with same-spelling rivals first, so the answer cannot be had by
 * glancing at the letter, then tops up from [pool] when a rune has few or no
 * spelling twins. Returns runes, not text - the caller decides which example
 * word each one gets, so two options never quote the same word.
 */
export function soundOptions(rune, pool, count = 4, pick = Math.random) {
  const tricky = confusableWith(rune).filter((r) => pool.includes(r));
  const rest = pool.filter((r) => r !== rune && !tricky.includes(r));
  const shuffle = (a) => {
    const x = [...a];
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(pick() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  };
  const chosen = [...shuffle(tricky), ...shuffle(rest)].slice(0, count - 1);
  return shuffle([rune, ...chosen]);
}

/**
 * A complete "what sound is this?" question: the options and their wording.
 *
 * One entry point rather than leaving callers to pair runes with glosses
 * themselves, because doing that naively lets two options quote the same word -
 * measured at 6 in 400 - and two identical options is not a hard question, it
 * is a broken one. Words are claimed as they are assigned and an option that
 * cannot find an unused one falls back through its other examples.
 *
 * Returns [{ rune, text }], shuffled, with exactly one matching [rune].
 */
export function soundQuestion(rune, pool, { count = 4, session = 0, pick = Math.random } = {}) {
  const mine = examplesFor(rune);
  const chosen = mine.length ? mine[Math.abs(session) % mine.length] : null;
  const letters = chosen?.letters ?? '';

  const used = new Set();
  const wordOf = (text) => text.replace(/^.* as in /, '');

  const describe = (r, i) => {
    // Prefer the spelling the question is about, then anything unused.
    const candidates = [
      glossMatching(r, letters, i),
      ...examplesFor(r).map((e) => `${e.letters} as in ${e.word}`),
    ];
    const free = candidates.find((c) => !used.has(wordOf(c)));
    const text = free ?? candidates[0];
    used.add(wordOf(text));
    return text;
  };

  const options = soundOptions(rune, pool, count, pick);
  // The answer claims its word first, so a distractor can never take it.
  const answerText = chosen ? `${chosen.letters} as in ${chosen.word}` : glossFor(rune, session);
  used.add(wordOf(answerText));

  return options.map((r, i) => ({
    rune: r,
    text: r === rune ? answerText : describe(r, i),
  }));
}
