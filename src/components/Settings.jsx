import { useEffect, useState } from 'react';
import { listVoices, isSupported, speakRunes } from '../lib/speech.js';
import { reset } from '../lib/progress.js';
import { LEXICON_SIZE } from '../data/lexicon.js';

const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

export default function Settings({ state, update }) {
  const [voices, setVoices] = useState([]);
  const s = state.settings;
  const set = (k, v) => update((st) => { st.settings[k] = v; });

  useEffect(() => {
    if (!isSupported()) return;
    const load = () => setVoices(listVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);

  const gb = voices.filter((v) => /en[-_]GB/i.test(v.lang));
  const other = voices.filter((v) => /^en/i.test(v.lang) && !/en[-_]GB/i.test(v.lang));

  return (
    <div className="stack">
      <h1>Settings</h1>

      <section className="card stack">
        <h2>Spelling</h2>
        <label className="toggle">
          <input type="checkbox" checked={s.ligatures} onChange={(e) => set('ligatures', e.target.checked)} />
          Use the ᛥ (st) and ᛢ (qu) ligatures
        </label>
        <label className="toggle">
          <input type="checkbox" checked={s.markVoiceless} onChange={(e) => set('markVoiceless', e.target.checked)} />
          Double ᚠ and ᛋ at the end of a word when the sound is voiceless
        </label>
        <label className="toggle">
          <input type="checkbox" checked={s.separator === 'interpunct'} onChange={(e) => set('separator', e.target.checked ? 'interpunct' : 'space')} />
          Separate words with an interpunct ᛫ rather than a space
        </label>
      </section>

      <section className="card stack">
        <h2>Reading aloud</h2>
        {!isSupported() && <p className="muted small">Your browser doesn't support speech synthesis.</p>}
        {isSupported() && (
          <>
            <div>
              <label className="field" htmlFor="voice">Voice</label>
              <select id="voice" value={s.voiceName} onChange={(e) => set('voiceName', e.target.value)}>
                <option value="">Best British voice available</option>
                {gb.length > 0 && (
                  <optgroup label="British English">
                    {gb.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                  </optgroup>
                )}
                {other.length > 0 && (
                  <optgroup label="Other English">
                    {other.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                  </optgroup>
                )}
              </select>
              <p className="tiny muted" style={{ margin: '0.4rem 0 0' }}>
                Voices come from your operating system, so they're free and work offline.
                On Windows, look for a “Natural” voice; on a Mac, an “Enhanced” or “Premium” one.
              </p>
            </div>
            <div>
              <label className="field" htmlFor="rate">Speed — {s.speakRate.toFixed(2)}×</label>
              <input id="rate" type="range" min="0.5" max="1.3" step="0.05" value={s.speakRate}
                     onChange={(e) => set('speakRate', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div className="row">
              <button className="btn" onClick={() => speakRunes('ᚦᚢ᛫ᚳᚫᛏ᛫ᛋᚫᛏ᛫ᛟᚾ᛫ᚦᚢ᛫ᛗᚫᛏ', { voiceName: s.voiceName, rate: s.speakRate })}>
                Test — <span className="rune">ᚦᚢ᛫ᚳᚫᛏ᛫ᛋᚫᛏ᛫ᛟᚾ᛫ᚦᚢ᛫ᛗᚫᛏ</span>
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card stack">
        <h2>Gemini voices (optional)</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Google's voices sound better than most system ones. You'll need a free API key from
          {' '}<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
          The free tier is limited and the TTS models are preview-only, so this can stop working
          without warning — the browser voice is always there as a fallback. Your key is stored
          in this browser and sent only to Google.
        </p>
        <label className="toggle">
          <input type="checkbox" checked={s.useGemini} onChange={(e) => set('useGemini', e.target.checked)} />
          Use Gemini when a key is set
        </label>
        <div>
          <label className="field" htmlFor="key">API key</label>
          <input id="key" type="text" value={s.geminiKey} placeholder="AIza…"
                 onChange={(e) => set('geminiKey', e.target.value.trim())} autoComplete="off" spellCheck="false" />
        </div>
        <div>
          <label className="field" htmlFor="gvoice">Gemini voice</label>
          <select id="gvoice" value={s.geminiVoice || 'Kore'} onChange={(e) => set('geminiVoice', e.target.value)}>
            {GEMINI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </section>

      <section className="card stack">
        <h2>Progress</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Units finished: {state.completedUnits.length} · runes tracked: {Object.keys(state.strength).length} ·
          dictionary: {LEXICON_SIZE} words. Everything is stored in this browser only.
        </p>
        <div>
          <button
            className="btn"
            onClick={() => { if (confirm('Erase all progress and settings?')) { reset(); location.reload(); } }}
          >Reset everything</button>
        </div>
      </section>
    </div>
  );
}
