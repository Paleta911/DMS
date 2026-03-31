export type UserRole = 'admin' | 'user';
export type UserStatus =
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export type PermissionFlags = {
  canAccess: boolean;
  canRead: boolean;
  canUpload: boolean;
  canUploadNewVersion: boolean;
  canReview: boolean;
  canApprove: boolean;
  canDelete: boolean;
};

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
  allowedAreaCodes?: string[];
  status?: UserStatus;
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  verifiedAt?: string | null;
  approvedAt?: string | null;
  approvedById?: number | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  isSuperAdmin?: boolean;
  permissions?: PermissionFlags;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSec: number;
  user?: AuthUser;
};
