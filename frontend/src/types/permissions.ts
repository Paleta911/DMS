import type { PermissionFlags } from './auth';

export type PermissionKey =
  | 'ACCESS'
  | 'READ'
  | 'UPLOAD'
  | 'UPLOAD_NEW_VERSION'
  | 'REVIEW'
  | 'APPROVE'
  | 'DELETE';

export type PermissionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PermissionRequestType = 'PERMISSIONS' | 'AREAS';

export type PermissionRequest = {
  id: number;
  requestedPermissions: string;
  requestedAreaCodes?: string | null;
  requestType?: PermissionRequestType;
  comment?: string | null;
  status: PermissionRequestStatus;
  reviewedById?: number | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: {
    id: number;
    email: string;
    nombre?: string | null;
    primerApellido?: string | null;
    segundoApellido?: string | null;
  };
};

export type PermissionLabels = Record<PermissionKey, string>;

export type PermissionSummary = {
  permissions: PermissionFlags;
};
