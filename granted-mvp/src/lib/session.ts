import Cookies from "js-cookie";
import { v4 as uuid } from "uuid";

const SESSION_COOKIE = "granted_session_id";
const TTL_DAYS = 30;

function persist(sessionId: string) {
  Cookies.set(SESSION_COOKIE, sessionId, { expires: TTL_DAYS, sameSite: "lax", path: "/" });

  try {
    window.localStorage.setItem(SESSION_COOKIE, sessionId);
  } catch {
    // localStorage may be unavailable (e.g., Safari private mode).
  }
}

export function getOrCreateSessionId(preferredId?: string): string {
  let sessionId = preferredId?.trim() || Cookies.get(SESSION_COOKIE);
  if (!sessionId) {
    sessionId = uuid();
  }
  persist(sessionId);
  return sessionId;
}

export function getStoredSessionId(): string | null {
  return Cookies.get(SESSION_COOKIE) ?? null;
}
