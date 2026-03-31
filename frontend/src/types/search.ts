import type { Document } from './documents';

export type SearchItem = {
  documentId: string;
  codigo?: string | null;
  nombre: string;
  categoryId?: string | null;
  categoryNombre?: string | null;
  documentTypeCode?: string | null;
  documentTypeNombre?: string | null;
  areaCode?: string | null;
  areaNombre?: string | null;
  latestVersionId?: string | null;
  latestComentario?: string | null;
  createdAt?: string;
  updatedAt?: string;
  score?: number | null;
  status?: Document['status'] | null;
};

export type SearchResponse = {
  engine: 'elastic' | 'fallback';
  items: SearchItem[];
  total: number | { value: number; relation: string };
  page: number;
  limit: number;
};
