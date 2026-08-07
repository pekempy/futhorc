# ᚠᚢᚦᚩᚱᚳ Futhorc

A beginner's course in reading and writing modern English with Anglo-Saxon runes,
adapted to a **British** (non-rhotic, RP) accent.

Nineteen units take you from knowing nothing to reading whole passages and numbers, with a
rune reference, a spaced-repetition practice mode, a live English↔runes converter,
text-to-speech, password-protected user accounts, leaderboards, profile worksheets, and printable sheets.

The name is an acrostic: ᚠᚢᚦᚩᚱᚳ is simply the first six runes — Fee, Up, Thorn,
Oak, Ride, Car — in the same way *alphabet* comes from alpha and beta.

---

## 🚀 Running with Docker (Recommended)

Run the production application directly using Docker Compose:

```bash
docker compose up -d
```

The app will be accessible at **http://localhost:7863**.

- **Persistent Database**: All accounts, user profiles, daily streaks, XP, and lesson progress are stored in an SQLite database file at `./data/futhorc.db` (mounted via `./data:/app/data`).
- **System Gemini API Key (Optional)**: Provide `VITE_GEMINI_API_KEY` in `.env` to enable AI voice TTS across all accounts automatically.

---

## 💻 Local Development

```bash
npm install
npm run dev      # http://localhost:7863
npm run build    # → dist/ and a standalone futhorc.html
```

`npm run build` produces **`futhorc.html`** — the whole app in one self-contained single file (CSS, JS, and the rune font all inlined). Double-click it; no server needed.

---

## ✨ Features & What's in it

| Feature | Description |
|---|---|
| **Learn** | Nineteen units across six parts. Each unit teaches a few runes or numbers with animated stroke order, then drills them: stroke diagram, multiple choice, audio drills, sentence reading, and whole passages. Every fourth unit includes a review round. Includes **Unit 19: Counting in Futhorc**. |
| **Accounts & Security** | Password-protected accounts with SHA-256 password hashing, profile customization (name, home town, birthday, hobbies), and guest mode. |
| **Leaderboard & XP** | Daily streak tracking, rank badges, daily challenges, and a live scholarly leaderboard for registered accounts. |
| **Spelled-Out Runic Numbers** | Historical Anglo-Saxon spelled-out numeral engine (1 = *ān* `ᚪᚾ`, 2 = *twā* `ᛏᚹᚪ`, 10 = *tīen* `ᛏᛁᛖᚾ`, 1000 = *þūsend* `ᚦᢢᛋᛖᚾᛞ`). Digits typed in text or worksheets are automatically transliterated into spelled-out runes. |
| **Runes & Numbers Reference** | All thirty runes in traditional order or grouped by sound, plus a dedicated **Anglo-Saxon Runic Numbers** reference chart. |
| **Practice** | Twelve-question rounds weighted towards items you keep getting wrong (Leitner-style spaced repetition). |
| **Write** | Type English or numbers, get runes. Or paste runes and get them sounded out rune by rune. |
| **Print** | Stroke-order guide, wall chart, cut-out flashcards, and 50+ worksheets including **Personal Profile Worksheets** with customized answer keys. |

---

## 🐳 Docker & CI/CD Pipeline

The project includes an automated GitHub Actions workflow ([`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)) that builds and pushes multi-architecture Docker images to GitHub Container Registry (GHCR) whenever a version tag (e.g. `v1.0.0`) is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Pull the image manually:
```bash
docker pull ghcr.io/pekempy/futhorc:latest
```

---

## 📖 The writing system

Based on [Harys Dalvi's futhorc](https://www.harysdalvi.com/futhorc)
([source](https://github.com/crackalamoo/futhorc)), which maps Anglo-Saxon runes onto
*American* English. The consonants are unchanged; the vowels are re-mapped for
British RP.

### Three rules carry most of it

**1. Spell what you hear.** Runes are phonetic. Silent letters vanish and doubled
letters collapse: *laugh* → ᛚᚪᚠᚠ, *through* → ᚦᚱᚣᚣ, *tell* → ᛖᛚ, *knee* → ᚾᛁᛁ.

**2. Double a vowel to lengthen it.**

| Short | | Long | |
|---|---|---|---|
| ᛁ | s**i**t | ᛁᛁ | s**ee**d |
| ᛖ | b**e**d | ᛖᛖ | h**air** |
|  | f**u**n |  | t**ur**n |
| ᛟ | h**o**t | ᛟᛟ | th**ough**t |
| ᚣ | b**oo**k | ᚣᚣ | f**oo**d |
| ᚫ | h**a**t | ᚪ | **ar**m, b**a**th — no short partner |

**3. Only write ᚱ when you say it.** British English is non-rhotic, so ᚱ appears
only before a vowel: *car* → ᚳᚪ but *carry* → ᚳᚫᚱᛁ; *north* → ᚾᛟᛟᚦ; *here* → ᚻᛁᚢ.

Plus one tidy-up: ᚠ is both f and v, and ᛋ is both s and z, so at the **end** of a
word they're doubled when voiceless — *leaf* ᛚᛁᛁᚠᚠ vs *leave* ᛚᛁᛁᚠ, *cats* ᚳᚫᛏᛋᛋ vs
*dogs* ᛞᛟᚷᛋ.

---

## 🛠️ Architecture Overview

```
src/
  data/
    runes.js          the thirty runes: names, sounds, examples, notes
    glyphs.js         GENERATED — outlines and stroke skeletons
    lessons.js        nineteen-unit curriculum (including numbers)
    worksheetsData.js 50+ progressive worksheets
    lexicon.js        ~750 hand-checked RP pronunciations
  lib/
    phonology.js      phonemes ↔ runes, and spelling rules
    numbers.js        spelled-out Anglo-Saxon numeral conversion engine
    auth.js           SHA-256 authentication & account storage
    progress.js       local progress, XP, streaks, and server database sync
    transliterate.js  text & number transliteration
    speech.js         text-to-speech (Browser Web Speech & Gemini TTS)
  components/         React UI views & Auth Modal
  print/              printable sheets and profile worksheets
server.mjs            Node.js server with SQLite database file persistence
Dockerfile            multi-stage Docker build
docker-compose.yml    container deployment config (port 7863)
```

---

## 📜 Credits

- Writing system: [Harys Dalvi](https://www.harysdalvi.com/futhorc) · [crackalamoo/futhorc](https://github.com/crackalamoo/futhorc)
- Rune shapes: [Noto Sans Runic](https://fonts.google.com/noto/specimen/Noto+Sans+Runic) (SIL Open Font License)
