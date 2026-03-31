export type AuditLog = {
  id: number;
  userId?: number | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type AuditLogListResponse = {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
};
