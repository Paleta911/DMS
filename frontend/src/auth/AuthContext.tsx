import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../types/auth";
import { authLogin } from "../api/endpoints/auth";
import { usersMe } from "../api/endpoints/users";
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
} from "./storage";

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
  // Used after refresh/login to reconcile UI state with server-side user state.
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

// Auth context provider manages login/logout flow, token persistence, user hydration, and admin role detection
// Stores auth state in localStorage and automatically reconciles with server on app load
export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize auth state from localStorage to restore user session across page refreshes
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

  // If token exists but user is not yet loaded, fetch user details from server
  useEffect(() => {
    if (token && !user) {
      void refreshUser();
    }
  }, [token, user, refreshUser]);

  // Login flow persists tokens first, then hydrates user; clears login block/verification state
  const login = useCallback(async (email: string, password: string) => {
    // Persist both tokens before hydrating user to keep subsequent API calls authenticated.
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
    // Full client-side logout; backend tokens expire naturally.
    clearAuthStorage();
    setUser(null);
    setTokenState(null);
    setRefreshTokenState(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      refreshToken,
      isAdmin: user?.role === "admin",
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
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
