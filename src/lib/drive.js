/*
 * Google Drive backup, for the web app.
 *
 * The backup lives in Drive's *application data folder* — a hidden per-app
 * area that doesn't show up in your Drive and that no other app can read. The
 * only scope we ask for beyond signing in is `drive.appdata`, which grants
 * access to that folder and nothing else: this app cannot see your documents.
 *
 * Nothing secret lives in here. The OAuth client ID is public by design (it
 * identifies the app, it doesn't authorise anything on its own), and the
 * access token stays in memory — never localStorage — so it's gone when the
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

/** Set at build time, or pasted into Settings if you'd rather not rebuild. */
export const CLIENT_ID =
  import.meta.env?.VITE_GOOGLE_CLIENT_ID ||
  localStorage.getItem('futhorc.googleClientId') ||
  '';

export function setClientId(id) {
  localStorage.setItem('futhorc.googleClientId', (id ?? '').trim());
}

export const isConfigured = () => Boolean(CLIENT_ID);

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

// In memory only, deliberately.
let token = null;
let tokenExpiry = 0;
let account = null;

export const currentAccount = () => account;
export const isSignedIn = () => Boolean(token) && Date.now() < tokenExpiry;

/**
 * Ask for an access token.
 *
 * @param {boolean} interactive show the Google consent/chooser. Pass false to
 *        try silently — used on page load so an already-signed-in user isn't
 *        nagged with a popup.
 */
export function authorise({ interactive = true } = {}) {
  if (!CLIENT_ID) return Promise.reject(new Error('No Google client ID set'));
  if (isSignedIn()) return Promise.resolve(token);

  return loadGis().then(() => new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
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
        resolve(token);
      },
      error_callback: (err) => reject(new Error(err?.message ?? 'Sign-in was cancelled')),
    });
    client.requestAccessToken();
  }));
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token); } catch { /* best effort */ }
  }
  token = null;
  tokenExpiry = 0;
  account = null;
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

export { SYNC_SCHEMA };
