# ᚠᚢᚦᚩᚱᚳ Futhorc

A beginner's course in reading and writing modern English with Anglo-Saxon runes,
adapted to a **British** (non-rhotic, RP) accent.

Eighteen units take you from knowing nothing to reading whole passages, with a
rune reference, a spaced-repetition practice mode, a live English↔runes converter,
text-to-speech, and four printable sheets.

The name is an acrostic: ᚠᚢᚦᚩᚱᚳ is simply the first six runes — Fee, Up, Thorn,
Oak, Ride, Car — in the same way *alphabet* comes from alpha and beta.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/ and a standalone futhorc.html
```

`npm run build` also produces **`futhorc.html`** — the whole app in one
self-contained file (CSS, JS and the rune font all inlined). Double-click it;
no server needed.

## What's in it

| | |
|---|---|
| **Learn** | Eighteen units in five parts. Each teaches a few runes with animated stroke order, then drills them: recognise the rune, pick it from a sound, read a word with and without multiple choice, build a word from a rune keyboard, write a word from hearing it spoken, read whole sentences, and — later on — read passages unaided. Runes are introduced in order of usefulness, so you read real words from Unit 1. Every fourth unit throws in a review round. |
| **Runes** | All thirty, in the traditional futhorc order or grouped by sound. Tap one for its name, sound, examples and an animated stroke-order diagram. |
| **Practice** | Twelve-question rounds weighted towards whatever you keep getting wrong (a Leitner-style box system). |
| **Write** | Type English, get runes. Or paste runes and get them sounded out rune by rune. |
| **Print** | Stroke-order guide, wall chart, cut-out flashcards, worksheets with an answer key. |

Progress and settings live in `localStorage` — nothing leaves the browser.

## The writing system

Based on [Harys Dalvi's futhorc](https://www.harysdalvi.com/futhorc)
([source](https://github.com/crackalamoo/futhorc)), which maps Anglo-Saxon runes onto
*American* English. The consonants are unchanged; the vowels are re-mapped for
British RP.

### Three rules carry most of it

**1. Spell what you hear.** Runes are phonetic. Silent letters vanish and doubled
letters collapse: *laugh* → ᛚᚪᚠᚠ, *through* → ᚦᚱᚣᚣ, *tell* → ᛏᛖᛚ, *knee* → ᚾᛁᛁ.

**2. Double a vowel to lengthen it.**

| Short | | Long | |
|---|---|---|---|
| ᛁ | s**i**t | ᛁᛁ | s**ee**d |
| ᛖ | b**e**d | ᛖᛖ | h**air** |
| ᚢ | f**u**n | ᚢᚢ | t**ur**n |
| ᛟ | h**o**t | ᛟᛟ | th**ough**t |
| ᚣ | b**oo**k | ᚣᚣ | f**oo**d |
| ᚫ | h**a**t | ᚪ | **ar**m, b**a**th — no short partner |

**3. Only write ᚱ when you say it.** British English is non-rhotic, so ᚱ appears
only before a vowel: *car* → ᚳᚪ but *carry* → ᚳᚫᚱᛁ; *north* → ᚾᛟᛟᚦ; *here* → ᚻᛁᚢ.

Plus one tidy-up: ᚠ is both f and v, and ᛋ is both s and z, so at the **end** of a
word they're doubled when voiceless — *leaf* ᛚᛁᛁᚠᚠ vs *leave* ᛚᛁᛁᚠ, *cats* ᚳᚫᛏᛋᛋ vs
*dogs* ᛞᛟᚷᛋ.

### What changed from the American original

| | American | British |
|---|---|---|
| *bath, fast, laugh* | ᚫ | **ᚪ** — the TRAP–BATH split |
| *car, turn, north* | ᚳᚪᚱ, ᛏᚢᚱᚾ, ᚾᛟᚱᚦ | **ᚳᚪ, ᛏᚢᚢᚾ, ᚾᛟᛟᚦ** — no coda r |
| *cot* vs *caught* | both ᛟ | **ᛟ** vs **ᛟᛟ** |
| *pull* vs *pool* | both ᚣ | **ᚣ** vs **ᚣᚣ** |
| *hair* | ᛠ (= *day*) | **ᛖᛖ**, keeping ᛠ for *day* |
| ᛠ, ᚪ, ᚣ names | Air, Owl, Tooth | **Eight, Arm, Book** — the old names no longer match their RP values |

The two systems remain compatible for consonants, and most short-vowel words are
identical.

## How it's put together

```
src/
  data/
    runes.js      the thirty runes: names, sounds, examples, notes
    glyphs.js     GENERATED — outlines and stroke skeletons (see below)
    lessons.js    the eighteen-unit curriculum
    lexicon.js    ~750 hand-checked RP pronunciations
  lib/
    phonology.js  phonemes ↔ runes, and the spelling rules
    g2p.js        letters → sounds, for words outside the dictionary
    transliterate.js
    speech.js     text-to-speech
    progress.js   localStorage
  components/     the app views
  print/          the four printable sheets
