/**
 * Anglo-Saxon Futhorc Number Transliteration Engine
 * Converts numbers (0-99999) into historically accurate spelled-out Old English & Futhorc runes.
 */

import { transliterateWord } from './transliterate.js';

const OE_UNITS = [
  { val: 0, oe: 'nōht', runes: 'ᚾᚩᚻᛏ' },
  { val: 1, oe: 'ān', runes: 'ᚪᚾ' },
  { val: 2, oe: 'twā', runes: 'ᛏᚹᚪ' },
  { val: 3, oe: 'þrīe', runes: 'ᚦᚱᛁᛖ' },
  { val: 4, oe: 'feōwer', runes: 'ᚠᛖᚩᚹᛖᚱ' },
  { val: 5, oe: 'fīf', runes: 'ᚠᛁᚠ' },
  { val: 6, oe: 'six', runes: 'ᛋᛁᚳᛋ' },
  { val: 7, oe: 'seofon', runes: 'ᛋᛖᚩᚠᚩᚾ' },
  { val: 8, oe: 'eahta', runes: 'ᛠᚻᛏᚪ' },
  { val: 9, oe: 'nigon', runes: 'ᚾᛁᚷᚩᚾ' },
  { val: 10, oe: 'tīen', runes: 'ᛏᛁᛖᚾ' },
  { val: 11, oe: 'endleofan', runes: 'ᛖᚾᛞᛚᛖᚩᚠᚪᚾ' },
  { val: 12, oe: 'twelf', runes: 'ᛏᚹᛖᛚᚠ' },
  { val: 13, oe: 'þrēotīene', runes: 'ᚦᚱᛖᚩᛏᛁᛖᚾᛖ' },
  { val: 14, oe: 'feōwertīene', runes: 'ᚠᛖᚩᚹᛖᚱᛏᛁᛖᚾᛖ' },
  { val: 15, oe: 'fīftīene', runes: 'ᚠᛁᚠᛏᛁᛖᚾᛖ' },
  { val: 16, oe: 'sixtīene', runes: 'ᛋᛁᚳᛋᛏᛁᛖᚾᛖ' },
  { val: 17, oe: 'seofontīene', runes: 'ᛋᛖᚩᚠᚩᚾᛏᛁᛖᚾᛖ' },
  { val: 18, oe: 'eahtatīene', runes: 'ᛠᚻᛏᚪᛏᛁᛖᚾᛖ' },
  { val: 19, oe: 'nigontīene', runes: 'ᚾᛁᚷᚩᚾᛏᛁᛖᚾᛖ' },
];

const OE_TENS = {
  20: { oe: 'twentig', runes: 'ᛏᚹᛖᚾᛏᛁᚷ' },
  30: { oe: 'þrītig', runes: 'ᚦᚱᛁᛏᛁᚷ' },
  40: { oe: 'feōwertig', runes: 'ᚠᛖᚩᚹᛖᚱᛏᛁᚷ' },
  50: { oe: 'fīftig', runes: 'ᚠᛁᚠᛏᛁᚷ' },
  60: { oe: 'sixtig', runes: 'ᛋᛁᚳᛋᛏᛁᚷ' },
  70: { oe: 'seofontig', runes: 'ᛋᛖᚩᚠᚩᚾᛏᛁᚷ' },
  80: { oe: 'eahtatig', runes: 'ᛠᚻᛏᚪᛏᛁᚷ' },
  90: { oe: 'nigontig', runes: 'ᚾᛁᚷᚩᚾᛏᛁᚷ' },
};

export const NUMBER_REFERENCE_TABLE = [
  ...OE_UNITS,
  { val: 20, oe: 'twentig', runes: 'ᛏᚹᛖᚾᛏᛁᚷ' },
  { val: 30, oe: 'þrītig', runes: 'ᚦᚱᛁᛏᛁᚷ' },
  { val: 40, oe: 'feōwertig', runes: 'ᚠᛖᚩᚹᛖᚱᛏᛁᚷ' },
  { val: 50, oe: 'fīftig', runes: 'ᚠᛁᚠᛏᛁᚷ' },
  { val: 100, oe: 'hund', runes: 'ᚻᚢᚾᛞ' },
  { val: 1000, oe: 'þūsend', runes: 'ᚦᚢᛋᛖᚾᛞ' },
];

/**
 * Spells out an integer (0 - 9999) in Old English words and Futhorc runes.
 */
export function numberToOldEnglish(n) {
  const num = Math.floor(Math.abs(Number(n)));
  if (isNaN(num)) return { text: String(n), runes: String(n) };

  if (num <= 19) {
    const entry = OE_UNITS[num];
    return { text: entry.oe, runes: entry.runes };
  }

  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const units = num % 10;
    const tensEntry = OE_TENS[tens];
    if (units === 0) {
      return { text: tensEntry.oe, runes: tensEntry.runes };
    }
    const unitEntry = OE_UNITS[units];
    // In Old English: "ān and twentig" (one and twenty)
    return {
      text: `${unitEntry.oe} and ${tensEntry.oe}`,
      runes: `${unitEntry.runes}᛫ᚪᚾᛞ᛫${tensEntry.runes}`,
    };
  }

  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hEntry = OE_UNITS[hundreds];
    const hText = hundreds === 1 ? 'hund' : `${hEntry.oe} hund`;
    const hRunes = hundreds === 1 ? 'ᚻᚢᚾᛞ' : `${hEntry.runes}᛫ᚻᚢᚾᛞ`;

    if (remainder === 0) return { text: hText, runes: hRunes };
    const remResult = numberToOldEnglish(remainder);
    return {
      text: `${hText} and ${remResult.text}`,
      runes: `${hRunes}᛫ᚪᚾᛞ᛫${remResult.runes}`,
    };
  }

  if (num <= 9999) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    const tEntry = OE_UNITS[thousands];
    const tText = thousands === 1 ? 'þūsend' : `${tEntry.oe} þūsend`;
    const tRunes = thousands === 1 ? 'ᚦᚢᛋᛖᚾᛞ' : `${tEntry.runes}᛫ᚦᚢᛋᛖᚾᛞ`;

    if (remainder === 0) return { text: tText, runes: tRunes };
    const remResult = numberToOldEnglish(remainder);
    return {
      text: `${tText} ${remResult.text}`,
      runes: `${tRunes}᛫${remResult.runes}`,
    };
  }

  return { text: String(n), runes: String(n) };
}

/**
 * Replaces any standalone digits (e.g. "42", "1995") in input text with spelled-out Futhorc runes.
 */
export function transliterateNumbersInText(text, options = {}) {
  if (!text) return '';
  return text.replace(/\b\d+\b/g, (match) => {
    const res = numberToOldEnglish(Number(match));
    return res.runes;
  });
}
