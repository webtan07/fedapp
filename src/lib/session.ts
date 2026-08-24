/**
 * Client-only user identity persistence for FED.
 *
 * WHY THIS EXISTS: the app previously tracked the current user via
 * `sessionStorage.getItem("fed_userId")`. On iOS Safari, sessionStorage is
 * per-tab and is NOT reliably preserved across navigation, tab-switching, or
 * opening links — so returning users lost their identity, the app thought they
 * had no plan, and they were dropped back to a re-quiz. localStorage persists
 * across tabs and sessions, so it is the primary store.
 *
 * Strategy:
 *  - WRITE to BOTH localStorage and sessionStorage. localStorage is what makes
 *    identity survive (across tabs / app restarts on iOS); sessionStorage is
 *    kept so pre-existing users and private-mode browsers still work.
 *  - READ from localStorage first, falling back to sessionStorage (migration for
 *    anyone who got an id under the old sessionStorage-only scheme).
 *  - Every read/write is wrapped in try/catch because browser storage can throw
 *    (e.g. private mode / storage disabled) — the app must degrade gracefully.
 */

export const USER_ID_KEY = "fed_userId";
export const EMAIL_KEY = "fed_email";

function readFrom(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeTo(storage: Storage | undefined, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / disabled) — ignore */
  }
}

function local(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function session(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** The current user's numeric id, or null when unknown. */
export function getUserId(): number | null {
  const raw = readFrom(local(), USER_ID_KEY) ?? readFrom(session(), USER_ID_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Persist the current user's id (both stores so it survives everywhere). */
export function setUserId(id: number): void {
  const value = String(id);
  writeTo(local(), USER_ID_KEY, value);
  writeTo(session(), USER_ID_KEY, value);
}

/** The current user's captured email, or null. */
export function getEmail(): string | null {
  return readFrom(local(), EMAIL_KEY) ?? readFrom(session(), EMAIL_KEY);
}

/** Persist the current user's captured email (both stores). */
export function setEmail(email: string): void {
  const value = email.trim().toLowerCase();
  writeTo(local(), EMAIL_KEY, value);
  writeTo(session(), EMAIL_KEY, value);
}

/** Forget the current user (e.g. on a hard reset). */
export function clearIdentity(): void {
  for (const storage of [local(), session()]) {
    if (!storage) continue;
    try {
      storage.removeItem(USER_ID_KEY);
      storage.removeItem(EMAIL_KEY);
    } catch {
      /* ignore */
    }
  }
}
