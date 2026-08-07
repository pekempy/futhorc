// The rune inventory, adapted to British Received Pronunciation.
//
// Based on Harys Dalvi's Futhorc system (harysdalvi.com/futhorc), with the
// vowels re-mapped for a non-rhotic British accent. See src/data/system.js
// for a description of what changed and why.

export const SEP = '᛫'; // ᛫ interpunct - the traditional word separator

/**
 * kind:  'consonant' | 'vowel' | 'ligature'
 * name:  the mnemonic name, in English
 * runic: that name written in runes
 * ipa:   the sound(s) it stands for
 * gloss: plain-English description of the sound
 * eg:    example words, with the relevant part in {braces}
 */
export const RUNES = [
  // ── Consonants ────────────────────────────────────────────────────────────
  { r: 'ᚠ', kind: 'consonant', name: 'Fee',   runic: 'ᚠᛁᛁ',   ipa: ['f', 'v'], gloss: 'f as in fear, and v as in vine',
    eg: ['{f}ear', '{v}ine', 'lea{f}'], note: 'One rune covers both f and v. At the end of a word, write ᚠᚠ if the sound is f: leaf ᛚᛁᛁᚠᚠ, leave ᛚᛁᛁᚠ.' },
  { r: 'ᚦ', kind: 'consonant', name: 'Thorn', runic: 'ᚦᛟᛟᚾ', ipa: ['θ', 'ð'], gloss: 'th, both kinds',
    eg: ['{th}ing', '{th}is', 'ba{th}'], note: 'The hard th of “thing” and the soft th of “this” share one rune.' },
  { r: 'ᚱ', kind: 'consonant', name: 'Ride',  runic: 'ᚱᛡᛞ',  ipa: ['r'], gloss: 'r as in rain',
    eg: ['{r}ain', 'b{r}ing', 've{r}y'], note: 'Only written when an r sound is actually pronounced. In British English that means before a vowel: car is ᚳᚪ, but carry is ᚳᚫᚱᛁ.' },
  { r: 'ᚳ', kind: 'consonant', name: 'Car',   runic: 'ᚳᚪ',   ipa: ['k'], gloss: 'k as in kite',
    eg: ['{k}ite', '{c}at', 'ba{ck}'], note: 'Covers k, hard c and ck. Its own name shows the r-dropping rule: “car” is ᚳᚪ.' },
  { r: 'ᚷ', kind: 'consonant', name: 'Gift',  runic: 'ᚷᛁᚠᛏ', ipa: ['g'], gloss: 'hard g as in game',
    eg: ['{g}ame', '{g}ive', 'ba{g}'], note: 'Only the hard g. The soft g of “gem” is ᚷᚻ.' },
  { r: 'ᚹ', kind: 'consonant', name: 'Win',   runic: 'ᚹᛁᚾ',  ipa: ['w'], gloss: 'w as in wind',
    eg: ['{w}ind', 's{w}im', '{wh}en'] },
  { r: 'ᚻ', kind: 'consonant', name: 'Hail',  runic: 'ᚻᛠᛚ',  ipa: ['h'], gloss: 'h as in hole',
    eg: ['{h}ole', '{h}and', 'be{h}ind'], note: 'Also does duty as the second half of ᚳᚻ, ᚷᚻ and ᛋᚻ.' },
  { r: 'ᚾ', kind: 'consonant', name: 'Need',  runic: 'ᚾᛁᛁᛞ', ipa: ['n'], gloss: 'n as in now',
    eg: ['{n}ow', 'ru{n}', 'ha{nd}'] },
  { r: 'ᛄ', kind: 'consonant', name: 'Year',  runic: 'ᛄᛁᚢ',  ipa: ['j'], gloss: 'y as in you',
    eg: ['{y}ou', '{y}es', 'be{y}ond'], note: 'Only the consonant y. The vowel y of “happy” is ᛁ.' },
  { r: 'ᛈ', kind: 'consonant', name: 'Page',  runic: 'ᛈᛠᚷᚻ', ipa: ['p'], gloss: 'p as in pot',
    eg: ['{p}ot', 's{p}in', 'to{p}'] },
  { r: 'ᛉ', kind: 'consonant', name: 'Box',   runic: 'ᛒᛟᛉ',  ipa: ['ks'], gloss: 'x as in box',
    eg: ['bo{x}', 'ta{x}', 'si{x}'], note: 'Shorthand for the two sounds k+s. Only used where English spells it x - “racks” is ᚱᚫᚳᛋ, not ᚱᚫᛉ.' },
  { r: 'ᛋ', kind: 'consonant', name: 'Sun',   runic: 'ᛋᚢᚾ',  ipa: ['s', 'z'], gloss: 's as in see, and z as in zebra',
    eg: ['{s}ee', '{z}ebra', 'dog{s}'], note: 'At the end of a word, write ᛋᛋ if the sound is s: cats ᚳᚫᛏᛋᛋ, dogs ᛞᛟᚷᛋ.' },
  { r: 'ᛏ', kind: 'consonant', name: 'Town',  runic: 'ᛏᚪᚹᚾ', ipa: ['t'], gloss: 't as in time',
    eg: ['{t}ime', 's{t}op', 'ca{t}'] },
  { r: 'ᛒ', kind: 'consonant', name: 'Birch', runic: 'ᛒᚢᚢᚳᚻ', ipa: ['b'], gloss: 'b as in boy',
    eg: ['{b}oy', 'a{b}out', 'ru{b}'] },
  { r: 'ᛗ', kind: 'consonant', name: 'Moon',  runic: 'ᛗᚣᚣᚾ', ipa: ['m'], gloss: 'm as in mouth',
    eg: ['{m}outh', 'ca{m}e', 'ti{m}e'] },
  { r: 'ᛚ', kind: 'consonant', name: 'Lake',  runic: 'ᛚᛠᚳ',  ipa: ['l'], gloss: 'l as in line',
    eg: ['{l}ine', 'he{ll}o', 'fa{ll}'] },
  { r: 'ᛝ', kind: 'consonant', name: 'Wing',  runic: 'ᚹᛁᛝ',  ipa: ['ŋ'], gloss: 'ng as in ring',
    eg: ['ri{ng}', 'lo{ng}', 'thi{n}k'], note: 'One sound, not two. Also used for the n in “think” and “thank”.' },
  { r: 'ᛞ', kind: 'consonant', name: 'Day',   runic: 'ᛞᛠ',   ipa: ['d'], gloss: 'd as in dog',
    eg: ['{d}og', 'ma{d}e', 'ha{d}'] },

  // ── Short vowels ──────────────────────────────────────────────────────────
  { r: 'ᛁ', kind: 'vowel', name: 'Inn',  runic: 'ᛁᚾ',  ipa: ['ɪ'], gloss: 'short i as in sit',
    eg: ['s{i}t', 'b{i}g', 'happ{y}'], length: 'short', longPair: 'ᛁᛁ' },
  { r: 'ᛖ', kind: 'vowel', name: 'Egg',  runic: 'ᛖᚷ',  ipa: ['e'], gloss: 'short e as in send',
    eg: ['s{e}nd', 'b{e}d', 'h{ea}d'], length: 'short', longPair: 'ᛖᛖ' },
  { r: 'ᚫ', kind: 'vowel', name: 'Ash',  runic: 'ᚫᛋᚻ', ipa: ['æ'], gloss: 'short a as in hat',
    eg: ['h{a}t', 'c{a}t', 'b{a}ck'], length: 'short' },
  { r: 'ᚢ', kind: 'vowel', name: 'Up',   runic: 'ᚢᛈ',  ipa: ['ʌ', 'ə'], gloss: 'the u of fun, and the vague vowel of about',
    eg: ['f{u}n', '{a}bout', 'suff{er}'], length: 'short', longPair: 'ᚢᚢ',
    note: 'The workhorse vowel. Any unstressed, colourless vowel is ᚢ.' },
  { r: 'ᛟ', kind: 'vowel', name: 'Ox',   runic: 'ᛟᛉ',  ipa: ['ɒ'], gloss: 'short o as in hot',
    eg: ['h{o}t', 'st{o}p', 'w{a}sh'], length: 'short', longPair: 'ᛟᛟ' },
  { r: 'ᚣ', kind: 'vowel', name: 'Book', runic: 'ᛒᚣᚳ', ipa: ['ʊ'], gloss: 'short oo as in book',
    eg: ['b{oo}k', 'p{u}t', 'c{ou}ld'], length: 'short', longPair: 'ᚣᚣ' },

  // ── Long vowels and diphthongs ────────────────────────────────────────────
  { r: 'ᚪ', kind: 'vowel', name: 'Arm',  runic: 'ᚪᛗ',  ipa: ['ɑː'], gloss: 'long ah as in arm, bath, father',
    eg: ['{ar}m', 'b{a}th', 'f{a}st'], length: 'long',
    note: 'The British “ah”. It covers the bath / grass / laugh words that a Northern or American accent says with ᚫ.' },
  { r: 'ᛠ', kind: 'vowel', name: 'Eight', runic: 'ᛠᛏ', ipa: ['eɪ'], gloss: 'the ay of day',
    eg: ['d{ay}', 'm{a}k{e}', 'r{ai}n'], length: 'long' },
  { r: 'ᛡ', kind: 'vowel', name: 'Eye',  runic: 'ᛡ',   ipa: ['aɪ'], gloss: 'the i of time',
    eg: ['t{i}m{e}', 'm{y}', 'l{ie}'], length: 'long' },
  { r: 'ᚩ', kind: 'vowel', name: 'Oak',  runic: 'ᚩᚳ',  ipa: ['əʊ'], gloss: 'the o of go',
    eg: ['g{o}', 'h{o}m{e}', 'sn{ow}'], length: 'long' },

  // ── Ligatures ─────────────────────────────────────────────────────────────
  { r: 'ᛥ', kind: 'ligature', name: 'Stone', runic: 'ᛥᚩᚾ', ipa: ['st'], gloss: 'st, written as one rune',
    eg: ['{st}one', 'be{st}', 'fa{st}'], note: 'Optional. ᛥᚩᚾ and ᛋᛏᚩᚾ are both correct.' },
  { r: 'ᛢ', kind: 'ligature', name: 'Queen', runic: 'ᛢᛁᛁᚾ', ipa: ['kw'], gloss: 'qu, written as one rune',
    eg: ['{qu}een', '{qu}ick'], note: 'Optional. ᛢᛁᛁᚾ and ᚳᚹᛁᛁᚾ are both correct.' },
];

