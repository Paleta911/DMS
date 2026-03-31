import type { PermissionRequest } from '../types/permissions';

export function parsePermissionRequestDetail(input: string | null | undefined) {
  try {
    const parsed = JSON.parse(input ?? '[]') as string[];
    return parsed.join(', ');
  } catch {
    return input ?? '-';
  }
}

export function parsePermissionRequestAreaCodes(input: string | null | undefined) {
  try {
    return (JSON.parse(input ?? '[]') as string[]).map((code) =>
      code.toUpperCase(),
    );
  } catch {
    return [];
  }
}

export function getPermissionRequestDetail(item: PermissionRequest) {
  if (item.requestType === 'AREAS') {
    return parsePermissionRequestDetail(item.requestedAreaCodes);
  }
  return parsePermissionRequestDetail(item.requestedPermissions);
}

export function getPermissionRequestTypeLabel(item: PermissionRequest) {
  return item.requestType === 'AREAS' ? 'Áreas' : 'Permisos';
}
