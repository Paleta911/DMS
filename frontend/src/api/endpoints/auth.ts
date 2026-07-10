import { http } from "../http";
import type { AuthUser, LoginResponse } from "../../types/auth";

// Auth API endpoints: login/refresh/register/verify-email and health checks.
export async function authLogin(payload: { email: string; password: string }) {
  const { data } = await http.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function authRefresh(payload: { refreshToken: string }) {
  const { data } = await http.post<LoginResponse>("/auth/refresh", payload);
  return data;
}

export async function authRegister(payload: {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  email: string;
  areaCode?: string;
  requestedAreaNombre?: string;
  telefono?: string;
  fechaNacimiento?: string;
  password: string;
  confirmPassword?: string;
  role?: "admin" | "user";
}) {
  // Registration supports both self-service users and admin-created users.
  const { data } = await http.post<AuthUser>("/auth/register", payload);
  return data;
}

export async function authVerifyEmail(payload: {
  email: string;
  code: string;
}) {
  // Completes verification code flow started at registration.
  const { data } = await http.post<AuthUser>("/auth/verify-email", payload);
  return data;
}

export async function authResendVerificationCode(payload: { email: string }) {
  // Returns server-side cooldown metadata for resend/verify UX timers.
  const { data } = await http.post("/auth/resend-verification-code", payload);
  return data as {
    status: string;
    canResend: boolean;
    canVerify: boolean;
    remainingSec: number;
    nextAllowedAt: string | null;
    verifyRemainingSec: number;
    verifyBlockedUntil: string | null;
    lastSentAt: string | null;
    expiresAt: string | null;
    sendStatus: string | null;
  };
}

export async function authVerificationStatus(payload: { email: string }) {
  // Pollable endpoint used by verify-email screen to recover state after reloads.
  const { data } = await http.post("/auth/verification-status", payload);
  return data as {
    email: string;
    status: string;
    canResend: boolean;
    canVerify: boolean;
    remainingSec: number;
    nextAllowedAt: string | null;
    verifyRemainingSec: number;
    verifyBlockedUntil: string | null;
    lastSentAt: string | null;
    expiresAt: string | null;
    sendStatus: string | null;
  };
}

export async function getHealth() {
  // Health endpoint powers status badges in operational/admin screens.
  const { data } = await http.get("/health");
  return data as {
    status: string;
    db?: string;
    es?: string;
    requestId?: string;
  };
}
