// Client-side Authentication & Secure Account Management

const ACCOUNTS_KEY = 'futhorc.accounts.v1';
const SESSION_KEY = 'futhorc.session.v1';

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    if (typeof window !== 'undefined' && window.fetch) {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      }).catch(() => {});
    }
  } catch { /* private mode */ }
}

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(session) {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* private mode */ }
}

export async function registerUser({ username, email, password, profileData }) {
  const accounts = getAccounts();
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanUsername) throw new Error('Username is required.');
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters long.');

  if (accounts.some((a) => a.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error('Username is already taken.');
  }
  if (cleanEmail && accounts.some((a) => a.email && a.email.toLowerCase() === cleanEmail)) {
    throw new Error('Email is already registered.');
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
    profile: profileData || {
      name: cleanUsername,
      birthday: '',
      hometown: '',
      address: '',
      job: '',
      mother: '',
      father: '',
      partner: '',
      children: '',
      petNames: '',
      favoriteFood: '',
      favoriteColor: '',
      hobby: '',
    },
    progress: {
      completedUnits: [],
      strength: {},
      sessionCount: 0,
      xp: 0,
      streak: 1,
      bestStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      completedDailyTasks: [],
    },
  };

  accounts.push(newUser);
  saveAccounts(accounts);
  setActiveSession({ userId: newUser.id, username: newUser.username });
  return newUser;
}

export async function loginUser(usernameOrEmail, password) {
  const accounts = getAccounts();
  const query = usernameOrEmail.trim().toLowerCase();
  const user = accounts.find(
    (a) => a.username.toLowerCase() === query || (a.email && a.email.toLowerCase() === query)
  );

  if (!user) {
    throw new Error('No account found with that username or email.');
  }

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error('Incorrect password.');
  }

  setActiveSession({ userId: user.id, username: user.username });
  return user;
}

export function logoutUser() {
  setActiveSession(null);
}

export function getCurrentUser() {
  const session = getActiveSession();
  if (!session) return null;
  const accounts = getAccounts();
  return accounts.find((a) => a.id === session.userId) || null;
}

export function updateCurrentUser(fn) {
  const session = getActiveSession();
  if (!session) return null;
  const accounts = getAccounts();
  const idx = accounts.findIndex((a) => a.id === session.userId);
  if (idx !== -1) {
    fn(accounts[idx]);
    saveAccounts(accounts);
    return accounts[idx];
  }
  return null;
}
