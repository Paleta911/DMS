import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auditLogsExportCsv, auditLogsList } from "../../api/endpoints/audit";
import { auditLogsExportJson } from "../../api/endpoints/audit";
import { useAuth } from "../../auth/AuthContext";
import { AccessDenied } from "../../components/AccessDenied";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { ResponsiveActions } from "../../components/layout/ResponsiveActions";
import { SectionCard } from "../../components/layout/SectionCard";
import { type ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ToastProvider";
import type { AuditLog } from "../../types/audit";
import { formatDate } from "../../utils/date";
import { queryKeys } from "../../app/queryKeys";
import { FilterCard } from "../../components/layout/FilterCard";
import { DataTableSection } from "../../components/layout/DataTableSection";
import { ExportMenu } from "../../components/ui/ExportMenu";
import { SavedViewsToolbar } from "../../components/layout/SavedViewsToolbar";
import { useSavedViews } from "../../hooks/useSavedViews";

// Admin audit explorer with filters, pagination, saved views, and CSV/JSON exports.
const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Inicio de sesión exitoso",
  AUTH_LOGIN_FAIL: "Inicio de sesión fallido",
  REGISTER: "Registro de usuario",
  EMAIL_SENT: "Correo enviado",
  EMAIL_FAILED: "Fallo de envío de correo",
  EMAIL_VERIFIED: "Correo verificado",
  EMAIL_VERIFY_FAILED: "Fallo en verificación de correo",
  AUTH_LOGIN_BLOCKED: "Inicio de sesión bloqueado",
  AUTH_REFRESH_SUCCESS: "Renovación de sesión exitosa",
  AUTH_REFRESH_FAIL: "Fallo en renovación de sesión",
  REG_APPROVED: "Registro aprobado",
  REG_REJECTED: "Registro rechazado",
  REG_RESTORED: "Registro restaurado",
  USER_DELETED: "Usuario eliminado",
  USER_SUSPENDED: "Cuenta suspendida",
  USER_RESTORED: "Cuenta restaurada",
  USER_HARD_DELETED: "Cuenta eliminada definitivamente",
  USER_PROFILE_UPDATED: "Perfil actualizado",
  PERMISSION_REQUEST_CREATED: "Solicitud creada",
  PERMISSION_REQUEST_APPROVED: "Solicitud aprobada",
  PERMISSION_REQUEST_REJECTED: "Solicitud rechazada",
  DOCUMENT_UPLOAD: "Documento cargado",
  DOCUMENT_UPDATE: "Documento actualizado",
  VERSION_DOWNLOAD: "Versión descargada",
  SEARCH_QUERY: "Búsqueda realizada",
  ACCESS_DENIED: "Acceso denegado",
  WORKFLOW_SUBMIT: "Envío a revisión",
  WORKFLOW_ASSIGN: "Asignación de revisión/aprobación",
  WORKFLOW_REVIEW_DECISION: "Decisión de revisión",
  WORKFLOW_APPROVAL_DECISION: "Decisión de aprobación",
  WORKFLOW_STATUS_CHANGE: "Cambio de estado de flujo",
  WORKFLOW_RESET_ON_NEW_VERSION: "Reinicio de flujo por nueva versión",
  DOCUMENT_TYPE_CREATED: "Tipo de documento creado",
  DOCUMENT_TYPE_UPDATED: "Tipo de documento actualizado",
  DOCUMENT_TYPE_DELETED: "Tipo de documento eliminado",
  DOCUMENT_TYPE_DEACTIVATED: "Tipo de documento desactivado",
  CATEGORY_CREATED: "Categoría creada",
  CATEGORY_UPDATED: "Categoría actualizada",
  CATEGORY_DEACTIVATED: "Categoría desactivada",
  CATEGORY_DELETED: "Categoría eliminada",
  AREA_CODE_CREATED: "Área creada",
  AREA_CODE_UPDATED: "Área actualizada",
  AREA_CODE_DELETED: "Área eliminada",
  AREA_CODE_DEACTIVATED: "Área desactivada",
  USER_AREAS_UPDATED: "Áreas de usuario actualizadas",
  DOCUMENT_CONTENT_REPROCESS: "Reproceso de contenido documental",
  DOCUMENT_VISIBILITY_POLICY_UPDATED: "Visibilidad documental actualizada",
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  auth: "Autenticación",
  registration: "Registro",
  permission_request: "Solicitud de permisos",
  document: "Documento",
  version: "Versión",
  search: "Búsqueda",
  workflow: "Flujo",
  user: "Usuario",
  category: "Categoría",
  area_code: "Área",
  document_type: "Tipo de documento",
  document_visibility: "Visibilidad documental",
};

