import { FUTHORC_ORDER, RUNE_BY_CHAR, DIGRAPHS, PUNCTUATION } from '../data/runes.js';

const plain = (s) => s.replace(/[{}]/g, '');

export default function ChartSheet() {
  const runes = FUTHORC_ORDER.filter((c) => RUNE_BY_CHAR[c]).map((c) => RUNE_BY_CHAR[c]);
  const half = Math.ceil(runes.length / 2);

  return (
    <>
      <div className="sheet">
        <h1>Futhorc — the runes at a glance</h1>
        <div className="sheet-sub">
          Anglo-Saxon runes for writing modern British English. Listed in the traditional futhorc order.
        </div>
        <div className="chart-cols">
          <Table rows={runes.slice(0, half)} />
          <Table rows={runes.slice(half)} />
        </div>

      </div>

      <div className="sheet">
        <h1>The rules</h1>
        <div className="sheet-sub">Everything you need beyond the letters themselves.</div>

        <h2>Sounds written with two runes</h2>
        <div className="chart-cols">
          <table className="chart-table">
            <tbody>
              {DIGRAPHS.slice(0, 6).map((d) => (
                <tr key={d.d}>
                  <td className="r rune">{d.d}</td>
                  <td>{d.gloss}<br /><span style={{ color: '#666' }}>{d.eg.map(plain).join(', ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="chart-table">
            <tbody>
              {DIGRAPHS.slice(6).map((d) => (
                <tr key={d.d}>
                  <td className="r rune">{d.d}</td>
                  <td>{d.gloss}<br /><span style={{ color: '#666' }}>{d.eg.map(plain).join(', ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>1. Write what you hear</h2>
        <p style={{ fontSize: '9.5pt' }}>
          Runes spell sounds, not letters. Silent letters disappear and doubled letters collapse:
          {' '}<i>laugh</i> → <span className="rune">ᛚᚪᚠᚠ</span>, <i>through</i> → <span className="rune">ᚦᚱᚣᚣ</span>,
          {' '}<i>tell</i> → <span className="rune">ᛏᛖᛚ</span>, <i>knee</i> → <span className="rune">ᚾᛁᛁ</span>.
        </p>

        <h2>2. Double a vowel to lengthen it</h2>
        <table className="chart-table" style={{ marginBottom: '3mm' }}>
          <thead><tr><th>Short</th><th>as in</th><th>Long</th><th>as in</th></tr></thead>
          <tbody>
            {[
              ['ᛁ', 'sit', 'ᛁᛁ', 'seed'],
              ['ᛖ', 'bed', 'ᛖᛖ', 'hair'],
              ['ᚢ', 'fun', 'ᚢᚢ', 'turn'],
              ['ᛟ', 'hot', 'ᛟᛟ', 'thought'],
              ['ᚣ', 'book', 'ᚣᚣ', 'food'],
            ].map((r) => (
              <tr key={r[0]}>
                <td className="r rune">{r[0]}</td><td><i>{r[1]}</i></td>
                <td className="r rune">{r[2]}</td><td><i>{r[3]}</i></td>
              </tr>
            ))}
            <tr>
              <td className="r rune">ᚫ</td><td><i>hat</i></td>
              <td className="r rune">ᚪ</td><td><i>arm, bath, fast</i> — no short partner</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Only write ᚱ when you say it</h2>
        <p style={{ fontSize: '9.5pt' }}>
          British English is non-rhotic: r is only pronounced before a vowel.
          {' '}<i>car</i> → <span className="rune">ᚳᚪ</span> but <i>carry</i> → <span className="rune">ᚳᚫᚱᛁ</span>;
          {' '}<i>turn</i> → <span className="rune">ᛏᚢᚢᚾ</span>, <i>north</i> → <span className="rune">ᚾᛟᛟᚦ</span>,
          {' '}<i>here</i> → <span className="rune">ᚻᛁᚢ</span>.
        </p>

        <h2>4. Double ᚠ and ᛋ at the end of a word if the sound is voiceless</h2>
        <table className="chart-table" style={{ marginBottom: '3mm' }}>
          <tbody>
            {[
              ['leaf', 'ᛚᛁᛁᚠᚠ', 'leave', 'ᛚᛁᛁᚠ'],
              ['off', 'ᛟᚠᚠ', 'of', 'ᛟᚠ'],
              ['cats', 'ᚳᚫᛏᛋᛋ', 'dogs', 'ᛞᛟᚷᛋ'],
              ['ice', 'ᛡᛋᛋ', 'eyes', 'ᛡᛋ'],
            ].map((r) => (
              <tr key={r[0]}>
                <td><i>{r[0]}</i></td><td className="rune" style={{ fontSize: '13pt' }}>{r[1]}</td>
                <td><i>{r[2]}</i></td><td className="rune" style={{ fontSize: '13pt' }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>5. Weak vowels all become ᚢ</h2>
        <p style={{ fontSize: '9.5pt' }}>
          Unstressed syllables collapse: <i>about</i> → <span className="rune">ᚢᛒᚪᚹᛏ</span>,
          {' '}<i>butter</i> → <span className="rune">ᛒᚢᛏᚢ</span>, <i>comma</i> → <span className="rune">ᚳᛟᛗᚢ</span>,
          {' '}<i>bottle</i> → <span className="rune">ᛒᛟᛏᚢᛚ</span>.
        </p>

        <h2>6. Layout</h2>
        <table className="chart-table" style={{ marginBottom: '3mm' }}>
          <tbody>
            {PUNCTUATION.map((p) => (
              <tr key={p.r}>
                <td className="r rune">{p.r}</td>
                <td><b>{p.name}</b> — {p.gloss}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '9.5pt' }}>
          Commas, full stops and apostrophes work exactly as in English. ᛥ and ᛢ are optional
          joined-up forms of ᛋᛏ and ᚳᚹ.
        </p>

        <h2>Sample</h2>
        <p className="rune" style={{ fontSize: '13pt', lineHeight: 1.7 }}>
          ᛏᚣᚣ᛫ᛒᛁᛁ, ᛟᛟ᛫ᚾᛟᛏ᛫ᛏᚣᚣ᛫ᛒᛁᛁ, ᚦᚫᛏ᛫ᛁᛋ᛫ᚦᚢ᛫ᛢᛖᛋᚳᚻᚢᚾ.
        </p>
        <p style={{ fontSize: '9pt', color: '#555' }}>
          To be, or not to be, that is the question.
        </p>
      </div>
    </>
  );
}

function Table({ rows }) {
  return (
    <table className="chart-table">
      <thead>
        <tr><th>Rune</th><th>Name</th><th>Sound</th><th>As in</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.r}>
            <td className="r rune">{r.r}</td>
            <td>
              {r.name}<br />
              <span className="rune" style={{ fontSize: '10pt', color: '#666' }}>{r.runic}</span>
            </td>
            <td>{r.ipa.join(', ')}</td>
            <td style={{ color: '#444' }}>{r.eg.map(plain).join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
