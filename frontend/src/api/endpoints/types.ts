import { http } from '../http';
import type { DocumentType, AreaCode } from '../../types/documents';

export async function documentTypesList() {
  const { data } = await http.get<DocumentType[]>('/document-types');
  return data;
}

export async function adminDocumentTypesList(params?: {
  q?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/document-types', { params });
  return data as { items: DocumentType[]; total: number; page: number; limit: number };
}

export async function documentTypesCreate(payload: {
  code: string;
  nombreLargo: string;
  activo?: boolean;
}) {
  const { data } = await http.post<DocumentType>('/document-types', payload);
  return data;
}

export async function documentTypesUpdate(
  id: number,
  payload: { nombreLargo?: string; activo?: boolean },
) {
  const { data } = await http.patch<DocumentType>(`/document-types/${id}`, payload);
  return data;
}

export async function documentTypesDelete(id: number) {
  const { data } = await http.delete<{ success: boolean }>(`/document-types/${id}`);
  return data;
}

export async function areaCodesList() {
  const { data } = await http.get<AreaCode[]>('/area-codes');
  return data;
}

export async function areaCodesListPaged(params?: {
  q?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/area-codes', { params });
  return data as { items: AreaCode[]; total: number; page: number; limit: number };
}

export async function adminAreaCodesList(params?: {
  q?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/area-codes', { params });
  return data as { items: AreaCode[]; total: number; page: number; limit: number };
}

export async function areaCodesCreate(payload: {
  code: string;
  nombre: string;
  activo?: boolean;
}) {
  const { data } = await http.post<AreaCode>('/area-codes', payload);
  return data;
}

export async function areaCodesUpdate(
  id: number,
  payload: { nombre?: string; activo?: boolean },
) {
  const { data } = await http.patch<AreaCode>(`/area-codes/${id}`, payload);
  return data;
}

export async function areaCodesDelete(id: number) {
  const { data } = await http.delete<{ success: boolean }>(`/area-codes/${id}`);
  return data;
}
