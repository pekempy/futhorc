/*
 * The shape of a backup, shared by the web app and the Android app.
 *
 * One file lives in your Google Drive application data folder - a hidden,
 * per-app area that doesn't appear in your Drive and that only this app can
 * read. Both apps write the same envelope so either can restore the other's
 * backup.
 *
 * The Kotlin in the Android project mirrors this; if you change the schema,
 * change both and bump SYNC_SCHEMA.
 */

export const SYNC_SCHEMA = 1;
export const BACKUP_FILENAME = 'futhorc-progress.json';

/** Wrap local state in the envelope that goes to Drive. */
export function toBackup(state, { device = 'web' } = {}) {
  return {
    schema: SYNC_SCHEMA,
    updatedAt: new Date().toISOString(),
    device,
    // Everything worth carrying between devices. Deliberately not the whole
    // settings object: voice choice and API keys are per-device business.
    progress: {
      completedUnits: state.completedUnits ?? [],
      strength: state.strength ?? {},
      runeDrawing: state.runeDrawing ?? {},
      sessionCount: state.sessionCount ?? 0,
      xp: state.xp ?? 0,
      streak: state.streak ?? 1,
      bestStreak: state.bestStreak ?? 1,
      lastActiveDate: state.lastActiveDate ?? null,
      completedDailyTasks: state.completedDailyTasks ?? [],
      profile: state.profile ?? {},
    },
    // Preferences that genuinely should follow you around.
    settings: {
      ligatures: state.settings?.ligatures ?? true,
      markVoiceless: state.settings?.markVoiceless ?? true,
      separator: state.settings?.separator ?? 'interpunct',
    },
  };
}

/** Fold a backup from Drive back into local state. */
export function fromBackup(backup, current) {
  if (!backup || backup.schema !== SYNC_SCHEMA) return current;
  const p = backup.progress ?? {};
  return {
    ...current,
    completedUnits: p.completedUnits ?? current.completedUnits,
    strength: p.strength ?? current.strength,
    runeDrawing: p.runeDrawing ?? current.runeDrawing,
    sessionCount: p.sessionCount ?? current.sessionCount,
    xp: p.xp ?? current.xp,
    streak: p.streak ?? current.streak,
    bestStreak: p.bestStreak ?? current.bestStreak,
    lastActiveDate: p.lastActiveDate ?? current.lastActiveDate,
    completedDailyTasks: p.completedDailyTasks ?? current.completedDailyTasks,
    profile: { ...current.profile, ...(p.profile ?? {}) },
    settings: { ...current.settings, ...(backup.settings ?? {}) },
  };
}

/**
 * Which copy should win.
 *
 * Newest wins, as asked for. Two guards on top, because "newest" and "most
 * progress" are not always the same thing:
 *
 *  - clocks that are wrong. If the remote claims to be from the future by more
 *    than a day, don't trust it.
 *  - a remote that is newer but plainly emptier. Finishing a unit or earning XP
 *    never un-happens, so a backup with fewer completed units *and* less XP is
 *    almost certainly a stale device that has just been opened, and letting it
 *    overwrite would throw work away. That's reported as a conflict rather than
 *    silently resolved.
 *
 * @returns {{ action: 'pull'|'push'|'none'|'conflict', reason: string }}
 */
export function decide(local, remote, now = Date.now()) {
  if (!remote) return { action: 'push', reason: 'nothing backed up yet' };
  if (remote.schema !== SYNC_SCHEMA) {
    return { action: 'push', reason: 'the backup is from a different version' };
  }

  const localTime = Date.parse(local?.updatedAt ?? 0) || 0;
  const remoteTime = Date.parse(remote.updatedAt ?? 0) || 0;

  if (remoteTime > now + 86_400_000) {
    return { action: 'push', reason: "the backup's clock looks wrong" };
  }
  if (remoteTime === localTime) return { action: 'none', reason: 'already in step' };

  if (remoteTime > localTime) {
    if (looksEmptier(remote, local)) {
      return {
        action: 'conflict',
        reason: 'the backup is newer but has less progress than this device',
      };
    }
    return { action: 'pull', reason: 'the backup is newer' };
  }
  return { action: 'push', reason: 'this device is newer' };
}

function looksEmptier(candidate, against) {
  const a = candidate?.progress ?? {};
  const b = against?.progress ?? {};
  const fewerUnits = (a.completedUnits?.length ?? 0) < (b.completedUnits?.length ?? 0);
  const lessXp = (a.xp ?? 0) < (b.xp ?? 0);
  return fewerUnits && lessXp;
}

/**
 * Combine two backups, keeping the best of each.
 *
 * Used to resolve a conflict without anyone losing anything. Almost every
 * number here only ever goes up, so "the higher one" is nearly always right.
 */
export function merge(a, b) {
  const pa = a?.progress ?? {};
  const pb = b?.progress ?? {};
  const newer = (Date.parse(a?.updatedAt ?? 0) || 0) >= (Date.parse(b?.updatedAt ?? 0) || 0) ? a : b;

  return {
    schema: SYNC_SCHEMA,
    updatedAt: new Date().toISOString(),
    device: 'merged',
    progress: {
      completedUnits: [...new Set([...(pa.completedUnits ?? []), ...(pb.completedUnits ?? [])])]
        .sort((x, y) => x - y),
      strength: mergeStrength(pa.strength, pb.strength),
      runeDrawing: mergeDrawing(pa.runeDrawing, pb.runeDrawing),
      sessionCount: Math.max(pa.sessionCount ?? 0, pb.sessionCount ?? 0),
      xp: Math.max(pa.xp ?? 0, pb.xp ?? 0),
      streak: Math.max(pa.streak ?? 0, pb.streak ?? 0),
      bestStreak: Math.max(pa.bestStreak ?? 0, pb.bestStreak ?? 0),
      lastActiveDate: [pa.lastActiveDate, pb.lastActiveDate].filter(Boolean).sort().pop() ?? null,
      completedDailyTasks: [...new Set([
        ...(pa.completedDailyTasks ?? []), ...(pb.completedDailyTasks ?? []),
      ])],
      profile: { ...(pb.profile ?? {}), ...(pa.profile ?? {}) },
    },
    settings: newer?.settings ?? a?.settings ?? b?.settings ?? {},
  };
}

function mergeStrength(a = {}, b = {}) {
  const out = {};
  for (const rune of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[rune] ?? {};
    const y = b[rune] ?? {};
    out[rune] = {
      seen: Math.max(x.seen ?? 0, y.seen ?? 0),
      right: Math.max(x.right ?? 0, y.right ?? 0),
      wrong: Math.max(x.wrong ?? 0, y.wrong ?? 0),
      box: Math.max(x.box ?? 0, y.box ?? 0),
      due: Math.max(x.due ?? 0, y.due ?? 0),
    };
  }
  return out;
}

function mergeDrawing(a = {}, b = {}) {
  const out = {};
  for (const rune of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[rune] ?? {};
    const y = b[rune] ?? {};
    out[rune] = {
      bestDraw: Math.max(x.bestDraw ?? 0, y.bestDraw ?? 0),
      recentDraw: Math.max(x.recentDraw ?? 0, y.recentDraw ?? 0),
      drawAttempts: Math.max(x.drawAttempts ?? 0, y.drawAttempts ?? 0),
    };
  }
  return out;
}
