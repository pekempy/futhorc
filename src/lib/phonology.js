// Phonemes → runes, and back again.
//
// Phonemes are written in IPA, as an array of tokens, e.g.
//   'thought' → ['θ','ɔː','t'] → ᚦᛟᛟᛏ

export const VOWELS = new Set([
  'ɪ', 'e', 'æ', 'ʌ', 'ɒ', 'ʊ', 'ə', 'i',
  'iː', 'ɑː', 'ɜː', 'ɔː', 'uː', 'ɛː',
  'eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'ʊə',
]);

export const P2R = {
  // consonants
  p: 'ᛈ', b: 'ᛒ', t: 'ᛏ', d: 'ᛞ', k: 'ᚳ', g: 'ᚷ', 'ɡ': 'ᚷ',
  'tʃ': 'ᚳᚻ', 'dʒ': 'ᚷᚻ',
  f: 'ᚠ', v: 'ᚠ', 'θ': 'ᚦ', 'ð': 'ᚦ',
  s: 'ᛋ', z: 'ᛋ', 'ʃ': 'ᛋᚻ', 'ʒ': 'ᛋᚻ',
  h: 'ᚻ', m: 'ᛗ', n: 'ᚾ', 'ŋ': 'ᛝ',
  l: 'ᛚ', r: 'ᚱ', j: 'ᛄ', w: 'ᚹ',
  ks: 'ᛉ', // only where English spells it 'x'
  // short vowels ('i' is the unstressed final vowel of happy, city, very)
  'ɪ': 'ᛁ', e: 'ᛖ', 'æ': 'ᚫ', 'ʌ': 'ᚢ', 'ə': 'ᚢ', 'ɒ': 'ᛟ', 'ʊ': 'ᚣ', i: 'ᛁ',
  // long vowels — the short rune, doubled
  'iː': 'ᛁᛁ', 'ɛː': 'ᛖᛖ', 'ɜː': 'ᚢᚢ', 'ɔː': 'ᛟᛟ', 'uː': 'ᚣᚣ',
  'ɑː': 'ᚪ',
  // diphthongs
  'eɪ': 'ᛠ', 'aɪ': 'ᛡ', 'ɔɪ': 'ᛟᛁ', 'əʊ': 'ᚩ', 'aʊ': 'ᚪᚹ', 'ɪə': 'ᛁᚢ', 'ʊə': 'ᚣᚢ',
};

/** Rune sequences, longest first, for reading runes back into sounds. */
export const R2P = [
  ['ᚳᚻ', 'tʃ'], ['ᚷᚻ', 'dʒ'], ['ᛋᚻ', 'ʃ'],
  ['ᛁᛁ', 'iː'], ['ᛖᛖ', 'ɛː'], ['ᚢᚢ', 'ɜː'], ['ᛟᛟ', 'ɔː'], ['ᚣᚣ', 'uː'],
  ['ᚠᚠ', 'f'], ['ᛋᛋ', 's'],
  ['ᛟᛁ', 'ɔɪ'], ['ᚪᚹ', 'aʊ'], ['ᛁᚢ', 'ɪə'], ['ᚣᚢ', 'ʊə'],
  ['ᛥ', 'st'], ['ᛢ', 'kw'], ['ᛉ', 'ks'],
  ['ᛈ', 'p'], ['ᛒ', 'b'], ['ᛏ', 't'], ['ᛞ', 'd'], ['ᚳ', 'k'], ['ᚷ', 'g'],
  ['ᚠ', 'v'], ['ᚦ', 'ð'], ['ᛋ', 'z'], ['ᚻ', 'h'], ['ᛗ', 'm'], ['ᚾ', 'n'],
  ['ᛝ', 'ŋ'], ['ᛚ', 'l'], ['ᚱ', 'r'], ['ᛄ', 'j'], ['ᚹ', 'w'],
  ['ᛁ', 'ɪ'], ['ᛖ', 'e'], ['ᚫ', 'æ'], ['ᚢ', 'ə'], ['ᛟ', 'ɒ'], ['ᚣ', 'ʊ'],
  ['ᚪ', 'ɑː'], ['ᛠ', 'eɪ'], ['ᛡ', 'aɪ'], ['ᚩ', 'əʊ'],
];

