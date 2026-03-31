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

export async function getHealth() {
  const { data } = await http.get('/health');
  return data as { status: string; db?: string; es?: string; requestId?: string };
}
