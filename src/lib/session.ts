/**
 * Client-side Session Manager — FieldTracker Innovations+ Security Layer
 *
 * Responsibilities:
 *  • Store/retrieve the short-lived access token (sessionStorage — wiped on tab close)
 *  • Trigger auto-refresh 60 seconds before the token expires
 *  • Detect expired sessions and trigger logout
 *  • Generate and persist a per-session ID used for AES key derivation
 */

import { decodeTokenUnsafe, isTokenExpired, msUntilExpiry } from './jwt';

const ACCESS_TOKEN_KEY = 'fti_access_token';
const SESSION_ID_KEY   = 'fti_session_id';

// ── Session ID ────────────────────────────────────────────────────────────────
// A random ID per browser session — used as AES key derivation input.
export function ensureSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session';
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// ── Store access token ────────────────────────────────────────────────────────
export function storeAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  ensureSessionId(); // Ensure session ID exists when storing a token
}

// ── Retrieve access token ─────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

// ── Clear the session (logout) ────────────────────────────────────────────────
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  // Note: session ID is intentionally kept so the AES key stays stable
  //       until the actual browser tab closes.
}

// ── Is the current session valid? ─────────────────────────────────────────────
export function isSessionValid(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

// ── Get decoded user from current session ────────────────────────────────────
export function getSessionUser() {
  const token = getAccessToken();
  if (!token) return null;
  return decodeTokenUnsafe(token);
}

// ── Auto-refresh scheduler ────────────────────────────────────────────────────
// Calls `onRefresh` 60 seconds before the access token expires.
// Returns a cancel function.
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoRefresh(
  onRefresh: (newToken: string) => void,
  onExpired: () => void
): () => void {
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }

  const token = getAccessToken();
  if (!token) return () => {};

  const ms = msUntilExpiry(token);
  const refreshIn = Math.max(0, ms - 60_000); // 60s before expiry

  if (ms <= 0) {
    // Already expired
    onExpired();
    return () => {};
  }

  _refreshTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method:      'POST',
        credentials: 'include', // Sends httpOnly refresh cookie automatically
      });

      if (res.ok) {
        const { accessToken } = await res.json();
        storeAccessToken(accessToken);
        onRefresh(accessToken);
        // Re-schedule for the new token
        scheduleAutoRefresh(onRefresh, onExpired);
      } else {
        clearSession();
        onExpired();
      }
    } catch {
      clearSession();
      onExpired();
    }
  }, refreshIn);

  return () => {
    if (_refreshTimer) {
      clearTimeout(_refreshTimer);
      _refreshTimer = null;
    }
  };
}

// ── Format session expiry for UI display ──────────────────────────────────────
export function getSessionExpiryLabel(): string {
  const token = getAccessToken();
  if (!token) return 'No session';

  const ms = msUntilExpiry(token);
  if (ms <= 0) return 'Expired';

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);

  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
