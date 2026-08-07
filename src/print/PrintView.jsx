import { useState } from 'react';
import StrokeSheet from './StrokeSheet.jsx';
import ChartSheet from './ChartSheet.jsx';
import Flashcards from './Flashcards.jsx';
import Worksheets from './Worksheets.jsx';

const SHEETS = [
  ['stroke', 'Stroke-order guide', 'Every rune drawn stroke by stroke, with tracing boxes. Four pages.'],
  ['chart', 'Reference chart', 'All thirty runes, the sounds, the rules. Two pages — the one to pin up.'],
  ['cards', 'Flashcards', 'Nine to a page, front and back aligned for double-sided printing.'],
  ['worksheets', 'Worksheets', 'Transliterate and read-back exercises, with an answer key.'],
];

export default function PrintView() {
  const [sheet, setSheet] = useState('stroke');

  return (
    <div className="stack">
      <div className="no-print stack">
        <div>
          <h1>Printable sheets</h1>
          <p className="muted">
            Pick a sheet, then print. They're laid out for A4 — set your printer to
            100% scale and no headers or footers.
          </p>
        </div>
        <div className="tiles">
          {SHEETS.map(([id, title, desc]) => (
            <button key={id} className="tile" onClick={() => setSheet(id)} style={sheet === id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}>
              <h3>{title}</h3>
              <p>{desc}</p>
            </button>
          ))}
        </div>
        <div>
          <button className="btn primary" onClick={() => window.print()}>Print this sheet</button>
        </div>
      </div>

      {sheet === 'stroke' && <StrokeSheet />}
      {sheet === 'chart' && <ChartSheet />}
      {sheet === 'cards' && <Flashcards />}
      {sheet === 'worksheets' && <Worksheets />}
    </div>
  );
}
