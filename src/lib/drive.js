/*
 * Google Drive backup, for the web app.
 *
 * The backup lives in Drive's *application data folder* - a hidden per-app
 * area that doesn't show up in your Drive and that no other app can read. The
 * only scope we ask for beyond signing in is `drive.appdata`, which grants
 * access to that folder and nothing else: this app cannot see your documents.
 *
 * Nothing secret lives in here. The OAuth client ID is public by design (it
 * identifies the app, it doesn't authorise anything on its own), and the
 * access token stays in memory - never localStorage - so it's gone when the
 * tab closes.
 *
 * Setup: see docs/google-drive-setup.md.
 */

import { BACKUP_FILENAME, SYNC_SCHEMA, decide, merge, toBackup, fromBackup } from './syncFormat.js';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/*
 * Where the OAuth client ID comes from, in order of preference:
 *
 *   1. /api/config - the server reads it from its environment on every
 *      request. This is the one that matters for the Docker deployment:
 *      Vite inlines import.meta.env at *build* time, so a value set in
 *      docker-compose would otherwise never reach an already-built image.
 *      Reading it at runtime means changing docker-compose and restarting is
 *      enough - no rebuild, and the same image works anywhere.
 *   2. localStorage - pasted into Settings, handy for a quick try.
 *   3. import.meta.env - baked in at build time, for a plain `npm run build`.
 */
let clientIdPromise = null;

export function resolveClientId() {
  clientIdPromise ??= (async () => {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.googleClientId) return cfg.googleClientId;
      }
    } catch {
      // No server (dev against a static build, say) - fall through.
    }
    try {
      const stored = localStorage.getItem('futhorc.googleClientId');
      if (stored) return stored.trim();
    } catch { /* private mode */ }
    return import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
  })();
  return clientIdPromise;
}

export function setClientId(id) {
  try {
    localStorage.setItem('futhorc.googleClientId', (id ?? '').trim());
  } catch { /* private mode */ }
  clientIdPromise = null;   // re-resolve next time
}

export const isConfigured = async () => Boolean(await resolveClientId());

let scriptPromise = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Couldn't load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// The token itself is in memory only, deliberately - it is a bearer credential
// with a one-hour life and there is no reason for it to survive a reload.
let token = null;
let tokenExpiry = 0;
let account = null;

/**
 * What *does* persist is the fact that you connected, and which account.
 *
 * Google can hand back a fresh token without a popup, but only if we ask; and
 * asking every visitor on the off-chance is both wasteful and slightly rude.
 * This flag is the difference between "resume the session you already had" and
 * "pester a stranger". It is not a credential and grants nothing on its own.
 */
const CONNECTED_KEY = 'futhorc.drive.connected.v1';

export function wasConnected() {
  try { return JSON.parse(localStorage.getItem(CONNECTED_KEY)) || null; }
  catch { return null; }
}

function rememberConnection(acct) {
  try {
    localStorage.setItem(CONNECTED_KEY, JSON.stringify({
      email: acct?.email ?? null,
      name: acct?.name ?? null,
      picture: acct?.picture ?? null,
      at: new Date().toISOString(),
    }));
  } catch { /* private mode */ }
}

function forgetConnection() {
  try { localStorage.removeItem(CONNECTED_KEY); } catch { /* ignore */ }
}

export const currentAccount = () => account ?? wasConnected();
export const isSignedIn = () => Boolean(token) && Date.now() < tokenExpiry;

/**
 * Ask for an access token.
 *
 * @param {boolean} interactive show the Google consent/chooser. Pass false to
 *        try silently - used on page load so an already-signed-in user isn't
 *        nagged with a popup.
 */
export async function authorise({ interactive = true } = {}) {
  const clientId = await resolveClientId();
  if (!clientId) {
    throw new Error(
      'No Google client ID. Set GOOGLE_CLIENT_ID in docker-compose, or paste ' +
      'the ID into Settings.'
    );
  }
  if (isSignedIn()) return token;

  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      prompt: interactive ? '' : 'none',
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        token = response.access_token;
        // Tokens are short-lived; keep a minute in hand.
        tokenExpiry = Date.now() + (Number(response.expires_in ?? 3600) - 60) * 1000;
        try {
          account = await fetchAccount();
        } catch {
          account = null;
        }
        rememberConnection(account);
        resolve(token);
      },
      error_callback: (err) => reject(new Error(err?.message ?? 'Sign-in was cancelled')),
    });
    client.requestAccessToken();
  });
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token); } catch { /* best effort */ }
  }
  token = null;
  tokenExpiry = 0;
  account = null;
  forgetConnection();
  stopAutoBackup();
}

async function fetchAccount() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Could not read the account details');
  const j = await res.json();
  return { name: j.name, email: j.email, picture: j.picture };
}

