// Permission & area request API: create requests for additional access; list and manage own requests
import { http } from "../http";
import type {
  PermissionKey,
  PermissionRequest,
  PermissionRequestStatus,
  PermissionRequestType,
} from "../../types/permissions";

// Create permission request for specific permissions (read, upload, review, approve, delete)
export async function permissionRequestsCreate(payload: {
  permissions: PermissionKey[];
  comment?: string;
}) {
  const { data } = await http.post<PermissionRequest>(
    "/permission-requests",
    payload,
  );
  return data;
}

// Create area request for access to specific operational areas
export async function areaRequestsCreate(payload: {
  areaCodes: string[];
  comment?: string;
}) {
  const { data } = await http.post<PermissionRequest>(
    "/permission-requests/areas",
    payload,
  );
  return data;
}

// List current user's own permission/area requests with pagination
export async function permissionRequestsMine(params?: {
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get("/permission-requests/mine", { params });
  if (Array.isArray(data)) {
    // Backward-compatible normalization for legacy array responses.
    return {
      items: data as PermissionRequest[],
      total: data.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? data.length ?? 20,
    };
  }
  return data as {
    items: PermissionRequest[];
    total: number;
    page: number;
    limit: number;
  };
}

export async function adminPermissionRequestsList(params?: {
  status?: PermissionRequestStatus;
  type?: PermissionRequestType;
  user?: string;
  detail?: string;
  page?: number;
  limit?: number;
}) {
  // Admin queue endpoint used by review table with filters and pagination.
  const { data } = await http.get("/admin/permission-requests", { params });
  return data as {
    items: PermissionRequest[];
    total: number;
    page: number;
    limit: number;
  };
}

export async function adminPermissionRequestGet(id: number) {
  // Fetch single request details for modal/side panel review.
  const { data } = await http.get<PermissionRequest>(
    `/admin/permission-requests/${id}`,
  );
  return data;
}

export async function adminPermissionRequestApprove(id: number) {
  // Full approval of pending request.
  const { data } = await http.post(`/admin/permission-requests/${id}/approve`);
  return data as PermissionRequest;
}

export async function adminPermissionRequestApprovePartial(
  id: number,
  payload: { areaCodes: string[]; note?: string },
) {
  // Partial approval applies only to area requests and leaves remaining areas pending.
  const { data } = await http.post(
    `/admin/permission-requests/${id}/approve-partial`,
    payload,
  );
  return data as PermissionRequest;
}

export async function adminPermissionRequestReject(
  id: number,
  reason?: string,
) {
  // Reject request with optional reason captured in audit log.
  const { data } = await http.post(`/admin/permission-requests/${id}/reject`, {
    reason,
  });
  return data as PermissionRequest;
}

export async function adminPermissionRequestsExportCsv(params?: {
  status?: PermissionRequestStatus;
  type?: PermissionRequestType;
  user?: string;
  detail?: string;
  maxRows?: number;
}) {
  // Blob response is consumed by download helpers on admin screens.
  const { data } = await http.get<Blob>(
    "/admin/permission-requests/export.csv",
    {
      params,
      responseType: "blob",
    },
  );
  return data;
}
