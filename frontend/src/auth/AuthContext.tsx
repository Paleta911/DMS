import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types/auth';
import { authLogin } from '../api/endpoints/auth';
import { usersMe } from '../api/endpoints/users';
import {
  clearLoginBlockedState,
  clearPendingVerificationEmail,
  clearAuthStorage,
  getRefreshToken,
  getStoredUser,
  getToken,
  setRefreshToken,
  setStoredUser,
  setToken,
} from './storage';

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function resolveUserFromToken() {
  try {
    return await usersMe();
  } catch {
    return null;
  }
}

async function hydrateUser(user: AuthUser) {
  try {
    const detail = await usersMe();
    return detail ?? user;
  } catch {
    return user;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() =>
    getRefreshToken(),
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const resolved = await resolveUserFromToken();
    if (resolved) {
      setUser(resolved);
      setStoredUser(resolved);
    }
  }, [token]);

  useEffect(() => {
    if (token && !user) {
      void refreshUser();
    }
  }, [token, user, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authLogin({ email, password });
    clearLoginBlockedState();
    clearPendingVerificationEmail();
    setToken(response.accessToken);
    setTokenState(response.accessToken);
    setRefreshToken(response.refreshToken);
    setRefreshTokenState(response.refreshToken);
    if (response.user) {
      const hydrated = await hydrateUser(response.user);
      setUser(hydrated);
      setStoredUser(hydrated);
      return;
    }
    const resolved = await resolveUserFromToken();
    if (resolved) {
      setUser(resolved);
      setStoredUser(resolved);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setTokenState(null);
    setRefreshTokenState(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      refreshToken,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      refreshUser,
    }),
    [user, token, refreshToken, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
