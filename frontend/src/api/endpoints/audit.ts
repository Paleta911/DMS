// Audit logs API: compliance query, filtering (user/action/date range), and export to CSV/JSON
import { http } from "../http";
import type { AuditLogListResponse } from "../../types/audit";

// Query audit logs with optional filtering: action type, user email, date range, pagination
export async function auditLogsList(params: {
  page?: number;
  limit?: number;
  action?: string;
  user?: string;
  q?: string;
  from?: string;
  to?: string;
}) {
  const { data } = await http.get<AuditLogListResponse>("/audit-logs", {
    params,
  });
  return data;
}

// Export audit logs as CSV blob; supports same filters as list
export async function auditLogsExportCsv(params: {
  action?: string;
  user?: string;
  q?: string;
  from?: string;
  to?: string;
  maxRows?: number;
}) {
  const { data } = await http.get<Blob>("/audit-logs/export.csv", {
    params,
    responseType: "blob",
  });
  return data;
}

// Export audit logs as JSON blob; supports same filters as list
export async function auditLogsExportJson(params: {
  action?: string;
  user?: string;
  q?: string;
  from?: string;
  to?: string;
  maxRows?: number;
}) {
  const { data } = await http.get<Blob>("/audit-logs/export.json", {
    params,
    responseType: "blob",
  });
  return data;
}
