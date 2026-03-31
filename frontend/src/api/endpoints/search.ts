import { http } from '../http';
import type { SearchResponse } from '../../types/search';

export async function searchQuery(params: {
  q?: string;
  categoryId?: string;
  documentTypeCode?: string;
  areaCode?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get<SearchResponse>('/search', { params });
  return data;
}

export async function searchReindex() {
  const { data } = await http.post('/search/reindex');
  return data;
}

export async function searchIndexStatus() {
  const { data } = await http.get('/search/index-status');
  return data as {
    engine: 'elastic' | 'fallback';
    indexName: string;
    docsCount: number | null;
    lastReindexAt?: string | null;
  };
}
