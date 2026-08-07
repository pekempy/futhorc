// Progress and settings, kept in this browser only.

const KEY = 'futhorc.v1';

// Words to personalise worksheets with. Blank by default — the old version
// shipped a fake identity as placeholder text, which encouraged filling in the
// real one. Dates of birth, addresses and parents' names are gone entirely:
// they were worth nothing to a worksheet and a great deal to anyone who got
// hold of them.
export const DEFAULT_PROFILE = {
  name: '',
  people: '',
  places: '',
  likes: '',
  job: '',
  hobby: '',
};

const BLANK = {
  completedUnits: [],
  // per-rune recall strength, for the practice queue
  strength: {},          // { 'ᚠ': { seen, right, wrong, due } }
  sessionCount: 0,
  xp: 0,
  streak: 1,
  bestStreak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  completedDailyTasks: [],
  profile: structuredClone(DEFAULT_PROFILE),
  accounts: [
    { id: 'default', name: 'Primary Account', active: true }
  ],
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
    const loaded = {
      ...structuredClone(BLANK),
      ...p,
      profile: { ...structuredClone(DEFAULT_PROFILE), ...(p.profile || {}) },
      settings: { ...BLANK.settings, ...(p.settings || {}) }
    };
    return checkDailyStreak(loaded);
  } catch {
    return structuredClone(BLANK);
  }
}

// Local only. This used to also POST every save to /api/db, an endpoint that
// would then serve the whole database back to anyone who asked; both are gone.
// Cross-device sync is Drive's job — see lib/drive.js.
export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* private mode */ }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export const RANKS = [
  { minXp: 0, title: 'Novice Scribe', badge: '🌱' },
  { minXp: 150, title: 'Rune Student', badge: '📜' },
  { minXp: 400, title: 'Rune Craftsman', badge: '⚒️' },
  { minXp: 800, title: 'Rune Scholar', badge: 'ᚠ' },
  { minXp: 1500, title: 'Master Runesmith', badge: 'ᛏ' },
  { minXp: 3000, title: 'High Skald', badge: '👑' },
];

export function getRank(xp = 0) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  return rank;
}

export function checkDailyStreak(state) {
  const today = new Date().toISOString().split('T')[0];
  if (state.lastActiveDate === today) return state;

  const lastDate = state.lastActiveDate ? new Date(state.lastActiveDate) : null;
  const currDate = new Date(today);
  const diffDays = lastDate ? Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24)) : 0;

  if (diffDays === 1) {
    state.streak = (state.streak || 0) + 1;
    state.bestStreak = Math.max(state.bestStreak || 1, state.streak);
  } else if (diffDays > 1) {
    state.streak = 1;
  }

  state.lastActiveDate = today;
  state.completedDailyTasks = [];
  return state;
}

export function addXP(state, amount) {
  state.xp = (state.xp || 0) + amount;
  return state;
}

/** Leitner-ish scheduling: right answers push a rune further into the future. */
export function recordAnswer(state, rune, right) {
  const s = state.strength[rune] || { seen: 0, right: 0, wrong: 0, box: 0, due: 0 };
  s.seen += 1;
  if (right) { s.right += 1; s.box = Math.min(5, s.box + 1); }
  else { s.wrong += 1; s.box = 0; }
  const gaps = [0, 1, 3, 7, 16, 40]; // in "sessions", not days - keeps it simple
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
