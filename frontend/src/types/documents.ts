import type { AuthUser } from './auth';

export type Category = {
  id: number;
  nombre: string;
  activo?: boolean;
  createdAt?: string;
};

export type DocumentType = {
  id: number;
  code: string;
  nombreLargo: string;
  activo: boolean;
};

export type AreaCode = {
  id: number;
  code: string;
  nombre: string;
  activo: boolean;
};

export type Version = {
  id: number;
  storedName: string;
  originalName: string;
  comentario?: string | null;
  contentText?: string | null;
  textSource?: 'NONE' | 'PDF_TEXT' | 'PDF_OCR' | 'DOCX_TEXT';
  ocrApplied?: boolean;
  ocrPageCount?: number | null;
  createdAt: string;
  uploadedBy?: AuthUser | null;
};

export type Document = {
  id: number;
  nombre: string;
  codigo?: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'OBSOLETE';
  category?: Category | null;
  documentType?: DocumentType | null;
  areaCode?: AreaCode | null;
  createdAt?: string;
  updatedAt?: string;
  latestVersion?: Version | null;
};

export type DocumentDetail = Document & {
  versions?: Version[];
};

export type WorkflowApproval = {
  id: number;
  step: 'ELABORO' | 'REVISO' | 'APROBO';
  user?: AuthUser | null;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED';
  comentario?: string | null;
  decidedAt?: string | null;
  createdAt?: string;
};

export type WorkflowResponse = {
  status: Document['status'];
  approvals: WorkflowApproval[];
};
