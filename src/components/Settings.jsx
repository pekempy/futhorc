import { useEffect, useState } from 'react';
import { listVoices, isSupported, speakRunes, fetchSystemApiKey } from '../lib/speech.js';
import { reset } from '../lib/progress.js';
import { LEXICON_SIZE } from '../data/lexicon.js';
import * as drive from '../lib/drive.js';
import { fromBackup } from '../lib/syncFormat.js';

const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

// SVG Icons matching a clean, non-emoji design
const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const VolumeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.32832 19.4795 6.00287 19.7892 6.70287 19.7892C7.30009 19.7892 7.78502 19.3043 7.78502 18.7071C7.78502 18.232 7.59374 17.7981 7.28475 17.4813C6.7072 16.8906 6.34783 16.0881 6.34783 15.2029C6.34783 13.4339 7.78174 12 9.55072 12H11.5" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor"/>
    <circle cx="11.5" cy="7.5" r="1" fill="currentColor"/>
    <circle cx="16.5" cy="9.5" r="1" fill="currentColor"/>
    <circle cx="15.5" cy="14.5" r="1" fill="currentColor"/>
  </svg>
);

const CloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '0.25rem' }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function Settings({ state, update }) {
  const [tab, setTab] = useState('menu');
  const [voices, setVoices] = useState([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState(1);
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
      <div className="spread">
        <div>
          <span className="page-header-runes rune">ᛋᛖᛏᛁᛝᛋ</span>
          <h1>Settings</h1>
        </div>
        {tab !== 'menu' && (
          <button className="btn ghost" onClick={() => setTab('menu')} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center' }}>
            <ChevronLeftIcon /> Back to Settings
          </button>
        )}
      </div>

      {tab === 'menu' && (
        <div className="stack" style={{ gap: '0.75rem' }}>
          <button className="tile" onClick={() => setTab('spelling')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', border: '1px solid var(--line)', transition: 'transform 0.12s' }}>
            <ListIcon />
            <div className="grow" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0 }}>Spelling Settings</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-2)' }}>Configure ligatures, voiceless endings, and punctuation options</p>
            </div>
            <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}><ChevronRightIcon /></span>
          </button>
          
          <button className="tile" onClick={() => setTab('audio')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', border: '1px solid var(--line)', transition: 'transform 0.12s' }}>
            <VolumeIcon />
            <div className="grow" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0 }}>Speech & Audio</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-2)' }}>Customize reading aloud speed, voices, and Gemini AI key</p>
            </div>
            <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}><ChevronRightIcon /></span>
          </button>

          <button className="tile" onClick={() => setTab('theme')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', border: '1px solid var(--line)', transition: 'transform 0.12s' }}>
            <PaletteIcon />
            <div className="grow" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0 }}>Aesthetics & Theme</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-2)' }}>Choose color themes like Runic Gold, Frost, and Obsidian</p>
            </div>
            <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}><ChevronRightIcon /></span>
          </button>

          <button className="tile" onClick={() => setTab('backup')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', border: '1px solid var(--line)', transition: 'transform 0.12s' }}>
            <CloudIcon />
            <div className="grow" style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0 }}>Backup, Sync & Progress</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-2)' }}>Connect Google Drive, view learning stats, or reset progress</p>
            </div>
            <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}><ChevronRightIcon /></span>
          </button>
        </div>
      )}

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
        <>
          <section className="card stack">
            <h2>Progress Statistics</h2>
            <div className="stack" style={{ gap: '0.5rem' }}>
              <div className="spread">
                <span className="small">Units finished</span>
                <strong className="small">{state.completedUnits.length}</strong>
              </div>
              <div className="spread">
                <span className="small">Runes tracked</span>
                <strong className="small">{Object.keys(state.strength).length}</strong>
              </div>
              <div className="spread">
                <span className="small">Dictionary size</span>
                <strong className="small">{LEXICON_SIZE} words</strong>
              </div>
            </div>
          </section>

          <DriveSection state={state} update={update} account={driveAccount} setAccount={setDriveAccount} />

          <section className="card stack">
            <h2>Reset Progress</h2>
            <p className="small muted" style={{ margin: 0 }}>
              This will erase all progress, tracked runes, and settings on this device.
            </p>
            <div>
              <button
                className="btn"
                style={{ color: 'var(--bad)', borderColor: 'var(--bad)', background: 'transparent' }}
                onClick={() => { setShowResetDialog(true); setResetStep(1); }}
              >Reset everything</button>
            </div>
          </section>
        </>
      )}

      {showResetDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.25rem', backdropFilter: 'blur(4px)'
        }}>
          <div className="card stack" style={{ maxWidth: '400px', width: '100%', border: '2px solid var(--accent)' }}>
            {resetStep === 1 ? (
              <>
                <h2>Reset Progress?</h2>
                <p className="small muted">
                  This will erase all progress, tracked runes, and settings on this device. This action cannot be undone.
                </p>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem', gap: '0.75rem' }}>
                  <button className="btn ghost" onClick={() => setShowResetDialog(false)}>Cancel</button>
                  <button className="btn primary" style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: 'var(--btn-primary-text)' }} onClick={() => setResetStep(2)}>
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Are you absolutely sure?</h2>
                <p className="small muted">
                  Confirm your choice using the runic buttons below to proceed.
                </p>
                <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn primary rune" style={{ fontSize: '1.5rem', background: 'var(--bad)', borderColor: 'var(--bad)', color: 'var(--btn-primary-text)', padding: '0.5rem' }} onClick={() => { reset(); location.reload(); }}>
                    ᛄᛖᛋᛋ
                  </button>
                  <button className="btn rune" style={{ fontSize: '1.5rem', padding: '0.5rem' }} onClick={() => setShowResetDialog(false)}>
                    ᚾᚩ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
