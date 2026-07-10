// Permission request utilities: translate permission/area codes to user-facing Spanish labels for request display
// Handles JSON and comma-separated parsing; formats AREAS vs PERMISSIONS request types
import type { PermissionRequest } from "../types/permissions";

// Map backend permission keys to frontend display labels
const permissionRequestLabels: Record<string, string> = {
  ACCESS: "Acceso al sistema",
  READ: "Ver documentos",
  UPLOAD: "Subir documentos",
  UPLOAD_NEW_VERSION: "Subir nueva versión",
  REVIEW: "Revisar documentos",
  APPROVE: "Aprobar documentos",
  DELETE: "Eliminar documentos",
};

function translatePermissionRequestValue(value: string) {
  return permissionRequestLabels[value] ?? value;
}

export function parsePermissionRequestDetail(input: string | null | undefined) {
  try {
    const parsed = JSON.parse(input ?? "[]") as string[];
    return parsed.map(translatePermissionRequestValue).join(", ");
  } catch {
    return (
      input
        ?.split(",")
        .map((value) => translatePermissionRequestValue(value.trim()))
        .join(", ") ?? "-"
    );
  }
}

export function parsePermissionRequestAreaCodes(
  input: string | null | undefined,
) {
  try {
    return (JSON.parse(input ?? "[]") as string[]).map((code) =>
      code.toUpperCase(),
    );
  } catch {
    return [];
  }
}

export function getPermissionRequestDetail(item: PermissionRequest) {
  if (item.requestType === "AREAS") {
    return parsePermissionRequestDetail(item.requestedAreaCodes);
  }
  return parsePermissionRequestDetail(item.requestedPermissions);
}

export function getPermissionRequestTypeLabel(item: PermissionRequest) {
  return item.requestType === "AREAS" ? "Áreas" : "Permisos";
}
