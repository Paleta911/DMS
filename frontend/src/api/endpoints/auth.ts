import { http } from '../http';
import type { AuthUser, LoginResponse } from '../../types/auth';

export async function authLogin(payload: { email: string; password: string }) {
  const { data } = await http.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function authRefresh(payload: { refreshToken: string }) {
  const { data } = await http.post<LoginResponse>('/auth/refresh', payload);
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
  role?: 'admin' | 'user';
}) {
  const { data } = await http.post<AuthUser>('/auth/register', payload);
  return data;
}

export async function authVerifyEmail(payload: { email: string; code: string }) {
  const { data } = await http.post<AuthUser>('/auth/verify-email', payload);
  return data;
}

export async function authResendVerificationCode(payload: { email: string }) {
  const { data } = await http.post('/auth/resend-verification-code', payload);
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
  const { data } = await http.post('/auth/verification-status', payload);
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
  const { data } = await http.get('/health');
  return data as { status: string; db?: string; es?: string; requestId?: string };
}