scripts/
  genglyphs.py    derives glyphs.js from the Noto Sans Runic font
  ssr-check.jsx   renders every view to static HTML to catch crashes
  render-sheets.py  renders the print sheets to PDF without a browser
```

### The stroke diagrams

They aren't hand-drawn. `scripts/genglyphs.py` reads the Noto Sans Runic outlines
and works out the path a pen would take:

1. Every rune is built from bars of uniform width, so the outline contains pairs of
   antiparallel edges one stroke-width apart. The midline between each pair is a
   stroke centreline. Where a bar is curved — Noto rounds ᚠ, ᚢ and ᚦ — the midline
   is built by averaging the two bounding curves sample for sample, so it follows
   the arc instead of cutting across its chord.
2. Candidates whose midpoint falls outside the glyph are discarded (the gap between
   two parallel arms looks like a bar to the pairing test), as are any that aren't
   one stroke-width across all along.
3. Collinear fragments are rejoined — a stave interrupted by a crossbar arrives in
   pieces — and each end is pushed out to the outline.
4. Finally the strokes are joined into continuous **trails**, so the pen lifts as
   rarely as it sensibly can. Treating meeting points as nodes and strokes as
   edges, the fewest strokes needed is one per pair of odd-degree nodes: Euler's
   result about the bridges of Königsberg, applied to handwriting. ᛟ comes out as
   a single unbroken line, ᛞ as one closed circuit. Crossings aren't junctions —
   two lines passing through each other give the pen nowhere to turn — and since
   only endpoints become nodes, that falls out for free.

A handful of glyphs need help: ᚠ's tighter arc bends too sharply for the edge
pairing to follow round the corner, and ᛄ's lozenge tapers to points the extension
step can't reach. Those are stated explicitly in `overrides()`, with the reason.

### Transliteration accuracy

Words are looked up in the hand-checked dictionary first (which covers the
high-frequency core, so most running text), then regular inflections are peeled off
and the stem re-checked, and only then do the letter-to-sound rules run. Anything
that reached the rules is flagged in the UI as "worked out from spelling", because
English orthography being what it is, those are right most of the time but not all
of it.

## Text-to-speech

The browser's own `SpeechSynthesis` — free, no API key, works offline, uses your
OS voices. Since Web Speech has no reliable phoneme input, runes are converted to
an English respelling a British voice reads correctly (ᚦᛟᛟᛏ → "thawt").

On Windows look for a *Natural* voice, on macOS an *Enhanced* or *Premium* one;
pick it under Settings.

Optionally you can paste a [Google AI Studio](https://aistudio.google.com/apikey)
key in Settings to use Gemini's voices instead. The free tier is limited and the TTS
models are preview-only, so treat it as a bonus — the browser voice is always the
fallback.

## Credits

- Writing system: [Harys Dalvi](https://www.harysdalvi.com/futhorc) · [crackalamoo/futhorc](https://github.com/crackalamoo/futhorc)
- Rune shapes: [Noto Sans Runic](https://fonts.google.com/noto/specimen/Noto+Sans+Runic) (SIL Open Font License)
