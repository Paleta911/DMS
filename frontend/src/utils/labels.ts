// UI label mappings: translate backend enum/status values to Spanish user-facing text for status badges and displays.
// Incluye estados de documentos, usuarios y salud operativa para unificar chips/tablas.
const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  OBSOLETE: "Obsoleto",
  PENDING: "Pendiente",
  PENDING_VERIFICATION: "Pendiente de verificación",
  PENDING_APPROVAL: "Pendiente de aprobación",
  VERIFIED_EMAIL: "Correo verificado",
  VERIFIED_PENDING_APPROVAL: "Verificado, pendiente de aprobación",
  PENDING_EMAIL: "Pendiente de correo",
  DELETED: "Eliminado",
  DB_UP: "BD activa",
  DB_DOWN: "BD inactiva",
  ES_UP: "ES activo",
  ES_DOWN: "ES inactivo",
  SENT: "Enviado",
  FAILED: "Fallido",
  SIMULATED: "Simulado",
  CONSOLE: "Consola",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  user: "Usuario",
};

const searchEngineLabels: Record<string, string> = {
  elastic: "Elastic",
  fallback: "Respaldo",
};

export type SearchRelevanceLevel = "high" | "medium" | "low" | "none";

export function getSearchRelevance(
  score?: number | null,
  maxScore?: number | null,
): {
  level: SearchRelevanceLevel;
  label: string;
  value: number | null;
  tone: "APPROVED" | "WARN" | "DRAFT";
} {
  // Sin score util no se muestra relevancia para evitar falsas interpretaciones.
  if (typeof score !== "number" || Number.isNaN(score) || score <= 0) {
    return {
      level: "none",
      label: "Sin dato",
      value: null,
      tone: "DRAFT",
    };
  }

  const safeMax =
    typeof maxScore === "number" && maxScore > 0 ? maxScore : score;
  // Normaliza a [0,1] para clasificar resultados de manera estable entre consultas.
  const ratio = Math.max(0, Math.min(1, score / safeMax));

  if (ratio >= 0.8) {
    return { level: "high", label: "Alta", value: ratio, tone: "APPROVED" };
  }
  if (ratio >= 0.55) {
    return { level: "medium", label: "Media", value: ratio, tone: "WARN" };
  }
  return { level: "low", label: "Baja", value: ratio, tone: "DRAFT" };
}

export function translateStatus(value?: string | null) {
  if (!value) return "-";
  return statusLabels[value] ?? value.replace(/_/g, " ");
}

export function translateRole(value?: string | null) {
  if (!value) return "-";
  return roleLabels[value] ?? value;
}

export function translateSearchEngine(value?: string | null) {
  if (!value) return "-";
  return searchEngineLabels[value] ?? value;
}
