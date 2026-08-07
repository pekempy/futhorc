// Reading runes aloud.
//
// Free and offline by default: the browser's own SpeechSynthesis engine, using
// whichever British voice your OS provides. We can't hand it IPA (Web Speech
// has no reliable phoneme input), so we convert the runes into an English
// respelling that a British voice pronounces correctly.
//
// If you'd rather use Gemini's voices, paste an API key in Settings — it's
// stored in your browser only and never sent anywhere else.

import { runesToPhonemes } from './phonology.js';

/** Phoneme → letters that a British TTS voice will read the right way. */
const RESPELL = {
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g', 'ɡ': 'g',
  'tʃ': 'ch', 'dʒ': 'j', f: 'f', v: 'v', 'θ': 'th', 'ð': 'th',
  s: 's', z: 'z', 'ʃ': 'sh', 'ʒ': 'zh', h: 'h', m: 'm', n: 'n', 'ŋ': 'ng',
  l: 'l', r: 'r', j: 'y', w: 'w', ks: 'x',
  'ɪ': 'i', e: 'e', 'æ': 'a', 'ʌ': 'u', 'ə': 'a', 'ɒ': 'o', 'ʊ': 'oo', i: 'y',
  'iː': 'ee', 'ɛː': 'air', 'ɜː': 'ur', 'ɔː': 'aw', 'uː': 'oo', 'ɑː': 'ar',
  'eɪ': 'ay', 'aɪ': 'igh', 'ɔɪ': 'oy', 'əʊ': 'oh', 'aʊ': 'ow', 'ɪə': 'eer', 'ʊə': 'oor',
};

/** Turn a runic word into something a TTS voice will say correctly. */
export function respell(runicWord) {
  const ph = runesToPhonemes(runicWord);
  let out = '';
  ph.forEach((p, k) => {
    let s = RESPELL[p] ?? '';
    // A bare vowel at the end of a word often gets swallowed; pad it out.
    if (k === ph.length - 1 && s === 'a') s = 'uh';
    if (k === ph.length - 1 && s === 'i') s = 'ih';
    out += s;
  });
  return out || runicWord;
}

/** Respell a whole runic passage, keeping punctuation for the voice's phrasing. */
export function respellText(text) {
  return text
    .replace(/[᛫]/g, ' ')
    .replace(/[᛬᛭]/g, ',')
    .replace(/⁊/g, 'and')
    .replace(/\p{Script=Runic}+/gu, (m) => respell(m));
}

let cachedVoices = null;

export function listVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

/** Prefer a British voice, and a "natural"/"enhanced" one where the OS has it. */
export function pickVoice(preferredName) {
  const voices = listVoices();
  if (!voices.length) return null;
  if (preferredName) {
    const exact = voices.find((v) => v.name === preferredName);
    if (exact) return exact;
  }
  const gb = voices.filter((v) => /en[-_]GB/i.test(v.lang));
  const pool = gb.length ? gb : voices.filter((v) => /^en/i.test(v.lang));
  return (
    pool.find((v) => /natural/i.test(v.name)) ||
    pool.find((v) => /enhanced|premium|siri/i.test(v.name)) ||
    pool.find((v) => /google/i.test(v.name)) ||
    pool[0] ||
    voices[0]
  );
}

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Speak runic text aloud.
 * @param {string} runic
 * @param {{voiceName?:string, rate?:number, pitch?:number}} opts
 */
export function speakRunes(runic, opts = {}) {
  if (!isSupported()) return false;
  const text = respellText(runic);
  return speakPlain(text, opts);
}

export function speakPlain(text, opts = {}) {
  if (!isSupported()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(opts.voiceName);
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-GB'; }
  u.rate = opts.rate ?? 0.85;
  u.pitch = opts.pitch ?? 1;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (isSupported()) window.speechSynthesis.cancel();
}

// ── Optional: Gemini text-to-speech ────────────────────────────────────────
// Uses the key you paste in Settings. Falls back to the browser voice on any
// error, so the app keeps working without a key.

let audioEl = null;

export async function speakWithGemini(runic, apiKey, voiceName = 'Kore') {
  const text = respellText(runic);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: `Read this aloud in a British accent, clearly and slowly: ${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini TTS ${res.status}`);
  const json = await res.json();
  const b64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('No audio returned');
  const wav = pcmToWav(base64ToBytes(b64), 24000);
  const blobUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  if (audioEl) audioEl.pause();
  audioEl = new Audio(blobUrl);
  await audioEl.play();
  return true;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Gemini returns raw 16-bit PCM; wrap it in a WAV header so <audio> plays it. */
function pcmToWav(pcm, sampleRate) {
  const buf = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return buf;
}
