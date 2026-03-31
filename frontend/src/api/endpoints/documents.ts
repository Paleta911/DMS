import { http } from '../http';
import type { Document, DocumentDetail, WorkflowResponse } from '../../types/documents';

type DocumentsResponse =
  | Document[]
  | {
      items: Document[];
      total?: number;
      page?: number;
      limit?: number;
    };

export type DocumentsListParams = {
  page?: number;
  limit?: number;
  categoryId?: string;
  documentTypeCode?: string;
  areaCode?: string;
  sortByName?: 'az' | 'za' | '';
};

export async function documentsList(params?: DocumentsListParams) {
  const requestParams = {
    page: params?.page,
    limit: params?.limit,
    categoryId: params?.categoryId || undefined,
    documentTypeCode: params?.documentTypeCode || undefined,
    areaCode: params?.areaCode || undefined,
    sortByName: params?.sortByName || undefined,
  };
  const { data } = await http.get<DocumentsResponse>('/documents', {
    params: requestParams,
  });
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
    page: data.page ?? params?.page ?? 1,
    limit: data.limit ?? params?.limit ?? 20,
  };
}

export async function getDocument(id: number) {
  const { data } = await http.get<DocumentDetail>(`/documents/${id}`);
  return data;
}

export async function getWorkflow(id: number) {
  const { data } = await http.get<WorkflowResponse>(`/documents/${id}/workflow`);
  return data;
}

export async function getDocumentVersions(id: number) {
  const { data } = await http.get(`/documents/${id}/versions`);
  return data as DocumentDetail['versions'];
}

export async function uploadDocument(form: FormData) {
  const { data } = await http.post('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data as { documentId: number; versionId: number; codigo?: string | null };
}

export async function updateDocument(
  id: number,
  payload: {
    nombreDocumento?: string;
    categoryId?: number | null;
    documentTypeCode?: string;
    areaCode?: string;
    consecutivo?: number | null;
  },
) {
  const { data } = await http.patch<Document>(`/documents/${id}`, payload);
  return data;
}

export async function workflowAssign(id: number, revisoUserId: number, aproboUserId: number) {
  const { data } = await http.patch(`/documents/${id}/assign-reviewers`, { revisoUserId, aproboUserId });
  return data as WorkflowResponse;
}

export async function workflowSubmit(id: number) {
  const { data } = await http.post(`/documents/${id}/submit-review`);
  return data as WorkflowResponse;
}

export async function workflowReview(id: number, payload: { decision: 'APPROVED' | 'REJECTED'; comentario?: string }) {
  const { data } = await http.post(`/documents/${id}/review`, payload);
  return data as WorkflowResponse;
}

export async function workflowApprove(id: number, payload: { decision: 'APPROVED' | 'REJECTED'; comentario?: string }) {
  const { data } = await http.post(`/documents/${id}/approve`, payload);
  return data as WorkflowResponse;
}

export async function workflowObsolete(id: number) {
  const { data } = await http.post(`/documents/${id}/obsolete`);
  return data as WorkflowResponse;
}
