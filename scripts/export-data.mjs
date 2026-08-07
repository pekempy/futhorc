/*
 * Writes android-data/futhorc-data.json — everything the Android app needs,
 * in one file.
 *
 * The web app is the single source of truth. Rather than re-implement the
 * letter-to-sound engine in Kotlin (and risk the two drifting apart), every
 * word, sentence and passage the course uses is transliterated *here* and
 * shipped pre-computed. The phone only ever looks things up.
 *
 * The file is committed, so the app can fetch it straight from GitHub raw and
 * pick up data changes without a new release.
 *
 * Run: npm run export:data
 */
import { writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { RUNES, DIGRAPHS, PUNCTUATION, FUTHORC_ORDER, SEP } from '../src/data/runes.js';
import { GLYPHS } from '../src/data/glyphs.js';
import { UNITS } from '../src/data/lessons.js';
import { LEXICON } from '../src/data/lexicon.js';
import { transliterate, transliterateWord, readAloud } from '../src/lib/transliterate.js';
import { R2P, SAY } from '../src/lib/phonology.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'android-data');
const OUT = join(OUT_DIR, 'futhorc-data.json');

const toRunes = (s) => transliterate(s).text;

// ── The course, with every prompt already in runes ─────────────────────────
const units = UNITS.map((u) => ({
  id: u.id,
  part: u.part,
  title: u.title,
  subtitle: u.subtitle,
  blurb: u.blurb,
  runes: u.runes ?? [],
  teach: u.teach ?? [],
  review: !!u.review,
  finalReview: !!u.finalReview,
  words: (u.words ?? []).map((w) => ({
    english: w,
    runes: transliterateWord(w).runes,
    say: readAloud(transliterateWord(w).runes),
  })),
  sentences: (u.sentences ?? []).map((s) => ({ english: s, runes: toRunes(s) })),
  freeRead: (u.freeRead ?? []).map((s) => ({ english: s, runes: toRunes(s) })),
  freeWrite: (u.freeWrite ?? []).map((s) => ({ english: s, runes: toRunes(s) })),
  passages: (u.passages ?? []).map((p) => ({
    title: p.title,
    english: p.english,
    runes: toRunes(p.english),
  })),
}));

// ── Runic → English, for reading the writing pad back ──────────────────────
//
// The phone can turn runes into sounds with the table below, but sounds only
// give you a respelling ("th-aw-t"). Looking the runic spelling up in this
// index gets the actual word. Several English words can share one runic
// spelling — ᚠᚪ is both 'far' and (for some speakers) 'fa' — so values are
// lists, commonest first by the order they appear in the lexicon.
const reverse = {};
for (const word of Object.keys(LEXICON)) {
  const runic = transliterateWord(word).runes;
  if (!runic) continue;
  (reverse[runic] ??= []).push(word);
}
for (const k of Object.keys(reverse)) {
  reverse[k] = [...new Set(reverse[k])].sort((a, b) => a.length - b.length);
}

// ── Glyphs: outline for display, stroke paths for drawing and scoring ──────
const glyphs = {};
for (const [rune, g] of Object.entries(GLYPHS)) {
  glyphs[rune] = {
    w: g.w,
    strokes: g.strokes,
    path: g.path,
    xmin: g.xmin,
    scale: g.scale,
  };
}

const data = {
  schema: 1,
  generated: new Date().toISOString(),
  separator: SEP,
  futhorcOrder: FUTHORC_ORDER,
  runes: RUNES.map((r) => ({
    rune: r.r,
    kind: r.kind,
    name: r.name,
    runicName: r.runic,
    ipa: r.ipa,
    gloss: r.gloss,
    examples: r.eg ?? [],
    note: r.note ?? null,
    length: r.length ?? null,
  })),
  digraphs: DIGRAPHS.map((d) => ({
    runes: d.d,
    kind: d.kind,
    ipa: d.ipa,
    gloss: d.gloss,
    examples: d.eg ?? [],
  })),
  punctuation: PUNCTUATION.map((p) => ({
    mark: p.r, name: p.name, gloss: p.gloss, example: p.eg ?? null,
  })),
  glyphs,
  units,
  // rune sequence → phoneme, longest first; the phone reads runes with this
  runeToPhoneme: R2P.map(([seq, p]) => ({ runes: seq, phoneme: p })),
  // phoneme → rough English respelling, for sounding out
  say: SAY,
  reverseIndex: reverse,
};

// A content hash so the app can tell whether a fetched copy differs from the
// one it already has, without comparing the whole file.
const body = JSON.stringify(data, null, 0);
data.version = createHash('sha256').update(body).digest('hex').slice(0, 16);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 1));

const kb = (JSON.stringify(data).length / 1024).toFixed(0);
console.log(`android-data/futhorc-data.json — ${kb} kB, version ${data.version}`);
console.log(`  ${data.runes.length} runes · ${units.length} units · ` +
  `${Object.keys(reverse).length} runic spellings indexed`);
