import { http } from '../http';
import type { AuditLogListResponse } from '../../types/audit';

export async function auditLogsList(params: {
  page?: number;
  limit?: number;
  action?: string;
  user?: string;
  q?: string;
  from?: string;
  to?: string;
}) {
  const { data } = await http.get<AuditLogListResponse>('/audit-logs', { params });
  return data;
}

export async function auditLogsExportCsv(params: {
  action?: string;
  user?: string;
  q?: string;
  from?: string;
  to?: string;
  maxRows?: number;
}) {
  const { data } = await http.get<Blob>('/audit-logs/export.csv', {
    params,
    responseType: 'blob',
  });
  return data;
}

export async function auditLogsExportJson(params: {
  action?: string;
  user?: string;
  q?: string;
  from?: string;
  to?: string;
  maxRows?: number;
}) {
  const { data } = await http.get<Blob>('/audit-logs/export.json', {
    params,
    responseType: 'blob',
  });
  return data;
}
