import { LEXICON } from '../data/lexicon.js';
import { lettersToSounds } from './g2p.js';
import { phonemesToRunes, runesToPhonemes, SAY, VOWELS } from './phonology.js';
import { SEP } from '../data/runes.js';

const DEFAULTS = {
  ligatures: true,     // use ᛥ for st and ᛢ for qu
  markVoiceless: true, // ᚠᚠ / ᛋᛋ at the end of a word
  separator: 'interpunct', // 'interpunct' | 'space'
};

/** Look a word up, or work it out from its spelling. */
export function wordToPhonemes(word) {
  const key = word.toLowerCase().replace(/[^a-z']/g, '').replace(/[''']/g, '');
  if (!key) return { phonemes: [], guessed: false };
  if (LEXICON[key]) return { phonemes: LEXICON[key], guessed: false };

  // Try to strip a regular inflection and reuse the dictionary entry.
  const strip = [
    [/ies$/, 'y', ['z']],
    [/es$/, '', ['ɪ', 'z']],
    [/s$/, '', null],          // voicing decided below
    [/ing$/, '', ['ɪ', 'ŋ']],
    [/ing$/, 'e', ['ɪ', 'ŋ']],
    [/ed$/, '', null],
    [/ed$/, 'e', null],
    [/ly$/, '', ['l', 'i']],
    [/er$/, '', ['ə']],
    [/est$/, '', ['ɪ', 's', 't']],
  ];
  for (const [re, repl, suffix] of strip) {
    if (!re.test(key)) continue;
    const stem = key.replace(re, repl);
    if (!LEXICON[stem]) continue;
    const base = [...LEXICON[stem]];
    const last = base[base.length - 1];
    if (suffix) return { phonemes: [...base, ...suffix], guessed: false };
    if (/s$/.test(key)) {
      if (['s', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ'].includes(last)) return { phonemes: [...base, 'ɪ', 'z'], guessed: false };
      return { phonemes: [...base, 'ptkfθ'.includes(last) ? 's' : 'z'], guessed: false };
    }
    if (/ed$/.test(key)) {
      if (last === 't' || last === 'd') return { phonemes: [...base, 'ɪ', 'd'], guessed: false };
      return { phonemes: [...base, 'ptkfθsʃ'.includes(last) || last === 'tʃ' ? 't' : 'd'], guessed: false };
    }
  }

  return { phonemes: lettersToSounds(key), guessed: true };
}

/** One English word → runes. */
export function transliterateWord(word, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const { phonemes, guessed } = wordToPhonemes(word);
  // Where English spells /ks/ with an x, keep the ᛉ shorthand.
  const ph = /x/i.test(word)
    ? mergeKs(phonemes)
    : phonemes;
  return { runes: phonemesToRunes(ph, o), phonemes: ph, guessed };
}

function mergeKs(ph) {
  const out = [];
  for (let i = 0; i < ph.length; i++) {
    if (ph[i] === 'k' && ph[i + 1] === 's') { out.push('ks'); i++; }
    else out.push(ph[i]);
  }
  return out;
}

import { transliterateNumbersInText } from './numbers.js';

/**
 * A whole passage of English → runes.
 * Numbers are spelled out into Futhorc runes, while punctuation and line breaks are carried through.
 */
export function transliterate(text, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const joiner = o.separator === 'space' ? ' ' : SEP;
  const guesses = [];
  
  // First convert any numbers (0-9999) into spelled-out Futhorc runes
  const textWithRunicNumbers = transliterateNumbersInText(text, o);

  const out = textWithRunicNumbers.replace(/[A-Za-z][A-Za-z''']*/g, (m) => {
    const { runes, guessed } = transliterateWord(m, o);
    if (guessed) guesses.push(m);
    return runes;
  });
  // Spaces between two runic words become the word separator.
  const joined = out.replace(/(\p{Script=Runic})[ \t]+(?=\p{Script=Runic})/gu, `$1${joiner}`);
  return { text: joined, guesses };
}

/** Runes → a phonetic English respelling you can sound out. */
export function readAloud(runicWord) {
  return runesToPhonemes(runicWord).map((p) => SAY[p] ?? p).join('-');
}

/** Split a runic word into its sound-units, for display and for tapping through. */
export function splitUnits(runicWord) {
  const units = [];
  let i = 0;
  const SEQS = ['ᚳᚻ', 'ᚷᚻ', 'ᛋᚻ', 'ᛁᛁ', 'ᛖᛖ', 'ᚢᚢ', 'ᛟᛟ', 'ᚣᚣ', 'ᚠᚠ', 'ᛋᛋ', 'ᛟᛁ', 'ᚪᚹ', 'ᛁᚢ', 'ᚣᚢ'];
  while (i < runicWord.length) {
    const two = runicWord.slice(i, i + 2);
    if (SEQS.includes(two)) { units.push(two); i += 2; }
    else { units.push(runicWord[i]); i += 1; }
  }
  return units;
}

export { VOWELS, DEFAULTS };