function headers(extra = {}) {
  if (!isSignedIn()) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}`, ...extra };
}

// ── Drive ──────────────────────────────────────────────────────────────────

/** The backup file's id, or null if there isn't one yet. */
async function findFile() {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${BACKUP_FILENAME}' and trashed = false`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: '1',
  });
  const res = await fetch(`${DRIVE}/files?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`Drive listing failed (${res.status})`);
  const j = await res.json();
  return j.files?.[0]?.id ?? null;
}

/** Read the backup, or null if there isn't one. */
export async function download() {
  const id = await findFile();
  if (!id) return null;
  const res = await fetch(`${DRIVE}/files/${id}?alt=media`, { headers: headers() });
  if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
  return res.json();
}

/** Write the backup, creating the file the first time. */
export async function upload(backup) {
  const id = await findFile();
  const body = JSON.stringify(backup);

  if (id) {
    const res = await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body,
    });
    if (!res.ok) throw new Error(`Drive upload failed (${res.status})`);
    return;
  }

  // First time: multipart, so the metadata puts it in the app data folder.
  const boundary = 'futhorc-' + Math.random().toString(36).slice(2);
  const metadata = { name: BACKUP_FILENAME, parents: ['appDataFolder'] };
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: headers({ 'Content-Type': `multipart/related; boundary=${boundary}` }),
    body: multipart,
  });
  if (!res.ok) throw new Error(`Drive upload failed (${res.status})`);
}

// ── Syncing ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = 'futhorc.lastSync';
const ROLLBACK_KEY = 'futhorc.beforeRestore';

const lastSynced = () => {
  try { return JSON.parse(localStorage.getItem(LAST_SYNC_KEY)) ?? null; } catch { return null; }
};
const rememberSync = (backup) => {
  try { localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ updatedAt: backup.updatedAt })); }
  catch { /* private mode */ }
};

/** The copy replaced by the last restore, so a bad pull can be undone. */
export const rollbackAvailable = () => Boolean(localStorage.getItem(ROLLBACK_KEY));
export function rollback() {
  const raw = localStorage.getItem(ROLLBACK_KEY);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Bring this device and Drive into line.
 *
 * Newest wins, with one exception: if the backup is newer but has *less*
 * progress than this device, that's reported rather than applied, because
 * finishing a unit never un-happens and a stale device being opened shouldn't
 * be able to wipe the one you've been using.
 *
 * @param {object} state current local state
 * @param {(next:object)=>void} applyState called if we pull
 * @returns {Promise<{action:string, reason:string, backup?:object}>}
 */
export async function sync(state, applyState) {
  const local = { ...toBackup(state), updatedAt: lastSynced()?.updatedAt ?? new Date().toISOString() };
  const localNow = toBackup(state);
  const remote = await download();

  const verdict = decide({ ...localNow, updatedAt: local.updatedAt }, remote);

  switch (verdict.action) {
    case 'push':
      await upload(localNow);
      rememberSync(localNow);
      return { action: 'push', reason: verdict.reason };

    case 'pull': {
      try { localStorage.setItem(ROLLBACK_KEY, JSON.stringify(localNow)); } catch { /* ignore */ }
      applyState(fromBackup(remote, state));
      rememberSync(remote);
      return { action: 'pull', reason: verdict.reason, backup: remote };
    }

    case 'conflict':
      return { action: 'conflict', reason: verdict.reason, backup: remote };

    default:
      return { action: 'none', reason: verdict.reason };
  }
}

/** Resolve a conflict by keeping the best of both, then saving that. */
export async function resolveByMerging(state, remote, applyState) {
  const merged = merge(toBackup(state), remote);
  applyState(fromBackup(merged, state));
  await upload(merged);
  rememberSync(merged);
  return merged;
}

/** Push regardless, for a "back up now" button. */
export async function backupNow(state) {
  const backup = toBackup(state);
  await upload(backup);
  rememberSync(backup);
  return backup;
}

// ── Automatic backup ───────────────────────────────────────────────────────

/**
 * Back up quietly in the background once connected.
 *
 * Three triggers, because any one of them alone misses the case that matters:
 *
 *   * every [intervalMs] during a long session
 *   * when the tab is hidden - closing a laptop lid or switching apps is the
 *     most common way a session ends, and it fires reliably where 'unload'
 *     does not
 *   * on 'pagehide', for an actual close
 *
 * Uploads are skipped when nothing has changed since the last one, so a tab
 * left open overnight doesn't rewrite the same file sixty times.
 */
let autoTimer = null;
let autoHandlers = null;
let lastPushed = null;

const AUTO_INTERVAL_MS = 5 * 60 * 1000;

export function startAutoBackup(getState, { intervalMs = AUTO_INTERVAL_MS } = {}) {
  stopAutoBackup();

  const attempt = async () => {
    if (!isSignedIn()) return;
    let backup;
    try {
      backup = toBackup(getState());
    } catch {
      return;
    }
    // Compare everything except the timestamp, which always differs.
    const { updatedAt, ...body } = backup;
    const fingerprint = JSON.stringify(body);
    if (fingerprint === lastPushed) return;
    try {
      await upload(backup);
      rememberSync(backup);
      lastPushed = fingerprint;
    } catch { /* offline, or the token lapsed; the next trigger will retry */ }
  };

  autoTimer = setInterval(attempt, intervalMs);
  const onHide = () => { if (document.visibilityState === 'hidden') attempt(); };
  const onPageHide = () => attempt();
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);
  autoHandlers = { onHide, onPageHide };
  return attempt;
}

export function stopAutoBackup() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  if (autoHandlers) {
    document.removeEventListener('visibilitychange', autoHandlers.onHide);
    window.removeEventListener('pagehide', autoHandlers.onPageHide);
  }
  autoHandlers = null;
  lastPushed = null;
}

export { SYNC_SCHEMA };
