import type { AuthUser } from '../types/auth';

const TOKEN_KEY = 'dms_token';
const REFRESH_TOKEN_KEY = 'dms_refresh_token';
const USER_KEY = 'dms_user';
const FORBIDDEN_KEY = 'dms_last_forbidden';
const PENDING_VERIFICATION_EMAIL_KEY = 'dms_pending_verification_email';
const LOGIN_BLOCK_KEY = 'dms_login_block';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}

export function markForbidden(path?: string) {
  localStorage.setItem(
    FORBIDDEN_KEY,
    JSON.stringify({ at: Date.now(), path: path ?? window.location.pathname }),
  );
}

export function clearForbidden() {
  localStorage.removeItem(FORBIDDEN_KEY);
}

export function getPendingVerificationEmail() {
  return localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function setPendingVerificationEmail(email: string) {
  localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase());
}

export function clearPendingVerificationEmail() {
  localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function getLoginBlockedState() {
  const raw = localStorage.getItem(LOGIN_BLOCK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { email?: unknown; blockedUntil?: unknown };
    if (typeof parsed.email !== 'string' || typeof parsed.blockedUntil !== 'string') {
      return null;
    }
    return {
      email: parsed.email.trim().toLowerCase(),
      blockedUntil: parsed.blockedUntil,
    };
  } catch {
    return null;
  }
}

export function setLoginBlockedState(email: string, blockedUntil: string) {
  localStorage.setItem(
    LOGIN_BLOCK_KEY,
    JSON.stringify({
      email: email.trim().toLowerCase(),
      blockedUntil,
    }),
  );
}

export function clearLoginBlockedState() {
  localStorage.removeItem(LOGIN_BLOCK_KEY);
}

export function getForbidden() {
  const raw = localStorage.getItem(FORBIDDEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { at: number; path?: string };
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  clearToken();
  clearRefreshToken();
  clearStoredUser();
  clearForbidden();
  clearPendingVerificationEmail();
  clearLoginBlockedState();
}