type Filters = {
  action: string;
  user: string;
  q: string;
  from: string;
  to: string;
  page: number;
  limit: number;
};

const INITIAL_FILTERS: Filters = {
  action: "",
  user: "",
  q: "",
  from: "",
  to: "",
  page: 1,
  limit: 10,
};
const AUDIT_MIN_DATE = "2026-03-01";

const STORAGE_KEY = "audit-log-filters";
const SAVED_VIEWS_KEY = "audit-log-filter-views";

function buildStorageKey(scope?: string | null) {
  return scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
}

function formatActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function formatResourceTypeLabel(resourceType: string) {
  return RESOURCE_TYPE_LABELS[resourceType] ?? resourceType;
}

function normalizeMeta(meta: unknown): Record<string, unknown> {
  if (!meta) {
    return {};
  }
  if (typeof meta === "string") {
    try {
      const parsed = JSON.parse(meta);
      return typeof parsed === "object" && parsed
        ? (parsed as Record<string, unknown>)
        : { valor: parsed };
    } catch {
      return { valor: meta };
    }
  }
  if (typeof meta === "object") {
    return meta as Record<string, unknown>;
  }
  return { valor: meta };
}

function formatMeta(meta: Record<string, unknown>) {
  const labelMap: Record<string, string> = {
    email: "correo",
    requestId: "idSolicitud",
    userId: "idUsuario",
    resourceId: "idRecurso",
    reason: "motivo",
    permissions: "permisos",
    requestType: "tipoSolicitud",
    areaCodes: "codigosArea",
    approvedAreaCodes: "areasAprobadas",
    remainingAreaCodes: "areasPendientes",
    note: "nota",
  };
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [labelMap[key] ?? key, value]),
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toEndOfDay(dateInput: string) {
  if (!dateInput) {
    return undefined;
  }
  return `${dateInput}T23:59:59.999`;
}

function parsePositiveNumber(
  value: string | null | undefined,
  fallback: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeFilters(partial: Partial<Filters>): Filters {
  const today = formatDateInput(new Date());
  const clampDate = (value?: string) => {
    const normalized = value?.trim() ?? "";
    if (!normalized) {
      return "";
    }
    if (normalized < AUDIT_MIN_DATE) {
      return AUDIT_MIN_DATE;
    }
    if (normalized > today) {
      return today;
    }
    return normalized;
  };
  const from = clampDate(partial.from);
  const to = clampDate(partial.to);
  const [normalizedFrom, normalizedTo] =
    from && to && from > to ? [to, from] : [from, to];

  return {
    action: partial.action?.trim() ?? "",
    user: partial.user?.trim() ?? "",
    q: partial.q?.trim() ?? "",
    from: normalizedFrom,
    to: normalizedTo,
    page:
      partial.page && partial.page > 0 ? partial.page : INITIAL_FILTERS.page,
    limit:
      partial.limit && partial.limit > 0
        ? partial.limit
        : INITIAL_FILTERS.limit,
  };
}

function filtersFromSearchParams(params: URLSearchParams): Filters {
  return sanitizeFilters({
    action: params.get("action") ?? "",
    user: params.get("user") ?? "",
    q: params.get("q") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: parsePositiveNumber(params.get("page"), INITIAL_FILTERS.page),
    limit: parsePositiveNumber(params.get("limit"), INITIAL_FILTERS.limit),
  });
}

function filtersToSearchParams(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.user) params.set("user", filters.user);
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page !== INITIAL_FILTERS.page)
    params.set("page", String(filters.page));
  if (filters.limit !== INITIAL_FILTERS.limit)
    params.set("limit", String(filters.limit));
  return params;
}