/** A rough English respelling for each phoneme, for people who don't read IPA. */
export const SAY = {
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g', 'ɡ': 'g', 'tʃ': 'ch', 'dʒ': 'j',
  f: 'f', v: 'v', 'θ': 'th', 'ð': 'th', s: 's', z: 'z', 'ʃ': 'sh', 'ʒ': 'zh',
  h: 'h', m: 'm', n: 'n', 'ŋ': 'ng', l: 'l', r: 'r', j: 'y', w: 'w', ks: 'ks',
  'ɪ': 'i', e: 'e', 'æ': 'a', 'ʌ': 'u', 'ə': 'uh', 'ɒ': 'o', 'ʊ': 'oo', i: 'ee',
  'iː': 'ee', 'ɛː': 'air', 'ɜː': 'ur', 'ɔː': 'aw', 'uː': 'oo', 'ɑː': 'ah',
  'eɪ': 'ay', 'aɪ': 'y', 'ɔɪ': 'oy', 'əʊ': 'oh', 'aʊ': 'ow', 'ɪə': 'eer', 'ʊə': 'oor',
};

const DEFAULT_OPTS = { ligatures: true, markVoiceless: true };

/**
 * Turn a phoneme array into runes.
 *
 * Rules applied here:
 *  1. Non-rhotic: /r/ is only written when a vowel follows it.
 *  2. Word-final voiceless marking: ᚠᚠ for a final /f/, ᛋᛋ for a final /s/,
 *     so that leaf/leave and cats/dogs stay distinct.
 *  3. Optional ligatures: /st/ → ᛥ, /kw/ → ᛢ.
 */
export function phonemesToRunes(phonemes, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const ph = phonemes.filter(Boolean);
  let out = '';

  for (let i = 0; i < ph.length; i++) {
    const p = ph[i];
    const next = ph[i + 1];

    // 1. non-rhotic r
    if (p === 'r' && !(next && VOWELS.has(next))) continue;

    // 3. ligatures
    if (o.ligatures && p === 's' && next === 't') { out += 'ᛥ'; i++; continue; }
    if (o.ligatures && p === 'k' && next === 'w') { out += 'ᛢ'; i++; continue; }

    // /ks/ spelt with x in English gets the ᛉ shorthand — handled upstream,
    // where we still know how the word was spelt.

    // 2. voiceless marking at the end of a word
    if (o.markVoiceless && !next && (p === 'f' || p === 's')) {
      out += p === 'f' ? 'ᚠᚠ' : 'ᛋᛋ';
      continue;
    }

    out += P2R[p] ?? '';
  }
  return out;
}

/**
 * Read a runic word back into phonemes.
 *
 * Some detail is genuinely lost — ᚠ is both f and v — so we take the most
 * likely reading: voiceless in the middle of a word, voiced at the end
 * (that being what the ᚠᚠ / ᛋᛋ doubling exists to disambiguate).
 */
export function runesToPhonemes(word) {
  const out = [];
  let i = 0;
  while (i < word.length) {
    let hit = null;
    for (const [seq, p] of R2P) {
      if (word.startsWith(seq, i)) { hit = [seq, p]; break; }
    }
    if (!hit) { i++; continue; }
    let [seq, p] = hit;
    const isFinal = i + seq.length >= word.length;
    if (seq === 'ᚠ') p = isFinal ? 'v' : 'f';
    if (seq === 'ᛋ') p = isFinal ? 'z' : 's';
    if (seq === 'ᚦ') p = 'θ';
    if (p === 'st') out.push('s', 't');
    else if (p === 'kw') out.push('k', 'w');
    else if (p === 'ks') out.push('k', 's');
    else out.push(p);
    i += seq.length;
  }
  return out;
}

/** A readable "sound it out" respelling, e.g. ᚦᛟᛟᛏ → "th-aw-t" */
export function pronounce(word) {
  return runesToPhonemes(word).map((p) => SAY[p] ?? p).join('-');
}
