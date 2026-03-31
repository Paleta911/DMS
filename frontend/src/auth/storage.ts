import type { AuthUser } from '../types/auth';

const TOKEN_KEY = 'dms_token';
const REFRESH_TOKEN_KEY = 'dms_refresh_token';
const USER_KEY = 'dms_user';
const FORBIDDEN_KEY = 'dms_last_forbidden';

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
}