function areFiltersEqual(left: Filters, right: Filters) {
  return (
    left.action === right.action &&
    left.user === right.user &&
    left.q === right.q &&
    left.from === right.from &&
    left.to === right.to &&
    left.page === right.page &&
    left.limit === right.limit
  );
}

function loadStoredFilters(scope?: string | null) {
  if (typeof window === "undefined") {
    return INITIAL_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(buildStorageKey(scope));
    if (!raw) {
      return INITIAL_FILTERS;
    }
    return sanitizeFilters(JSON.parse(raw) as Partial<Filters>);
  } catch {
    return INITIAL_FILTERS;
  }
}

export default function AuditLogsPage() {
  const { isAdmin, user } = useAuth();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = useMemo(
    () => buildStorageKey(user?.email ?? null),
    [user?.email],
  );
  const initialFilters = useMemo(() => {
    if (searchParams.toString()) {
      return filtersFromSearchParams(searchParams);
    }
    return loadStoredFilters(user?.email ?? null);
  }, [searchParams, user?.email]);
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [selectedMeta, setSelectedMeta] = useState<Record<
    string,
    unknown
  > | null>(null);
  const maxAuditDate = useMemo(() => formatDateInput(new Date()), []);
  const { views, saveCurrentView, deleteView, rememberLastUsed } =
    useSavedViews<Filters>({
      storageKey: SAVED_VIEWS_KEY,
      scope: user?.email ?? null,
      fallback: initialFilters,
    });

  const actionOptions = useMemo(
    () =>
      Object.entries(ACTION_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const auditQuery = useQuery({
    queryKey: queryKeys.audit.list(appliedFilters),
    queryFn: () =>
      auditLogsList({
        action: appliedFilters.action || undefined,
        user: appliedFilters.user || undefined,
        q: appliedFilters.q || undefined,
        from: appliedFilters.from || undefined,
        to: toEndOfDay(appliedFilters.to),
        page: appliedFilters.page,
        limit: appliedFilters.limit,
      }),
  });

  useEffect(() => {
    const next = searchParams.toString()
      ? filtersFromSearchParams(searchParams)
      : loadStoredFilters(user?.email ?? null);
    setDraftFilters((current) =>
      areFiltersEqual(current, next) ? current : next,
    );
    setAppliedFilters((current) =>
      areFiltersEqual(current, next) ? current : next,
    );
  }, [searchParams, user?.email]);

  useEffect(() => {
    const params = filtersToSearchParams(appliedFilters);
    const nextSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (nextSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(appliedFilters));
    }
    rememberLastUsed(appliedFilters);
  }, [
    appliedFilters,
    rememberLastUsed,
    searchParams,
    setSearchParams,
    storageKey,
  ]);

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const total = auditQuery.data?.total ?? 0;
  const page = appliedFilters.page;
  const limit = appliedFilters.limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);
  const activeFilterCount = [
    appliedFilters.q,
    appliedFilters.user,
    appliedFilters.action,
    appliedFilters.from,
    appliedFilters.to,
  ].filter(Boolean).length;

  const applyFilters = () => {
    const nextFilters = sanitizeFilters({ ...draftFilters, page: 1 });
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const clearFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  const setQuickRange = (daysBack: number) => {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - daysBack);
    const clampedFrom = formatDateInput(
      from < new Date(`${AUDIT_MIN_DATE}T00:00:00`)
        ? new Date(`${AUDIT_MIN_DATE}T00:00:00`)
        : from,
    );
    setDraftFilters((prev) => ({
      ...prev,
      from: clampedFrom,
      to: formatDateInput(now),
    }));
  };

  const exportFiltered = async () => {
    if ((auditQuery.data?.total ?? 0) === 0) {
      return;
    }
    try {
      const blob = await auditLogsExportCsv({
        action: appliedFilters.action || undefined,
        user: appliedFilters.user || undefined,
        q: appliedFilters.q || undefined,
        from: appliedFilters.from || undefined,
        to: toEndOfDay(appliedFilters.to),
        maxRows: 10000,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `auditoria_filtrada_${formatDateInput(new Date())}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      notify("No se pudo exportar la bitácora filtrada", "error");
    }
  };

  const exportFilteredJson = async () => {
    if ((auditQuery.data?.total ?? 0) === 0) {
      return;
    }
    try {
      const blob = await auditLogsExportJson({
        action: appliedFilters.action || undefined,
        user: appliedFilters.user || undefined,
        q: appliedFilters.q || undefined,
        from: appliedFilters.from || undefined,
        to: toEndOfDay(appliedFilters.to),
        maxRows: 10000,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `auditoria_filtrada_${formatDateInput(new Date())}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      notify("No se pudo exportar la bitácora en JSON", "error");
    }
  };

  const columns: ResponsiveColumn<AuditLog>[] = [
    { header: "Fecha", cell: (log) => formatDate(log.createdAt) },
    {
      header: "Usuario",
      cell: (log) => (
        <button
          type="button"
          className="text-left text-brand-primary underline-offset-2 hover:underline"
          onClick={() => {
            const userValue = log.userId ? String(log.userId) : "";
            setDraftFilters((prev) => ({ ...prev, user: userValue }));
            setAppliedFilters((prev) => ({
              ...prev,
              user: userValue,
              page: 1,
            }));
          }}
        >
          {log.userId ?? "-"}
        </button>
      ),
    },
    { header: "Acción", cell: (log) => formatActionLabel(log.action) },
    {
      header: "Tipo",
      cell: (log) => formatResourceTypeLabel(log.resourceType),
    },
    { header: "Recurso", cell: (log) => log.resourceId ?? "-" },
    { header: "IP", cell: (log) => log.ip ?? "-" },
    {
      header: "",
      cell: (log) => (
        <Button
          variant="outline"
          onClick={() => setSelectedMeta(normalizeMeta(log.meta))}
        >
          Detalle
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Auditoría"
          subtitle="Bitácora de eventos y acciones del sistema."
        />

        <FilterCard
          gridClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          footer={
            <div className="md:col-span-2 xl:col-span-2">
              <div className="flex h-full flex-col justify-end gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setQuickRange(0)}>
                    Hoy
                  </Button>
                  <Button variant="outline" onClick={() => setQuickRange(7)}>
                    Últimos 7 días
                  </Button>
                  <Button variant="outline" onClick={() => setQuickRange(30)}>
                    Últimos 30 días
                  </Button>
                </div>
                <ResponsiveActions>
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={clearFilters}
                  >
                    Limpiar
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={applyFilters}>
                    Aplicar filtros
                  </Button>
                </ResponsiveActions>
              </div>
            </div>
          }
          footerClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Input
            label="Buscar"
            value={draftFilters.q}
            placeholder="Acción, tipo, recurso, IP..."
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                q: event.target.value,
              }))
            }
          />
          <Input
            label="Usuario"
            value={draftFilters.user}
            placeholder="ID o correo"
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                user: event.target.value,
              }))
            }
          />
          <Select
            label="Acción"
            value={draftFilters.action}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                action: event.target.value,
              }))
            }
          >
            <option value="">Todas</option>
            {actionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Tamaño de página"
            value={String(draftFilters.limit)}
            onChange={(event) => {
              const nextLimit = Number(event.target.value) || 10;
              setDraftFilters((prev) => ({ ...prev, limit: nextLimit }));
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
          <Input
            label="Desde"
            type="date"
            value={draftFilters.from}
            min={AUDIT_MIN_DATE}
            max={maxAuditDate}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                from: event.target.value,
              }))
            }
          />
          <Input
            label="Hasta"
            type="date"
            value={draftFilters.to}
            min={AUDIT_MIN_DATE}
            max={maxAuditDate}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                to: event.target.value,
              }))
            }
          />
        </FilterCard>

        <SavedViewsToolbar
          views={views}
          onApply={(filters) => {
            setDraftFilters(filters);
            setAppliedFilters(filters);
          }}
          onSave={(name) => {
            saveCurrentView(name, appliedFilters);
            notify("Vista guardada", "success");
          }}
          onDelete={(id) => {
            deleteView(id, appliedFilters);
            notify("Vista eliminada", "success");
          }}
        />

        {auditQuery.isLoading ? (
          <SectionCard className="flex items-center justify-center p-10">
            <Spinner />
          </SectionCard>
        ) : (
          <DataTableSection
            toolbar={{
              summary: (
                <>
                  <span>
                    Mostrando {fromItem} - {toItem} de {total}
                  </span>
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  {activeFilterCount > 0 ? (
                    <span>{activeFilterCount} filtro(s) activo(s)</span>
                  ) : null}
                </>
              ),
              currentPage: page,
              totalPages,
              onPrevious: () =>
                setAppliedFilters((prev) => ({
                  ...prev,
                  page: Math.max(prev.page - 1, 1),
                })),
              onNext: () =>
                setAppliedFilters((prev) => ({ ...prev, page: prev.page + 1 })),
              previousDisabled: !hasPrev,
              nextDisabled: !hasNext,
              actions: (
                <ExportMenu
                  options={[
                    {
                      key: "csv",
                      label: "Exportar CSV filtrado",
                      onClick: exportFiltered,
                      disabled: total === 0,
                    },
                    {
                      key: "json",
                      label: "Exportar JSON filtrado",
                      onClick: exportFilteredJson,
                      disabled: total === 0,
                    },
                  ]}
                />
              ),
            }}
            columns={columns}
            items={auditQuery.data?.items ?? []}
            getRowKey={(log) => log.id}
            renderMobileCard={(log) => (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                      {formatActionLabel(log.action)}
                    </div>
                    <div className="text-sm text-brand-textMuted">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                  <span className="text-xs text-brand-textMuted">
                    Usuario: {log.userId ?? "-"}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-brand-textMuted sm:grid-cols-2">
                  <div>
                    <span className="text-brand-textMuted">Tipo:</span>{" "}
                    {formatResourceTypeLabel(log.resourceType)}
                  </div>
                  <div>
                    <span className="text-brand-textMuted">Recurso:</span>{" "}
                    {log.resourceId ?? "-"}
                  </div>
                  <div>
                    <span className="text-brand-textMuted">IP:</span>{" "}
                    {log.ip ?? "-"}
                  </div>
                </div>
                <ResponsiveActions>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setSelectedMeta(normalizeMeta(log.meta))}
                  >
                    Detalle
                  </Button>
                </ResponsiveActions>
              </div>
            )}
            tableProps={{
              ariaLabel: "Bitácora de auditoría",
              maxDesktopHeightPx: 560,
              stickyHeader: true,
              virtualized: true,
              rowHeight: 68,
            }}
          />
        )}

        <Modal
          open={Boolean(selectedMeta)}
          title="Detalle del evento"
          onClose={() => setSelectedMeta(null)}
        >
          <pre className="panel-strong max-h-[320px] overflow-auto rounded-xl border border-brand-border p-4 text-xs">
            {JSON.stringify(formatMeta(selectedMeta ?? {}), null, 2)}
          </pre>
        </Modal>
      </section>
    </PageContainer>
  );
}
