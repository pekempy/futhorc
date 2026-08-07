// Progress and settings, kept in this browser only.

const KEY = 'futhorc.v1';

const BLANK = {
  completedUnits: [],
  // per-rune recall strength, for the practice queue
  strength: {},          // { 'ᚠ': { seen, right, wrong, due } }
  settings: {
    ligatures: true,
    markVoiceless: true,
    separator: 'interpunct',
    voiceName: '',
    geminiKey: '',
    useGemini: false,
    speakRate: 0.85,
  },
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(BLANK);
    const p = JSON.parse(raw);
    return { ...structuredClone(BLANK), ...p, settings: { ...BLANK.settings, ...(p.settings || {}) } };
  } catch {
    return structuredClone(BLANK);
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Leitner-ish scheduling: right answers push a rune further into the future. */
export function recordAnswer(state, rune, right) {
  const s = state.strength[rune] || { seen: 0, right: 0, wrong: 0, box: 0, due: 0 };
  s.seen += 1;
  if (right) { s.right += 1; s.box = Math.min(5, s.box + 1); }
  else { s.wrong += 1; s.box = 0; }
  const gaps = [0, 1, 3, 7, 16, 40]; // in "sessions", not days — keeps it simple
  s.due = (state.sessionCount || 0) + gaps[s.box];
  state.strength[rune] = s;
  return state;
}

/** Runes sorted by how much they need practice. */
export function practiceOrder(state, pool) {
  const session = state.sessionCount || 0;
  return [...pool].sort((a, b) => {
    const sa = state.strength[a] || { box: -1, due: -1, seen: 0 };
    const sb = state.strength[b] || { box: -1, due: -1, seen: 0 };
    if (sa.seen === 0 && sb.seen !== 0) return -1;
    if (sb.seen === 0 && sa.seen !== 0) return 1;
    const oa = session - (sa.due ?? 0);
    const ob = session - (sb.due ?? 0);
    if (oa !== ob) return ob - oa;
    return (sa.box ?? 0) - (sb.box ?? 0);
  });
}

export function accuracy(state) {
  let right = 0, seen = 0;
  for (const s of Object.values(state.strength)) { right += s.right; seen += s.seen; }
  return seen ? Math.round((right / seen) * 100) : null;
}

export function learnedCount(state) {
  return Object.values(state.strength).filter((s) => s.box >= 3).length;
}
