// Who you are, as far as this app is concerned.
//
// There is deliberately no account system here. There used to be one - usernames,
// passwords hashed with a single unsalted round of SHA-256, and a POST of the whole
// account table to an unauthenticated /api/db endpoint that would hand the same table
// back to anyone who asked for it. Running that was strictly worse than running
// nothing, so it's gone.
//
// Your identity is your Google account, and it never leaves the browser except to
// talk to Google. Your progress lives in this browser and, if you connect Drive, in
// the hidden per-app folder of your own Drive that no other app can read. There is no
// server-side user record anywhere, so there is nothing to leak.

import * as drive from './drive.js';

/**
 * The signed-in Google account, or null.
 * Shape: { email, name, picture } - whatever Google's userinfo returned.
 */
export function currentUser() {
  return drive.isSignedIn() ? drive.currentAccount() : null;
}

/** A short label for the header button. */
export function displayName(user) {
  if (!user) return '';
  if (user.name) return user.name.split(' ')[0];
  if (user.email) return user.email.split('@')[0];
  return 'Signed in';
}

/** Sign in with Google. Resolves to the account, or throws with a real message. */
export async function signIn() {
  await drive.authorise();
  return currentUser();
}

/**
 * Try to pick up an existing session without showing a popup.
 * Safe to call on page load - returns null rather than throwing if there's no
 * session, no client ID configured, or Google is unreachable.
 */
export async function resumeQuietly() {
  try {
    if (!(await drive.isConfigured())) return null;
    await drive.authorise({ interactive: false });
    return currentUser();
  } catch {
    return null;
  }
}

export function signOut() {
  drive.signOut();
}
