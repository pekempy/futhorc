import { transliterateWord, transliterate } from '../lib/transliterate.js';

const WRITE_WORDS = [
  'sit', 'man', 'bed', 'hand', 'thing', 'cat', 'stop', 'long', 'book', 'day',
  'water', 'father', 'night', 'green', 'house', 'winter', 'quick', 'story',
];

const READ_WORDS = [
  'mist', 'send', 'rock', 'this', 'ring', 'food', 'bird', 'more', 'boy', 'here',
  'fish', 'jump', 'far', 'hair', 'stone', 'town', 'young', 'question',
];

const SENTENCES = [
  'The cat sat on the mat.',
  'I can read and write runes.',
  'We went down to the river.',
  'My brother has a small garden.',
  'The old king walked through the forest.',
  'She jumped over the wall and ran home.',
];

const TO_TRANSLITERATE = [
  'The dog is in the garden.',
  'Winter is cold and dark.',
  'Give me the book, please.',
];

export default function Worksheets() {
  return (
    <>
      <div className="sheet">
        <h1>Worksheet 1 — writing runes</h1>
        <div className="sheet-sub">
          Write each English word in runes. Say it out loud first and write the sounds you hear,
          not the letters. Remember: only write ᚱ before a vowel, and double a vowel to lengthen it.
        </div>

        <h2>A. Single words</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 6mm' }}>
          {WRITE_WORDS.map((w, i) => (
            <div className="ws-item" key={w}>
              <div className="q">{i + 1}.</div>
              <div>
                <div className="q" style={{ marginBottom: '1mm' }}>{w}</div>
                <div className="ws-line" />
              </div>
            </div>
          ))}
        </div>

        <h2>B. Whole sentences</h2>
        {TO_TRANSLITERATE.map((s, i) => (
          <div className="ws-item" key={s}>
            <div className="q">{i + 1}.</div>
            <div>
              <div className="q" style={{ marginBottom: '1mm' }}>{s}</div>
              <div className="ws-line" />
              <div className="ws-line" />
            </div>
          </div>
        ))}
      </div>

      <div className="sheet">
        <h1>Worksheet 2 — reading runes</h1>
        <div className="sheet-sub">
          Sound each one out, then write the English underneath.
        </div>

        <h2>A. Single words</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 6mm' }}>
          {READ_WORDS.map((w, i) => (
            <div className="ws-item" key={w}>
              <div className="q">{i + 1}.</div>
              <div>
                <div className="ws-runic rune">{transliterateWord(w).runes}</div>
                <div className="ws-line" />
              </div>
            </div>
          ))}
        </div>

        <h2>B. Sentences</h2>
        {SENTENCES.map((s, i) => (
          <div className="ws-item" key={s}>
            <div className="q">{i + 1}.</div>
            <div>
              <div className="ws-runic rune">{transliterate(s).text}</div>
              <div className="ws-line" />
            </div>
          </div>
        ))}
      </div>

      <div className="sheet">
        <h1>Answer key</h1>
        <div className="sheet-sub">Worksheets 1 and 2.</div>

        <h2>Worksheet 1A</h2>
        <div className="ws-answers">
          {WRITE_WORDS.map((w, i) => (
            <div key={w}>{i + 1}. {w} — <span className="rune" style={{ fontSize: '12pt' }}>{transliterateWord(w).runes}</span></div>
          ))}
        </div>

        <h2>Worksheet 1B</h2>
        {TO_TRANSLITERATE.map((s, i) => (
          <div key={s} style={{ fontSize: '8.5pt', marginBottom: '1.5mm' }}>
            {i + 1}. <span className="rune" style={{ fontSize: '12pt' }}>{transliterate(s).text}</span>
          </div>
        ))}

        <h2>Worksheet 2A</h2>
        <div className="ws-answers">
          {READ_WORDS.map((w, i) => (
            <div key={w}>{i + 1}. <span className="rune" style={{ fontSize: '12pt' }}>{transliterateWord(w).runes}</span> — {w}</div>
          ))}
        </div>

        <h2>Worksheet 2B</h2>
        {SENTENCES.map((s, i) => (
          <div key={s} style={{ fontSize: '8.5pt', marginBottom: '1.5mm' }}>{i + 1}. {s}</div>
        ))}

        <h2>Things to watch for</h2>
        <ul style={{ fontSize: '8.5pt', paddingLeft: '4mm' }}>
          <li><i>far</i> is <span className="rune">ᚠᚪ</span> — no ᚱ, because you don't say one.</li>
          <li><i>more</i> is <span className="rune">ᛗᛟᛟ</span> — same reason, and ᛟ doubled for the long <i>aw</i>.</li>
          <li><i>question</i> is <span className="rune">ᛢᛖᛋᚳᚻᚢᚾ</span> — the <i>-tion</i> is really “shun”.</li>
          <li><i>water</i> is <span className="rune">ᚹᛟᛟᛏᚢ</span> — the ending is a weak ᚢ, not ᛖᚱ.</li>
        </ul>
      </div>
    </>
  );
}
