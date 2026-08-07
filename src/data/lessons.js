// The course: eighteen units, zero knowledge to reading and writing paragraphs.
//
// Runes are introduced in order of usefulness rather than the traditional
// futhorc order, so real words can be read from the very first lesson. The
// reference chart shows the traditional order.
//
// Each unit is built from steps generated in src/components/Lessons.jsx:
//   teach     the new runes, with stroke order and notes
//   drill     recognise the rune, and pick the rune for a sound
//   read      runic word → English (multiple choice, then free typing)
//   write     English word → build it from runes
//   listen    hear a word, write it (uses the browser voice)
//   sentence  read a whole runic sentence
//   passage   a longer piece to read, with the English hidden until you ask
//   review    a mixed round drawing on everything so far

export const UNITS = [
  // ── Part one: the core sounds ─────────────────────────────────────────────
  {
    id: 1,
    part: 'Getting started',
    title: 'Your first six runes',
    subtitle: 'ᛏ ᚾ ᛋ ᛗ ᛁ ᚫ',
    blurb: 'Six runes is enough for real words. Runes spell sounds, not letters.',
    runes: ['ᛏ', 'ᚾ', 'ᛋ', 'ᛗ', 'ᛁ', 'ᚫ'],
    words: ['it', 'sit', 'sat', 'man', 'tin', 'mat', 'mist', 'ant', 'tan', 'in', 'is', 'am', 'as'],
    teach: [
      'A rune stands for a **sound**, not a letter. Write what you hear.',
      'ᛁ is the short i of *sit*. ᚫ is the short a of *hat*.',
      'Say each word slowly and write down the sounds in order. That is the whole method.',
      'Two of these runes are easy to muddle: ᛏ has its arms at the **top**, ᛗ has two full legs.',
    ],
  },
  {
    id: 2,
    part: 'Getting started',
    title: 'Building real words',
    subtitle: 'ᛒ ᛞ ᛚ ᚢ ᛖ',
    blurb: 'Five more, and most short everyday words open up.',
    runes: ['ᛒ', 'ᛞ', 'ᛚ', 'ᚢ', 'ᛖ'],
    words: ['bed', 'bad', 'lid', 'bus', 'mud', 'tell', 'send', 'but', 'and', 'land', 'best',
      'net', 'nut', 'lend', 'melt', 'bend', 'desk', 'dust', 'tent', 'lamp', 'damp'],
    teach: [
      'ᛖ is the short e of *bed*. ᚢ is the u of *fun*.',
      'ᚢ is the busiest rune in the system. Any weak, colourless vowel — the *a* of *about*, the *er* of *butter* — is ᚢ.',
      '*Tell* is ᛏᛖᛚ, not ᛏᛖᛚᛚ. You hear one l, so you write one ᛚ. Doubled letters in English spelling almost never mean a doubled sound.',
    ],
    sentences: ['Tell us.', 'It is a bed.', 'Send it.'],
  },
  {
    id: 3,
    part: 'Getting started',
    title: 'More consonants, and the r rule',
    subtitle: 'ᚻ ᚹ ᚳ ᚱ ᛟ',
    blurb: 'And the first thing that will surprise you.',
    runes: ['ᚻ', 'ᚹ', 'ᚳ', 'ᚱ', 'ᛟ'],
    words: ['hot', 'red', 'win', 'cat', 'rock', 'hand', 'wet', 'not', 'stop', 'dark', 'card',
      'him', 'has', 'had', 'can', 'come', 'want', 'back', 'clock', 'help', 'milk'],
    teach: [
      'ᚳ covers k, hard c and ck. *Cat*, *kite* and *back* all use it.',
      '**The r rule.** In a British accent you only pronounce r before a vowel. *Red* and *very* have an r sound; *car* and *dark* do not — so you do not write ᚱ in them.',
      '*Car* is ᚳᚪ. *Dark* is ᛞᚪᚳ. It looks strange for about ten minutes, then it looks obvious.',
      'A quick test: say the word. If your tongue never makes an r, do not write one.',
    ],
    sentences: ['The cat sat on the mat.', 'It is not hot.', 'He had a red hand.'],
  },
  {
    id: 4,
    part: 'Getting started',
    title: 'Th, f, g, p and ng',
    subtitle: 'ᚦ ᚠ ᚷ ᛈ ᛝ',
    blurb: 'Now you can write "the" — the commonest word in English.',
    runes: ['ᚦ', 'ᚠ', 'ᚷ', 'ᛈ', 'ᛝ'],
    words: ['the', 'this', 'fat', 'gun', 'pen', 'thing', 'long', 'of', 'have', 'ring', 'song',
      'bath', 'that', 'them', 'then', 'give', 'get', 'top', 'gift', 'thin', 'king', 'bring'],
    teach: [
      'ᚦ does both kinds of th — the hard one in *thing* and the soft one in *this*.',
      'ᚠ does both f and v. *Fat* is ᚠᚫᛏ, *have* is ᚻᚫᚠ.',
      'ᛝ is a single sound, the ng of *ring*. One rune, not two. It also does the n in *think* and *thank*.',
      '*The* is ᚦᚢ. Say it out loud unstressed and you will hear the ᚢ.',
    ],
    sentences: ['The pen is on the desk.', 'Give me that thing.', 'This is the best song.'],
    review: true,
  },

  // ── Part two: the vowel system ────────────────────────────────────────────
  {
    id: 5,
    part: 'Vowels',
    title: 'Long vowels: double it',
    subtitle: 'ᛁᛁ ᛖᛖ ᚢᚢ ᛟᛟ ᚣᚣ',
    blurb: 'One rule covers every long vowel in the language.',
    runes: ['ᛁᛁ', 'ᛖᛖ', 'ᚢᚢ', 'ᛟᛟ', 'ᚣ', 'ᚣᚣ'],
    words: ['see', 'feel', 'seed', 'turn', 'bird', 'more', 'law', 'book', 'put', 'food', 'moon',
      'green', 'street', 'burn', 'word', 'work', 'first', 'door', 'four', 'good', 'look', 'blue',
      'hair', 'care', 'there', 'soon', 'full', 'pull'],
    teach: [
      '**Double a vowel rune to make it long.** ᛁ *sit* → ᛁᛁ *seed*. ᚣ *book* → ᚣᚣ *food*. ᛟ *hot* → ᛟᛟ *thought*.',
      'ᚢ *fun* → ᚢᚢ *turn*. ᛖ *bed* → ᛖᛖ *hair*.',
      'This is the one place where doubling means something. Everywhere else, one sound is one rune.',
      'Remember the r rule as you go — *turn* is ᛏᚢᚢᚾ, *more* is ᛗᛟᛟ, *hair* is ᚻᛖᛖ.',
    ],
    sentences: ['I can see the moon.', 'The bird is on the roof.', 'Look at the green door.'],
  },
  {
    id: 6,
    part: 'Vowels',
    title: 'The British ah',
    subtitle: 'ᚪ',
    blurb: 'One rune, and the vowel that most marks out a southern English accent.',
    runes: ['ᚪ'],
    words: ['arm', 'far', 'car', 'dark', 'hard', 'bath', 'path', 'fast', 'last', 'past', 'class',
      'grass', 'glass', 'laugh', 'half', 'ask', 'dance', 'chance', 'plant', 'father', 'after',
      'start', 'part', 'garden', 'answer'],
    teach: [
      'ᚪ is the long *ah* of *arm*. It has no short partner, so it is never doubled.',
      'It covers a set of words a Northern or American speaker says with ᚫ instead: *bath*, *grass*, *laugh*, *dance*, *chance*, *ask*, *past*.',
      'If you say *bath* to rhyme with *math*, use ᚫ instead — the system follows your accent, not a rulebook.',
      'And again: *far* is ᚠᚪ, *hard* is ᚻᚪᛞ. No ᚱ.',
    ],
    sentences: ['The car is in the garden.', 'Ask the last man.', 'It is far and dark.'],
    review: true,
  },
  {
    id: 7,
    part: 'Vowels',
    title: 'Sliding vowels',
    subtitle: 'ᛠ ᛡ ᚩ',
    blurb: 'The vowels that move as you say them.',
    runes: ['ᛠ', 'ᛡ', 'ᚩ'],
    words: ['day', 'make', 'my', 'time', 'go', 'home', 'name', 'take', 'late', 'rain', 'stay',
      'like', 'life', 'night', 'light', 'right', 'nine', 'five', 'no', 'know', 'road', 'boat',
      'old', 'cold', 'snow', 'those', 'hope', 'both'],
    teach: [
      'ᛠ is the *ay* of *day*. ᛡ is the *i* of *time*. ᚩ is the *o* of *go*.',
      'Each of these is one sound, so one rune — even though English spells them all sorts of ways: *day*, *make*, *rain* and *they* all take ᛠ.',
      'Say them slowly and you can hear the vowel move. That sliding is what makes them one unit rather than two.',
    ],
    sentences: ['I go home in the day.', 'My name is on the road.', 'Take the old boat.'],
  },
  {
    id: 8,
    part: 'Vowels',
    title: 'Two-rune vowels',
    subtitle: 'ᚪᚹ ᛟᛁ ᛁᚢ',
    blurb: 'Three vowels that need a pair of runes.',
    runes: ['ᚪᚹ', 'ᛟᛁ', 'ᛁᚢ'],
    words: ['now', 'out', 'how', 'down', 'town', 'house', 'about', 'found', 'sound', 'loud',
      'boy', 'point', 'join', 'noise', 'voice', 'here', 'near', 'year', 'hear', 'beer', 'clear'],
    teach: [
      'ᚪᚹ is *now*, ᛟᛁ is *boy*, ᛁᚢ is *here*.',
      'These make sense once you say them slowly — *now* really does slide from ᚪ towards ᚹ, and *here* from ᛁ towards ᚢ.',
      'ᛁᚢ is where words like *near*, *year* and *beer* end up once the r has gone.',
    ],
    sentences: ['Come down to the house now.', 'I can hear the boy.', 'The town is near here.'],
    review: true,
  },

  // ── Part three: the rest of the alphabet ──────────────────────────────────
  {
    id: 9,
    part: 'Finishing the alphabet',
    title: 'Ch, j and sh',
    subtitle: 'ᚳᚻ ᚷᚻ ᛋᚻ',
    blurb: 'ᚻ is the "add an h" rune.',
    runes: ['ᚳᚻ', 'ᚷᚻ', 'ᛋᚻ'],
    words: ['chair', 'much', 'cheese', 'watch', 'catch', 'child', 'ship', 'fish', 'shop', 'she',
      'wash', 'shall', 'jump', 'jog', 'judge', 'large', 'change', 'age', 'bridge', 'measure'],
    teach: [
      'ᚳᚻ = ch, ᚷᚻ = j, ᛋᚻ = sh. In each case it is the plain consonant plus ᚻ.',
      'ᚷᚻ also does the soft g of *age*, *large* and *bridge* — the sound is the same as j, so the spelling is.',
      'ᛋᚻ doubles up for the middle of *measure* and *usual*, which is the same sound with the voice on.',
    ],
    sentences: ['She sat on the chair.', 'Much has changed.', 'The fish is large.'],
  },
  {
    id: 10,
    part: 'Finishing the alphabet',
    title: 'Y and x',
    subtitle: 'ᛄ ᛉ',
    blurb: 'The last two everyday runes.',
    runes: ['ᛄ', 'ᛉ'],
    words: ['yes', 'you', 'year', 'young', 'yellow', 'beyond', 'box', 'six', 'tax', 'fox', 'mix',
      'next', 'expect'],
    teach: [
      'ᛄ is the consonant y of *yes* and *you*. The vowel y at the end of *happy* is just ᛁ.',
      'ᛉ is a shortcut for the ks in *box*. Only use it where English spells an x — *racks* is ᚱᚫᚳᛋ, not ᚱᚫᛉ.',
      'That distinction is a courtesy to the reader, not a sound difference. Both are pronounced the same.',
    ],
    sentences: ['Yes, you can have the box.', 'Six young men.', 'Next year.'],
    review: true,
  },

  // ── Part four: the finishing rules ────────────────────────────────────────
  {
    id: 11,
    part: 'The finishing rules',
    title: 'Voiced or voiceless?',
    subtitle: 'ᚠᚠ and ᛋᛋ',
    blurb: 'How to tell leaf from leave.',
    runes: [],
    words: ['leaf', 'leave', 'off', 'of', 'cats', 'dogs', 'ice', 'eyes', 'life', 'live', 'safe',
      'save', 'price', 'prize', 'peace', 'peas', 'half', 'have'],
    teach: [
      'ᚠ is both f and v; ᛋ is both s and z. In the middle of a word, context sorts it out.',
      '**At the end of a word, double it if the sound is voiceless.** *Leaf* is ᛚᛁᛁᚠᚠ but *leave* is ᛚᛁᛁᚠ. *Cats* is ᚳᚫᛏᛋᛋ but *dogs* is ᛞᛟᚷᛋ.',
      'Put a finger on your throat and say "sss" then "zzz". The buzz is voicing. No buzz, double the rune.',
      'This falls out neatly for plurals: after t, k, p and f you get s (so double); after everything else you get z (so single).',
    ],
    sentences: ['The cats have gone off.', 'I can see his eyes.', 'Leave the leaf.'],
  },
  {
    id: 12,
    part: 'The finishing rules',
    title: 'Weak syllables',
    subtitle: 'Everything collapses to ᚢ',
    blurb: 'What happens to the parts of a word you do not stress.',
    runes: [],
    words: ['about', 'above', 'again', 'butter', 'water', 'better', 'father', 'mother', 'winter',
      'summer', 'comma', 'little', 'bottle', 'middle', 'apple', 'table', 'garden', 'open',
      'seven', 'happen', 'children', 'other', 'over', 'under', 'never', 'ever'],
    teach: [
      'English hurries over unstressed syllables, and the vowel in them collapses to a vague ᚢ.',
      '*Butter* is ᛒᚢᛏᚢ. *Comma* is ᚳᛟᛗᚢ. *About* is ᚢᛒᚪᚹᛏ. Whatever the spelling suggests, you say ᚢ.',
      '**Syllabic l and n.** *Little* is ᛚᛁᛏᚢᛚ and *bottle* is ᛒᛟᛏᚢᛚ — put ᚢ in where you hear a faint vowel before the l.',
      'This is the rule that makes runic spelling look most unlike English. Trust your ear.',
    ],
    sentences: ['My mother is in the garden.', 'The water is better now.', 'Open the little bottle.'],
    review: true,
  },
  {
    id: 13,
    part: 'The finishing rules',
    title: 'Ligatures and layout',
    subtitle: 'ᛥ ᛢ ᛫',
    blurb: 'The last two runes, and how to set out a line of text.',
    runes: ['ᛥ', 'ᛢ'],
    words: ['stone', 'best', 'fast', 'first', 'stop', 'star', 'queen', 'quick', 'question',
      'quiet', 'quite'],
    teach: [
      'ᛥ is ᛋ+ᛏ joined up, and ᛢ is ᚳ+ᚹ joined up. Both are optional — *stone* is ᛥᚩᚾ or ᛋᛏᚩᚾ, whichever you prefer.',
      'Words are traditionally separated by an interpunct ᛫ rather than a space: ᛏᚣᚣ᛫ᛒᛁᛁ᛫ᛟᛟ᛫ᚾᛟᛏ᛫ᛏᚣᚣ᛫ᛒᛁᛁ.',
      'Commas, full stops and apostrophes work exactly as they do in English. ⁊ is an optional shorthand for *and*.',
      'You can switch the ligatures off in Settings if you would rather write everything out.',
    ],
    sentences: ['That is a quick question.', 'The best stone is first.', 'Be quiet and stop.'],
  },

  // ── Part five: actually reading ───────────────────────────────────────────
  {
    id: 14,
    part: 'Reading',
    title: 'Reading without help',
    subtitle: 'Short sentences',
    blurb: 'No multiple choice. Read it, type what it says.',
    runes: [],
    words: [],
    freeRead: [
      'The dog is in the garden.',
      'I have a small house near the river.',
      'She went to the shop for bread and milk.',
      'My brother works in the town.',
      'The old man sat by the fire.',
      'We can go home now.',
      'There is a bird on the roof.',
      'He gave me the book last night.',
    ],
    teach: [
      'Read the runes aloud before you try to work out the word. Sounding it out is the whole skill.',
      'If a word looks odd, it is almost always the r rule or a doubled vowel.',
      'Spelling does not have to be perfect — you are being marked on whether you read it right.',
    ],
  },
  {
    id: 15,
    part: 'Reading',
    title: 'Writing without help',
    subtitle: 'Your turn',
    blurb: 'English in, runes out — from memory.',
    runes: [],
    words: [],
    freeWrite: [
      'the cat', 'a red door', 'my father', 'six green birds', 'the house is dark',
      'she can see the moon', 'we went to the town', 'it is quite cold now',
      'the boy has a big box', 'I like this book',
    ],
    teach: [
      'Say the phrase out loud first, then write the sounds you hear.',
      'Check yourself against three things: is every r you wrote actually pronounced? Are the long vowels doubled? Have any silent letters crept in?',
    ],
    review: true,
  },
  {
    id: 16,
    part: 'Reading',
    title: 'A longer passage',
    subtitle: 'Reading at length',
    blurb: 'Several sentences at a time, with the English hidden until you want it.',
    runes: [],
    words: [],
    passages: [
      {
        title: 'A morning',
        english: 'It was cold when I went out. The sun was low and the grass was wet. ' +
          'I walked down the path to the river and sat on a stone for a long time. ' +
          'A bird came near, looked at me, and went again.',
      },
      {
        title: 'The house',
        english: 'My grandmother had a small house at the end of the road. ' +
          'There was a green door and a garden with apple trees. ' +
          'In the summer we would sit outside and she would tell us about the old days.',
      },
    ],
    teach: [
      'Take it a line at a time. Read aloud, then check.',
      'You will find you stop decoding rune by rune and start recognising whole words. That is the point at which this becomes reading.',
    ],
  },
  {
    id: 17,
    part: 'Reading',
    title: 'Real writing',
    subtitle: 'Poetry and prose',
    blurb: 'Text written by people who were not thinking about runes.',
    runes: [],
    words: [],
    passages: [
      {
        title: 'Shakespeare, Hamlet',
        english: 'To be, or not to be, that is the question: ' +
          'whether it is nobler in the mind to suffer ' +
          'the slings and arrows of outrageous fortune, ' +
          'or to take arms against a sea of troubles.',
      },
      {
        title: 'Emma Lazarus, The New Colossus',
        english: 'Give me your tired, your poor, ' +
          'your huddled masses yearning to breathe free, ' +
          'the wretched refuse of your teeming shore.',
      },
      {
        title: 'The opening of Beowulf, in modern English',
        english: 'Listen. We have heard of the glory of the kings of the Danes in the old days, ' +
          'and how those princes did brave deeds.',
      },
    ],
    teach: [
      'Longer words and older wording, but exactly the same system.',
      'Notice how much shorter runic spelling often is — *thought* is four runes, *through* is four.',
    ],
  },
  {
    id: 18,
    part: 'Reading',
    title: 'Everything at once',
    subtitle: 'The final round',
    blurb: 'A mixed test drawing on all thirty runes and every rule.',
    runes: [],
    words: [],
    finalReview: true,
    teach: [
      'This pulls from everything you have done. If something has slipped, the Practice tab will keep bringing it back.',
      'After this, the most useful thing you can do is write something of your own — a note, a list, a diary line a day.',
    ],
  },
  {
    id: 19,
    part: 'Special Topics',
    title: 'Counting in Futhorc',
    subtitle: 'ᚪᚾ ᛏᚹᚪ ᚦᚱᛁᛖ ᚠᛖᚩᚹᛖᚱ',
    blurb: 'Learn how to read and write Anglo-Saxon spelled numbers 1 to 10 in runes.',
    runes: ['ᚪᚾ', 'ᛏᚹᚪ', 'ᚦᚱᛁᛖ', 'ᚠᛖᚩᚹᛖᚱ', 'ᚠᛁᚠ', 'ᛋᛁᚳᛋ', 'ᛋᛖᚩᚠᚩᚾ', 'ᛠᚻᛏᚪ', 'ᚾᛁᚷᚩᚾ', 'ᛏᛁᛖᚾ'],
    words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
    freeRead: [
      'one bird sat on a tree',
      'i have two eyes and two hands',
      'three green apples on the table',
      'four cold days in winter',
      'five red roses in the garden',
    ],
    freeWrite: [
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'
    ],
    teach: [
      'Anglo-Saxons wrote numbers as spelled phonetic words rather than modern digits.',
      '1 is *ān* (ᚪᚾ), 2 is *twā* (ᛏᚹᚪ), 3 is *þrīe* (ᚦᚱᛁᛖ), 4 is *feōwer* (ᚠᛖᚩᚹᛖᚱ), and 5 is *fīf* (ᚠᛁᚠ).',
      '6 is *six* (ᛋᛁᚳᛋ), 7 is *seofon* (ᛋᛖᚩᚠᚩᚾ), 8 is *eahta* (ᛠᚻᛏᚪ), 9 is *nigon* (ᚾᛁᚷᚩᚾ), and 10 is *tīen* (ᛏᛁᛖᚾ).',
      'When you enter numbers (like 42 or 1995), the app automatically spells them out using these historical Old English rules.',
    ],
  },
];

export const PARTS = [...new Set(UNITS.map((u) => u.part))];

/** Every rune taught up to and including the given unit. */
export function runesThrough(unitId) {
  const set = new Set();
  for (const u of UNITS) {
    if (u.id > unitId) break;
    for (const r of u.runes) for (const ch of r) set.add(ch);
  }
  return set;
}

/** Every word available for practice up to and including the given unit. */
export function wordsThrough(unitId) {
  const out = [];
  for (const u of UNITS) {
    if (u.id > unitId) break;
    out.push(...(u.words || []));
  }
  return [...new Set(out)];
}

/** Every sentence available up to and including the given unit. */
export function sentencesThrough(unitId) {
  const out = [];
  for (const u of UNITS) {
    if (u.id > unitId) break;
    out.push(...(u.sentences || []), ...(u.freeRead || []));
  }
  return [...new Set(out)];
}
