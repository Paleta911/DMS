import { http } from '../http';

export type RegistrationStatus =
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export type RegistrationRecord = {
  id: number;
  email: string;
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  status: RegistrationStatus;
  areaLabel?: string | null;
  requestedAreaNombre?: string | null;
  registeredAt?: string;
  verifiedAt?: string | null;
  sendStatus?: string | null;
  sendAttempts?: number;
  lastSentAt?: string | null;
  lastError?: string | null;
  verifyAttempts?: number;
  lastAttemptAt?: string | null;
};

export async function adminRegistrationsList(params?: {
  status?: RegistrationStatus;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/admin/registrations', { params });
  return data as { items: RegistrationRecord[]; total: number; page: number; limit: number };
}

export async function adminRegistrationApprove(id: number) {
  const { data } = await http.post(`/admin/registrations/${id}/approve`);
  return data;
}

export async function adminRegistrationReject(id: number, reason?: string) {
  const { data } = await http.post(`/admin/registrations/${id}/reject`, { reason });
  return data;
}

export async function adminRegistrationRestore(id: number) {
  const { data } = await http.post(`/admin/registrations/${id}/restore`);
  return data;
}

export async function adminRegistrationResend(id: number) {
  const { data } = await http.post(`/admin/registrations/${id}/resend-code`);
  return data;
}

export async function adminRegistrationForceVerify(id: number) {
  const { data } = await http.post(`/admin/registrations/${id}/force-verify`);
  return data;
}

export async function adminRegistrationDelete(id: number) {
  const { data } = await http.delete(`/admin/registrations/${id}`);
  return data;
}

export async function adminRegistrationDeletePermanent(id: number) {
  const { data } = await http.delete(`/admin/registrations/${id}/permanent`);
  return data as { success: true };
}

export async function adminRegistrationsExportCsv(params?: {
  status?: RegistrationStatus;
  q?: string;
  maxRows?: number;
}) {
  const { data } = await http.get<Blob>('/admin/registrations/export.csv', {
    params,
    responseType: 'blob',
  });
  return data;
}