export const RUNE_BY_CHAR = Object.fromEntries(RUNES.map((x) => [x.r, x]));

/** The traditional futhorc order - the order the alphabet is recited in. */
export const FUTHORC_ORDER = 'ᚠᚢᚦᚩᚱᚳᚷᚹᚻᚾᛁᛄᛈᛉᛋᛏᛒᛖᛗᛚᛝᛟᛞᚪᚫᛠᛡᚣᛥᛢ'.split('');

/** Multi-rune spellings that behave as a single sound. */
export const DIGRAPHS = [
  { d: 'ᛁᛁ', kind: 'vowel', ipa: 'iː', gloss: 'long ee as in see',       eg: ['s{ee}', 'f{ee}l', 'm{e}'] },
  { d: 'ᛖᛖ', kind: 'vowel', ipa: 'ɛː', gloss: 'the air of hair',          eg: ['h{air}', 'th{ere}', 'c{are}'] },
  { d: 'ᚢᚢ', kind: 'vowel', ipa: 'ɜː', gloss: 'the ur of turn',           eg: ['t{ur}n', 'b{ir}d', 'w{or}d'] },
  { d: 'ᛟᛟ', kind: 'vowel', ipa: 'ɔː', gloss: 'the aw of thought',        eg: ['th{ough}t', 'l{aw}', 'm{ore}'] },
  { d: 'ᚣᚣ', kind: 'vowel', ipa: 'uː', gloss: 'long oo as in food',       eg: ['f{oo}d', 'bl{ue}', 'm{oo}n'] },
  { d: 'ᚪᚹ', kind: 'vowel', ipa: 'aʊ', gloss: 'the ow of now',            eg: ['n{ow}', 'h{ou}se', '{ou}t'] },
  { d: 'ᛟᛁ', kind: 'vowel', ipa: 'ɔɪ', gloss: 'the oy of boy',            eg: ['b{oy}', 'p{oi}nt', 'j{oi}n'] },
  { d: 'ᛁᚢ', kind: 'vowel', ipa: 'ɪə', gloss: 'the ear of near',          eg: ['n{ear}', 'h{ere}', 'y{ear}'] },
  { d: 'ᚳᚻ', kind: 'consonant', ipa: 'tʃ', gloss: 'ch as in cheese',      eg: ['{ch}eese', 'mu{ch}', 'wa{tch}'] },
  { d: 'ᚷᚻ', kind: 'consonant', ipa: 'dʒ', gloss: 'j as in jog, g as in gem', eg: ['{j}og', '{g}em', 'brid{ge}'] },
  { d: 'ᛋᚻ', kind: 'consonant', ipa: 'ʃ, ʒ', gloss: 'sh as in share, and the s of measure', eg: ['{sh}are', 'fi{sh}', 'mea{s}ure'] },
];

export const DIGRAPH_BY_STR = Object.fromEntries(DIGRAPHS.map((x) => [x.d, x]));

export const PUNCTUATION = [
  { r: '᛫', name: 'Interpunct', gloss: 'separates words', eg: 'ᛏᚣᚣ᛫ᛒᛁ' },
  { r: '᛬', name: 'Double punct', gloss: 'a heavier break, like a comma' },
  { r: '᛭', name: 'Cross punct', gloss: 'a full stop or section break' },
  { r: '⁊', name: 'Tironian et', gloss: 'the word “and”' },
];
