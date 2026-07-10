import axios from "axios";
import {
  clearAuthStorage,
  getRefreshToken,
  getToken,
  markForbidden,
  setRefreshToken,
  setToken,
} from "../auth/storage";

// Shared Axios clients with auth token injection, refresh-once strategy, and authz redirects.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const http = axios.create({
  baseURL,
});
const refreshHttp = axios.create({ baseURL });
let refreshPromise: Promise<string | null> | null = null;

http.interceptors.request.use((config) => {
  // Attach access token opportunistically for authenticated endpoints.
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? "";
    // Auth endpoints should not redirect to /forbidden on expected 401/403 flows.
    const skipForbiddenRedirect =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/resend-verification-code") ||
      url.includes("/auth/verification-status") ||
      url.includes("/auth/refresh");
    const originalRequest = error?.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    if (
      status === 401 &&
      !skipForbiddenRedirect &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Single-flight refresh avoids parallel refresh storms on token expiry.
      originalRequest._retry = true;
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return http.request(originalRequest);
      }
    }
    if (status === 401) {
      // Session invalid: clear local auth state and force login.
      clearAuthStorage();
      window.location.href = "/login";
    }
    if (status === 403 && !skipForbiddenRedirect) {
      // Persist attempted route to support post-login return after forbidden handling.
      markForbidden(window.location.pathname);
      if (window.location.pathname !== "/forbidden") {
        window.location.href = "/forbidden";
      }
    }
    return Promise.reject(error);
  },
);

export function getApiBaseUrl() {
  return baseURL;
}

async function refreshAccessToken() {
  // Memoize in-flight refresh requests so concurrent callers share one promise.
  if (!refreshPromise) {
    refreshPromise = doRefreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    const { data } = await refreshHttp.post<{
      accessToken: string;
      refreshToken: string;
    }>("/auth/refresh", {
      refreshToken,
    });
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    clearAuthStorage();
    return null;
  }
}
