import { useState } from 'react';
import { load } from '../lib/progress.js';
import { isSupported, speakRunes, speakWithGemini } from '../lib/speech.js';

/** Speaks a runic string aloud. Free browser voice by default. */
export default function SpeakButton({ runic, label, plainFallback }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!isSupported()) return null;

  const play = async () => {
    setErr('');
    const s = load().settings;
    if (s.useGemini && s.geminiKey) {
      setBusy(true);
      try {
        await speakWithGemini(runic, s.geminiKey, s.geminiVoice || 'Kore');
        setBusy(false);
        return;
      } catch {
        setErr('Gemini failed — using the browser voice.');
      }
      setBusy(false);
    }
    speakRunes(runic, { voiceName: s.voiceName, rate: s.speakRate });
  };

  return (
    <span className="row" style={{ gap: '0.4rem' }}>
      <button className="btn small ghost" onClick={play} disabled={busy} title="Read aloud">
        {busy ? '…' : '🔊'} {label || 'Listen'}
      </button>
      {err && <span className="tiny muted">{err}</span>}
      {plainFallback && <span className="tiny muted">{plainFallback}</span>}
    </span>
  );
}
