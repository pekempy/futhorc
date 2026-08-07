import { useState } from 'react';
import { WORKSHEETS, WORKSHEET_LEVELS } from '../data/worksheetsData.js';
import { transliterateWord, transliterate } from '../lib/transliterate.js';
import { DEFAULT_PROFILE } from '../lib/progress.js';

export default function Worksheets({ state }) {
  const profile = state?.profile || DEFAULT_PROFILE;
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [selectedWsId, setSelectedWsId] = useState(0);
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  // Filter list based on selections
  const filteredWorksheets = selectedWsId === 'all'
    ? (selectedLevel === 'all' ? WORKSHEETS : WORKSHEETS.filter(w => w.level === selectedLevel))
    : WORKSHEETS.filter(w => w.id === Number(selectedWsId));

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    if (lvl !== 'all') {
      const firstInLvl = WORKSHEETS.find(w => w.level === lvl);
      if (firstInLvl) setSelectedWsId(firstInLvl.id);
    } else {
      setSelectedWsId('all');
    }
  };

  return (
    <div>
      {/* Interactive Controls (hidden when printing) */}
      <div className="no-print card stack" style={{ marginBottom: '1.5rem' }}>
        <div className="spread" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Select Worksheet (50 Worksheets Available)</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Worksheets include your custom Personal Profile Worksheet, basic words, names, place names, phonics rules, and historic passages.
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showAnswerKey}
              onChange={(e) => setShowAnswerKey(e.target.checked)}
            />
            Include Answer Keys
          </label>
        </div>

        {/* Level Filters */}
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
          <button
            className={`btn small ${selectedLevel === 'all' ? 'primary' : ''}`}
            onClick={() => handleLevelChange('all')}
          >
            All Worksheets (0–50)
          </button>
          {WORKSHEET_LEVELS.map((l) => (
            <button
              key={l.id}
              className={`btn small ${selectedLevel === l.id ? 'primary' : ''}`}
              onClick={() => handleLevelChange(l.id)}
            >
              {l.title}
            </button>
          ))}
        </div>

        {/* Individual Worksheet Dropdown */}
        <div className="row" style={{ gap: '0.75rem', alignItems: 'center' }}>
          <span className="small muted" style={{ fontWeight: 600 }}>Specific Sheet:</span>
          <select
            value={selectedWsId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedWsId(val === 'all' ? 'all' : Number(val));
              if (val !== 'all') {
                const ws = WORKSHEETS.find(w => w.id === Number(val));
                if (ws) setSelectedLevel(ws.level);
              }
            }}
            style={{ maxWidth: '420px' }}
          >
            <option value="all">Display All Worksheets in Level</option>
            {WORKSHEETS.map((w) => (
              <option key={w.id} value={w.id}>
                WS {w.id}: {w.title.replace(/^Worksheet \d+ - /, '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Render Selected Worksheets */}
      {filteredWorksheets.map((ws) => (
        <SingleWorksheetSheet
          key={ws.id}
          ws={ws}
          profile={profile}
          showAnswerKey={showAnswerKey}
        />
      ))}
    </div>
  );
}

function SingleWorksheetSheet({ ws, profile, showAnswerKey }) {
  // Drawn from whatever you chose to put on the You page. Anything left blank
  // prints as an empty line to fill in by hand, which is what a worksheet is
  // for — so there is no reason to bait anyone into typing their address.
  const personalFields = [
    { label: 'Your name', val: profile.name },
    { label: 'People you know', val: profile.people },
    { label: 'Places you know', val: profile.places },
    { label: 'Things you like', val: profile.likes },
    { label: 'What you do', val: profile.job },
    { label: 'A hobby', val: profile.hobby },
  ].filter((f) => f.label);

  return (
    <>
      <div className="sheet">
        <h1>{ws.title}</h1>
        <div className="sheet-sub">
          {ws.subtitle} {ws.instructions}
        </div>

        {ws.isPersonal && (
          <>
            <h2>Transliterate Your Profile Details into Futhorc Runes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 6mm' }}>
              {personalFields.map((f, i) => (
                <div className="ws-item" key={i} style={{ marginBottom: '3.5mm' }}>
                  <div className="q">{i + 1}.</div>
                  <div>
                    <div className="q" style={{ marginBottom: '1mm', fontWeight: 600 }}>
                      {f.label}:{' '}
                      {f.val
                        ? <span style={{ color: 'var(--accent)' }}>{f.val}</span>
                        : <span className="ws-blank" />}
                    </div>
                    <div className="ws-line" />
                    <div className="ws-line" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Section A: Writing to Runes */}
        {ws.writeWords && ws.writeWords.length > 0 && (
          <>
            <h2>A. Transliterate English words into runes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 6mm' }}>
              {ws.writeWords.map((w, i) => (
                <div className="ws-item" key={i}>
                  <div className="q">{i + 1}.</div>
                  <div>
                    <div className="q" style={{ marginBottom: '1mm', fontWeight: 600 }}>{w}</div>
                    <div className="ws-line" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {ws.writeSentences && ws.writeSentences.length > 0 && (
          <>
            <h2>A. Transliterate English sentences into Futhorc runes</h2>
            {ws.writeSentences.map((s, i) => (
              <div className="ws-item" key={i} style={{ marginBottom: '4mm' }}>
                <div className="q">{i + 1}.</div>
                <div>
                  <div className="q" style={{ marginBottom: '1mm', fontWeight: 600 }}>{s}</div>
                  <div className="ws-line" />
                  <div className="ws-line" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Section B: Reading Runes */}
        {ws.readWords && ws.readWords.length > 0 && (
          <>
            <h2 style={{ marginTop: '5mm' }}>B. Read the runes & write the English words</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 6mm' }}>
              {ws.readWords.map((w, i) => (
                <div className="ws-item" key={i}>
                  <div className="q">{i + 1}.</div>
                  <div>
                    <div className="ws-runic rune" style={{ fontSize: '15pt', marginBottom: '1mm' }}>
                      {transliterateWord(w).runes}
                    </div>
                    <div className="ws-line" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {ws.readSentences && ws.readSentences.length > 0 && (
          <>
            <h2 style={{ marginTop: '5mm' }}>B. Read the runic sentences & write in English</h2>
            {ws.readSentences.map((s, i) => (
              <div className="ws-item" key={i} style={{ marginBottom: '4mm' }}>
                <div className="q">{i + 1}.</div>
                <div>
                  <div className="ws-runic rune" style={{ fontSize: '14pt', marginBottom: '1.5mm', lineHeight: 1.4 }}>
                    {transliterate(s).text}
                  </div>
                  <div className="ws-line" />
                  <div className="ws-line" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Optional Answer Key Page */}
      {showAnswerKey && (
        <div className="sheet">
          <h1>Answer Key - {ws.title}</h1>
          <div className="sheet-sub">Self-check solution key for {ws.title}.</div>

          {ws.isPersonal && (
            <>
              <h2>Personal Profile Answer Key</h2>
              <div className="ws-answers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm 4mm' }}>
                {personalFields.map((f, i) => (
                  <div key={i} style={{ fontSize: '9pt' }}>
                    <div>{i + 1}. <strong>{f.label}:</strong> {f.val}</div>
                    <div className="rune" style={{ fontSize: '11pt', color: 'var(--accent)' }}>
                      → {transliterate(f.val).text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {ws.writeWords && ws.writeWords.length > 0 && (
            <>
              <h2>Section A Answers (Writing to Runes)</h2>
              <div className="ws-answers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1mm 4mm' }}>
                {ws.writeWords.map((w, i) => (
                  <div key={i} style={{ fontSize: '9pt' }}>
                    {i + 1}. <strong>{w}</strong> → <span className="rune" style={{ fontSize: '12pt', color: 'var(--accent)' }}>{transliterateWord(w).runes}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {ws.writeSentences && ws.writeSentences.length > 0 && (
            <>
              <h2>Section A Answers (Sentences to Runes)</h2>
              {ws.writeSentences.map((s, i) => (
                <div key={i} style={{ fontSize: '8.5pt', marginBottom: '2.5mm' }}>
                  <div style={{ fontWeight: 600 }}>{i + 1}. {s}</div>
                  <div className="rune" style={{ fontSize: '11pt', color: 'var(--accent)' }}>
                    {transliterate(s).text}
                  </div>
                </div>
              ))}
            </>
          )}

          {ws.readWords && ws.readWords.length > 0 && (
            <>
              <h2 style={{ marginTop: '4mm' }}>Section B Answers (Reading Runes)</h2>
              <div className="ws-answers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1mm 4mm' }}>
                {ws.readWords.map((w, i) => (
                  <div key={i} style={{ fontSize: '9pt' }}>
                    {i + 1}. <span className="rune" style={{ fontSize: '12pt', color: 'var(--accent)' }}>{transliterateWord(w).runes}</span> → <strong>{w}</strong>
                  </div>
                ))}
              </div>
            </>
          )}

          {ws.readSentences && ws.readSentences.length > 0 && (
            <>
              <h2 style={{ marginTop: '4mm' }}>Section B Answers (Runic Sentences to English)</h2>
              {ws.readSentences.map((s, i) => (
                <div key={i} style={{ fontSize: '8.5pt', marginBottom: '2.5mm' }}>
                  <div className="rune" style={{ fontSize: '11pt', color: 'var(--accent)' }}>
                    {i + 1}. {transliterate(s).text}
                  </div>
                  <div style={{ fontWeight: 600 }}>→ {s}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
