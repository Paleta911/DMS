import { http } from '../http';
import type {
  PermissionKey,
  PermissionRequest,
  PermissionRequestStatus,
  PermissionRequestType,
} from '../../types/permissions';

export async function permissionRequestsCreate(payload: { permissions: PermissionKey[]; comment?: string }) {
  const { data } = await http.post<PermissionRequest>('/permission-requests', payload);
  return data;
}

export async function areaRequestsCreate(payload: { areaCodes: string[]; comment?: string }) {
  const { data } = await http.post<PermissionRequest>('/permission-requests/areas', payload);
  return data;
}

export async function permissionRequestsMine(params?: {
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/permission-requests/mine', { params });
  if (Array.isArray(data)) {
    return {
      items: data as PermissionRequest[],
      total: data.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? data.length ?? 20,
    };
  }
  return data as { items: PermissionRequest[]; total: number; page: number; limit: number };
}

export async function adminPermissionRequestsList(params?: {
  status?: PermissionRequestStatus;
  type?: PermissionRequestType;
  user?: string;
  detail?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/admin/permission-requests', { params });
  return data as { items: PermissionRequest[]; total: number; page: number; limit: number };
}

export async function adminPermissionRequestGet(id: number) {
  const { data } = await http.get<PermissionRequest>(`/admin/permission-requests/${id}`);
  return data;
}

export async function adminPermissionRequestApprove(id: number) {
  const { data } = await http.post(`/admin/permission-requests/${id}/approve`);
  return data as PermissionRequest;
}

export async function adminPermissionRequestApprovePartial(
  id: number,
  payload: { areaCodes: string[]; note?: string },
) {
  const { data } = await http.post(`/admin/permission-requests/${id}/approve-partial`, payload);
  return data as PermissionRequest;
}

export async function adminPermissionRequestReject(id: number, reason?: string) {
  const { data } = await http.post(`/admin/permission-requests/${id}/reject`, { reason });
  return data as PermissionRequest;
}

export async function adminPermissionRequestsExportCsv(params?: {
  status?: PermissionRequestStatus;
  type?: PermissionRequestType;
  user?: string;
  detail?: string;
  maxRows?: number;
}) {
  const { data } = await http.get<Blob>('/admin/permission-requests/export.csv', {
    params,
    responseType: 'blob',
  });
  return data;
}
