import { useState, useEffect, useRef } from 'react';
import { load } from '../lib/progress.js';
import { isSupported, speakRunes, speakWithGemini, listVoices, fetchSystemApiKey } from '../lib/speech.js';

const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

/** Speaks a runic string aloud with instant voice selection dropdown. */
export default function SpeakButton({ runic, label, plainFallback }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [systemKey, setSystemKey] = useState('');
  const [voices, setVoices] = useState([]);
  const popoverRef = useRef(null);

  if (!isSupported()) return null;

  useEffect(() => {
    fetchSystemApiKey().then((k) => setSystemKey(k || ''));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      setVoices(listVoices());
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const s = load().settings;
  const activeGeminiKey = import.meta.env?.VITE_GEMINI_API_KEY || systemKey || s.geminiKey;

  const playWithVoice = async (voiceName, isGemini = false) => {
    setOpen(false);
    setBusy(true);
    try {
      if (isGemini && activeGeminiKey) {
        await speakWithGemini(runic, activeGeminiKey, voiceName);
      } else {
        speakRunes(runic, { voiceName, rate: s.speakRate });
      }
    } catch {
      speakRunes(runic, { voiceName: s.voiceName, rate: s.speakRate });
    } finally {
      setBusy(false);
    }
  };

  const playDefault = async () => {
    if (activeGeminiKey || (s.useGemini && s.geminiKey)) {
      await playWithVoice(s.geminiVoice || 'Kore', true);
    } else {
      speakRunes(runic, { voiceName: s.voiceName, rate: s.speakRate });
    }
  };

  return (
    <span className="row" style={{ gap: '0.15rem', position: 'relative', display: 'inline-flex', alignItems: 'center' }} ref={popoverRef}>
      <button className="btn small ghost" onClick={playDefault} disabled={busy} title="Read aloud">
        {busy ? '…' : '🔊'} {label || 'Listen'}
      </button>
      <button
        className="btn small ghost"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
        title="Select voice to read aloud"
      >
        ▼
      </button>

      {open && (
        <div
          className="card stack"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            marginTop: '0.3rem',
            minWidth: '190px',
            maxHeight: '230px',
            overflowY: 'auto',
            padding: '0.4rem',
            boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            fontSize: '0.82rem',
          }}
        >
          {activeGeminiKey && (
            <div>
              <div className="tiny muted" style={{ fontWeight: 600, padding: '0.2rem 0.4rem' }}>✨ Gemini Voices</div>
              {GEMINI_VOICES.map((v) => (
                <button
                  key={v}
                  className="btn ghost small"
                  style={{ width: '100%', textAlign: 'left', padding: '0.25rem 0.5rem' }}
                  onClick={() => playWithVoice(v, true)}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="tiny muted" style={{ fontWeight: 600, padding: '0.2rem 0.4rem', marginTop: activeGeminiKey ? '0.4rem' : 0 }}>
              🗣️ System Voices
            </div>
            {voices.length > 0 ? (
              voices.map((v) => (
                <button
                  key={v.name}
                  className="btn ghost small"
                  style={{ width: '100%', textAlign: 'left', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  onClick={() => playWithVoice(v.name, false)}
                >
                  {v.name}
                </button>
              ))
            ) : (
              <button
                className="btn ghost small"
                style={{ width: '100%', textAlign: 'left', padding: '0.25rem 0.5rem' }}
                onClick={() => playWithVoice(s.voiceName || '', false)}
              >
                Default System Voice
              </button>
            )}
          </div>
        </div>
      )}

      {plainFallback && <span className="tiny muted">{plainFallback}</span>}
    </span>
  );
}
