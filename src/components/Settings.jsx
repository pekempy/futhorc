import { useEffect, useState } from 'react';
import { listVoices, isSupported, speakRunes, fetchSystemApiKey } from '../lib/speech.js';
import { reset } from '../lib/progress.js';
import { LEXICON_SIZE } from '../data/lexicon.js';
import * as drive from '../lib/drive.js';
import { fromBackup } from '../lib/syncFormat.js';

const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

export default function Settings({ state, update }) {
  const [tab, setTab] = useState('spelling');
  const [voices, setVoices] = useState([]);
  // Lifted so the Progress blurb below reacts the moment Drive connects.
  const [driveAccount, setDriveAccount] = useState(drive.currentAccount());
  const [hasSystemKey, setHasSystemKey] = useState(
    !!(import.meta.env?.VITE_GEMINI_API_KEY)
  );
  const s = state.settings;
  const set = (k, v) => update((st) => { st.settings[k] = v; });

  useEffect(() => {
    fetchSystemApiKey().then((key) => {
      if (key) setHasSystemKey(true);
    });
  }, []);

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

      <div className="settings-menu">
        <button className={tab === 'spelling' ? 'active' : ''} onClick={() => setTab('spelling')}>Spelling</button>
        <button className={tab === 'audio' ? 'active' : ''} onClick={() => setTab('audio')}>Audio</button>
        <button className={tab === 'theme' ? 'active' : ''} onClick={() => setTab('theme')}>Theme</button>
        <button className={tab === 'backup' ? 'active' : ''} onClick={() => setTab('backup')}>Backup</button>
        <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}>Progress</button>
      </div>

      {tab === 'spelling' && (
        <section className="card stack">
          <h2>Spelling Settings</h2>
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
      )}

      {tab === 'audio' && (
        <>
          <section className="card stack">
            <h2>Reading Aloud</h2>
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
                  <label className="field" htmlFor="rate">Speed - {s.speakRate.toFixed(2)}×</label>
                  <input id="rate" type="range" min="0.5" max="1.3" step="0.05" value={s.speakRate}
                         onChange={(e) => set('speakRate', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <div className="row">
                  <button className="btn" onClick={() => speakRunes('ᚦᚢ᛫ᚳᚫᛏ᛫ᛋᚫᛏ᛫ᛟᚾ᛫ᚦᚢ᛫ᛗᚫᛏ', { voiceName: s.voiceName, rate: s.speakRate })}>
                    Test - <span className="rune">ᚦᚢ᛫ᚳᚫᛏ᛫ᛋᚫᛏ᛫ᛟᚾ᛫ᚦᚢ᛫ᛗᚫᛏ</span>
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="card stack">
            <h2>Gemini Voice</h2>
            {hasSystemKey ? (
              <>
                <p className="tiny muted" style={{ margin: 0 }}>
                  System Gemini AI voice active. Customize your voice preference below:
                </p>
                <div>
                  <label className="field" htmlFor="gvoice">Select Voice</label>
                  <select id="gvoice" value={s.geminiVoice || 'Kore'} onChange={(e) => set('geminiVoice', e.target.value)}>
                    {GEMINI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  Google's voices sound better than most system ones. You'll need a free API key from
                  {' '}<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
                  The free tier is limited and the TTS models are preview-only, so this can stop working
                  without warning - the browser voice is always there as a fallback. Your key is stored
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
              </>
            )}
          </section>
        </>
      )}

      {tab === 'theme' && (
        <section className="card stack">
          <h2>Aesthetics & Theme</h2>
          <p className="small muted">
            Customize the look and feel of your scribe pad. All themes adapt to your screen's layout.
          </p>
          <div className="tiles" style={{ marginTop: '0.5rem' }}>
            <button className={`tile ${s.theme === 'gold' ? 'active' : ''}`} onClick={() => set('theme', 'gold')}>
              <span className="t-rune" style={{ color: '#dcae5b' }}>ᚠᚢᚦᚩᚱᚳ</span>
              <h3>Runic Gold</h3>
              <p>Deep charcoal-black with rich gold accents.</p>
            </button>
            <button className={`tile ${s.theme === 'frost' ? 'active' : ''}`} onClick={() => set('theme', 'frost')}>
              <span className="t-rune" style={{ color: '#38bdf8' }}>ᚠᚢᚦᚩᚱᚳ</span>
              <h3>Nordic Frost</h3>
              <p>Deep ocean navy with bright ice-blue accents.</p>
            </button>
            <button className={`tile ${s.theme === 'obsidian' ? 'active' : ''}`} onClick={() => set('theme', 'obsidian')}>
              <span className="t-rune" style={{ color: '#a855f7' }}>ᚠᚢᚦᚩᚱᚳ</span>
              <h3>Obsidian Night</h3>
              <p>Jet black with vibrant neon purple accents.</p>
            </button>
            <button className={`tile ${s.theme === 'paper' ? 'active' : ''}`} onClick={() => set('theme', 'paper')}>
              <span className="t-rune" style={{ color: '#9e3b2c' }}>ᚠᚢᚦᚩᚱᚳ</span>
              <h3>Classic Paper</h3>
              <p>Traditional cream paper with rich red accents.</p>
            </button>
          </div>
        </section>
      )}

      {tab === 'backup' && (
        <DriveSection state={state} update={update} account={driveAccount} setAccount={setDriveAccount} />
      )}

      {tab === 'progress' && (
        <section className="card stack">
          <h2>Progress & Data</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Units finished: {state.completedUnits.length} · runes tracked: {Object.keys(state.strength).length} ·
            dictionary: {LEXICON_SIZE} words.{' '}
            {driveAccount
              ? 'Kept in this browser and backed up to your Google Drive.'
              : 'Kept in this browser only - connect Google Drive in the Backup tab to enable backups.'}
          </p>
          <div>
            <button
              className="btn"
              onClick={() => { if (confirm('Erase all progress and settings?')) { reset(); location.reload(); } }}
            >Reset everything</button>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Google Drive backup ────────────────────────────────────────────────────
function DriveSection({ state, update, account, setAccount }) {
  const [configured, setConfigured] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(null);
  const [clientIdInput, setClientIdInput] = useState('');

  useEffect(() => {
    drive.isConfigured().then(setConfigured);
  }, []);

  const applyState = (next) => update((st) => { Object.assign(st, next); });

  const run = async (fn) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const connect = () => run(async () => {
    await drive.authorise();
    setAccount(drive.currentAccount());
    const result = await drive.sync(state, applyState);
    if (result.action === 'conflict') {
      setConflict(result.backup);
      setMessage('');
    } else {
      setMessage({
        push: 'Backed up to Drive',
        pull: `Restored from Drive - ${result.reason}`,
        none: 'Already up to date',
      }[result.action] ?? result.reason);
    }
  });

  const backupNow = () => run(async () => {
    await drive.authorise();
    await drive.backupNow(state);
    setMessage('Backed up to Drive');
  });

  const keepBoth = () => run(async () => {
    await drive.resolveByMerging(state, conflict, applyState);
    setConflict(null);
    setMessage('Kept the best of both');
  });

  const undo = () => {
    const previous = drive.rollback();
    if (previous) {
      applyState(fromBackup(previous, state));
      setMessage('Put back how it was');
    }
  };

  return (
    <section className="card stack">
      <h2>Google Drive backup</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Keeps your progress in a hidden folder in your Drive, so it follows you to
        another device or the phone app. This app can only see that one folder -
        not the rest of your Drive.
      </p>

      {configured === false && (
        <div className="stack" style={{ gap: '0.4rem' }}>
          <p className="small" style={{ margin: 0 }}>
            Not set up yet. Set <code>GOOGLE_CLIENT_ID</code> in your{' '}
            <code>.env</code> and restart, or paste the client ID here.
          </p>
          <div className="row">
            <input
              type="text"
              className="grow"
              placeholder="…apps.googleusercontent.com"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              spellCheck="false"
            />
            <button
              className="btn"
              disabled={!clientIdInput.trim()}
              onClick={() => {
                drive.setClientId(clientIdInput);
                drive.isConfigured().then(setConfigured);
              }}
            >Save</button>
          </div>
        </div>
      )}

      {account && (
        <p className="small" style={{ margin: 0 }}>
          Signed in as <strong>{account.email ?? account.name}</strong>
        </p>
      )}

      <div className="row">
        <button className="btn primary" disabled={busy || configured === false} onClick={connect}>
          {drive.isSignedIn() ? 'Sync now' : 'Connect Google Drive'}
        </button>
        {drive.isSignedIn() && (
          <>
            <button className="btn" disabled={busy} onClick={backupNow}>Back up now</button>
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => { drive.signOut(); setAccount(null); setMessage('Disconnected'); }}
            >Disconnect</button>
          </>
        )}
        {drive.rollbackAvailable() && (
          <button className="btn ghost" disabled={busy} onClick={undo}>Undo last restore</button>
        )}
      </div>

      {message && <p className="small muted" style={{ margin: 0 }}>{message}</p>}

      {conflict && (
        <div className="feedback no">
          <strong>Which copy should win?</strong>
          <p className="small" style={{ margin: '0.4rem 0' }}>
            The backup in Drive is newer, but has less progress than this device.
            That usually means another device was opened without being used.
            Keeping the best of both is the safe option.
          </p>
          <div className="row">
            <button className="btn primary small" onClick={keepBoth}>Keep the best of both</button>
            <button className="btn small" onClick={() => setConflict(null)}>Leave it alone</button>
          </div>
        </div>
      )}
    </section>
  );
}
