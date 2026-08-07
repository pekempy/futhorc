import { FUTHORC_ORDER, RUNE_BY_CHAR } from '../data/runes.js';
import { SAY } from '../lib/phonology.js';

const PER_PAGE = 9;

/**
 * Nine cards to a page. Each front page is followed by its back page with the
 * columns mirrored, so short-edge duplex printing lines the two up.
 */
export default function Flashcards() {
  const runes = FUTHORC_ORDER.filter((c) => RUNE_BY_CHAR[c]);
  const pages = [];
  for (let i = 0; i < runes.length; i += PER_PAGE) pages.push(runes.slice(i, i + PER_PAGE));

  return (
    <>
      {pages.map((page, p) => (
        <div key={p}>
          <div className="sheet">
            <div style={{ fontSize: '7.5pt', color: '#888', marginBottom: '2mm' }}>
              Fronts — sheet {p + 1}. Print double-sided, flipping on the short edge, then cut along the dashed lines.
            </div>
            <div className="cards-grid">
              {rows(pad(page)).map((row, r) => (
                <div className="cards-row" key={r}>
                  {row.map((c, k) => (
                    <div className="flashcard" key={k}>
                      {c && <span className="fc-rune rune">{c}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="sheet">
            <div style={{ fontSize: '7.5pt', color: '#888', marginBottom: '2mm' }}>
              Backs — sheet {p + 1}.
            </div>
            <div className="cards-grid">
              {rows(mirror(pad(page))).map((row, r) => (
                <div className="cards-row" key={r}>
                  {row.map((c, k) => (
                    <div className="flashcard" key={k}>
                      {c && <Back rune={c} />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function Back({ rune }) {
  const r = RUNE_BY_CHAR[rune];
  return (
    <>
      <span className="fc-name">{r.name}</span>
      <span className="fc-runic rune">{r.runic}</span>
      <span className="fc-sound">{r.gloss}</span>
      <span className="fc-ex">/{r.ipa.join(', ')}/ · say “{r.ipa.map((p) => SAY[p] ?? p).join('/')}”</span>
      <span className="fc-ex">{r.eg.map((e) => e.replace(/[{}]/g, '')).join(' · ')}</span>
    </>
  );
}

const pad = (page) => [...page, ...Array(PER_PAGE - page.length).fill(null)];
const rows = (cells) => [cells.slice(0, 3), cells.slice(3, 6), cells.slice(6, 9)];

/** Reverse each row of 3 so the backs land behind the right fronts. */
function mirror(cells) {
  const out = [];
  for (let r = 0; r < 3; r++) out.push(...cells.slice(r * 3, r * 3 + 3).reverse());
  return out;
}
