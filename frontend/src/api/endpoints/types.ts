// Document types and area codes API: catalog management for classification and organizational structure
import { http } from "../http";
import type { DocumentType, AreaCode } from "../../types/documents";

// List all active document types
export async function documentTypesList() {
  const { data } = await http.get<DocumentType[]>("/document-types");
  return data;
}

// Admin: list document types with filtering and pagination (including inactive)
export async function adminDocumentTypesList(params?: {
  q?: string;
  includeInactive?: boolean;
  status?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get("/document-types", { params });
  return data as {
    items: DocumentType[];
    total: number;
    page: number;
    limit: number;
  };
}

// Create new document type
export async function documentTypesCreate(payload: {
  code: string;
  nombreLargo: string;
  activo?: boolean;
}) {
  const { data } = await http.post<DocumentType>("/document-types", payload);
  return data;
}

// Update document type
export async function documentTypesUpdate(
  id: number,
  payload: { code?: string; nombreLargo?: string; activo?: boolean },
) {
  const { data } = await http.patch<DocumentType>(`/document-types/${id}`, {
    code: payload.code,
    nombreLargo: payload.nombreLargo,
    activo: payload.activo,
  });
  return data;
}

// Soft-delete document type
export async function documentTypesDelete(id: number) {
  const { data } = await http.delete<{ success: boolean }>(
    `/document-types/${id}`,
  );
  return data;
}

// Hard-delete document type (permanent removal)
export async function documentTypesHardDelete(id: number) {
  const { data } = await http.delete<{ success: boolean }>(
    `/document-types/${id}/permanent`,
  );
  return data;
}

export async function areaCodesList() {
  const { data } = await http.get<AreaCode[]>("/area-codes");
  return data;
}

export async function publicAreaCodesList() {
  const { data } = await http.get<AreaCode[]>("/area-codes/public");
  return data;
}

export async function areaCodesListPaged(params?: {
  q?: string;
  includeInactive?: boolean;
  status?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get("/area-codes", { params });
  return data as {
    items: AreaCode[];
    total: number;
    page: number;
    limit: number;
  };
}

export async function adminAreaCodesList(params?: {
  q?: string;
  includeInactive?: boolean;
  status?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get("/area-codes", { params });
  return data as {
    items: AreaCode[];
    total: number;
    page: number;
    limit: number;
  };
}

export async function areaCodesCreate(payload: {
  code: string;
  nombre: string;
  activo?: boolean;
}) {
  const { data } = await http.post<AreaCode>("/area-codes", payload);
  return data;
}

export async function areaCodesUpdate(
  id: number,
  payload: { code?: string; nombre?: string; activo?: boolean },
) {
  const { data } = await http.patch<AreaCode>(`/area-codes/${id}`, {
    code: payload.code,
    nombre: payload.nombre,
    activo: payload.activo,
  });
  return data;
}

export async function areaCodesDelete(id: number) {
  const { data } = await http.delete<{ success: boolean }>(`/area-codes/${id}`);
  return data;
}

export async function areaCodesHardDelete(id: number) {
  const { data } = await http.delete<{ success: boolean }>(
    `/area-codes/${id}/permanent`,
  );
  return data;
}
