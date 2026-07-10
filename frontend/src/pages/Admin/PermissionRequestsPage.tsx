import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  adminPermissionRequestApprove,
  adminPermissionRequestReject,
  adminPermissionRequestsExportCsv,
  adminPermissionRequestsList,
} from "../../api/endpoints/permissionRequests";
import type {
  PermissionRequest,
  PermissionRequestStatus,
  PermissionRequestType,
} from "../../types/permissions";
import { AdminActionList } from "../../components/admin/AdminActionList";
import { TextFieldModal } from "../../components/admin/TextFieldModal";
import { useToast } from "../../components/ToastProvider";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { type ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { AccessDenied } from "../../components/AccessDenied";
import { useAuth } from "../../auth/AuthContext";
import { translateStatus } from "../../utils/labels";
import { getApiErrorMessage } from "../../utils/apiError";
import { queryClient } from "../../app/queryClient";
import { invalidateAdminPermissionRequests } from "../../app/queryInvalidation";
import { queryKeys } from "../../app/queryKeys";
import { FilterCard } from "../../components/layout/FilterCard";
import { DataTableSection } from "../../components/layout/DataTableSection";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ExportMenu } from "../../components/ui/ExportMenu";
import { SavedViewsToolbar } from "../../components/layout/SavedViewsToolbar";
import { useSavedViews } from "../../hooks/useSavedViews";
import { downloadBlob, downloadJson } from "../../utils/download";
import {
  getPermissionRequestDetail,
  getPermissionRequestTypeLabel,
} from "../../utils/permissionRequests";

const statusOptions: Array<{
  value: PermissionRequestStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendiente" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" },
];

const typeOptions: Array<{
  value: "ALL" | "PERMISSIONS" | "AREAS";
  label: string;
}> = [
  { value: "ALL", label: "Todos" },
  { value: "PERMISSIONS", label: "Permisos" },
  { value: "AREAS", label: "Áreas" },
];

function buildPermissionRequestActions(
  item: PermissionRequest,
  actions: {
    onApprove: (id: number) => void;
    onReject: (item: PermissionRequest) => void;
  },
) {
  // Detail action is always available; decision actions only while pending.
  const result: Array<{
    key: string;
    label: string;
    href?: string;
    onClick?: () => void;
    variant: "ghost" | "outline" | "danger";
  }> = [
    {
      key: `detail-${item.id}`,
      label: "Detalle",
      href: `/admin/permission-requests/${item.id}`,
      variant: "ghost",
    },
  ];

  if (item.status === "PENDING") {
    result.push(
      {
        key: `approve-${item.id}`,
        label: "Aprobar",
        onClick: () => actions.onApprove(item.id),
        variant: "outline",
      },
      {
        key: `reject-${item.id}`,
        label: "Rechazar",
        onClick: () => actions.onReject(item),
        variant: "danger",
      },
    );
  }

  return result;
}

export default function PermissionRequestsPage() {
  const { user, isAdmin } = useAuth();
  const { notify } = useToast();
  const {
    initialFilters,
    views,
    saveCurrentView,
    deleteView,
    rememberLastUsed,
  } = useSavedViews<{
    status: PermissionRequestStatus | "ALL";
    typeFilter: "ALL" | "PERMISSIONS" | "AREAS";
    userFilter: string;
    detailFilter: string;
    page: number;
    limit: number;
  }>({
    storageKey: "admin-permission-request-filters",
    scope: user?.email ?? null,
    fallback: {
      status: "ALL",
      typeFilter: "ALL",
      userFilter: "",
      detailFilter: "",
      page: 1,
      limit: 20,
    },
  });
  const [status, setStatus] = useState<PermissionRequestStatus | "ALL">(
    initialFilters.status,
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERMISSIONS" | "AREAS">(
    initialFilters.typeFilter,
  );
  const [userFilter, setUserFilter] = useState(initialFilters.userFilter);
  const [detailFilter, setDetailFilter] = useState(initialFilters.detailFilter);
  const [page, setPage] = useState(initialFilters.page);
  const [limit, setLimit] = useState(initialFilters.limit);
  const [rejecting, setRejecting] = useState<PermissionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const debouncedUserFilter = useDebouncedValue(userFilter);
  const debouncedDetailFilter = useDebouncedValue(detailFilter);

  useEffect(() => {
    rememberLastUsed({
      status,
      typeFilter,
      userFilter,
      detailFilter,
      page,
      limit,
    });
  }, [
    detailFilter,
    limit,
    page,
    rememberLastUsed,
    status,
    typeFilter,
    userFilter,
  ]);

  const requestsQuery = useQuery({
    queryKey: queryKeys.permissions.adminList({
      status,
      typeFilter,
      userFilter: debouncedUserFilter,
      detailFilter: debouncedDetailFilter,
      page,
      limit,
    }),
    queryFn: () =>
      // Debounced filters reduce request churn while typing.
      adminPermissionRequestsList({
        status: status === "ALL" ? undefined : status,
        type:
          typeFilter === "ALL"
            ? undefined
            : (typeFilter as PermissionRequestType),
        user: debouncedUserFilter.trim() || undefined,
        detail: debouncedDetailFilter.trim() || undefined,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminPermissionRequestApprove(id),
    onSuccess: () => {
      notify("Solicitud aprobada", "success");
      invalidateAdminPermissionRequests(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al aprobar"), "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: number; reason?: string }) =>
      adminPermissionRequestReject(payload.id, payload.reason),
    onSuccess: () => {
      notify("Solicitud rechazada", "success");
      invalidateAdminPermissionRequests(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al rechazar"), "error");
    },
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const columns = useMemo<ResponsiveColumn<PermissionRequest>[]>(
    () => [
      { header: "Usuario", cell: (item) => item.user?.email ?? "-" },
      { header: "Estado", cell: (item) => translateStatus(item.status) },
      { header: "Tipo", cell: (item) => getPermissionRequestTypeLabel(item) },
      {
        header: "Detalle",
        cell: (item) => getPermissionRequestDetail(item),
      },
      {
        header: "Acciones",
        headerClassName: "text-center",
        className: "text-center",
        cell: (item) => (
          <AdminActionList
            align="center"
            actions={buildPermissionRequestActions(item, {
              onApprove: (id) => approveMutation.mutate(id),
              onReject: (request) => setRejecting(request),
            })}
          />
        ),
      },
    ],
    [approveMutation],
  );

  const exportFiltered = async () => {
    // Export uses server-side filtering to include full result set, not only current page.
    if ((requestsQuery.data?.total ?? 0) === 0) {
      return;
    }
    try {
      const blob = await adminPermissionRequestsExportCsv({
        status: status === "ALL" ? undefined : status,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        user: debouncedUserFilter.trim() || undefined,
        detail: debouncedDetailFilter.trim() || undefined,
        maxRows: 10000,
      });
      downloadBlob(
        blob,
        `solicitudes_filtradas_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (error: any) {
      notify(
        getApiErrorMessage(error, "No se pudo exportar el listado"),
        "error",
      );
    }
  };

  const exportVisibleJson = () => {
    downloadJson(
      (requestsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        usuario: item.user?.email ?? null,
        estado: translateStatus(item.status),
        tipo: getPermissionRequestTypeLabel(item),
        detalle: getPermissionRequestDetail(item),
        comentario: item.comment ?? null,
        motivoRevision: item.reviewReason ?? null,
        creado: item.createdAt ?? null,
        revisado: item.reviewedAt ?? null,
      })),
      `solicitudes_visibles_${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Solicitudes"
          subtitle="Aprueba solicitudes de permisos y áreas."
        />
        <FilterCard
          gridClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          footer={
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Select
                label="Límite"
                value={String(limit)}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
              <div className="flex items-end xl:col-span-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("ALL");
                    setTypeFilter("ALL");
                    setUserFilter("");
                    setDetailFilter("");
                    setPage(1);
                    setLimit(20);
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          }
        >
          <Select
            label="Estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PermissionRequestStatus | "ALL");
              setPage(1);
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Tipo"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(
                event.target.value as "ALL" | "PERMISSIONS" | "AREAS",
              );
              setPage(1);
            }}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Usuario"
            placeholder="Correo del usuario"
            value={userFilter}
            onChange={(event) => {
              setUserFilter(event.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Detalle"
            placeholder="Permiso o área"
            value={detailFilter}
            onChange={(event) => {
              setDetailFilter(event.target.value);
              setPage(1);
            }}
          />
        </FilterCard>
        <SavedViewsToolbar
          views={views}
          onApply={(saved) => {
            setStatus(saved.status);
            setTypeFilter(saved.typeFilter);
            setUserFilter(saved.userFilter);
            setDetailFilter(saved.detailFilter);
            setPage(saved.page);
            setLimit(saved.limit);
          }}
          onSave={(name) => {
            saveCurrentView(name, {
              status,
              typeFilter,
              userFilter,
              detailFilter,
              page,
              limit,
            });
            notify("Vista guardada", "success");
          }}
          onDelete={(id) => {
            deleteView(id, {
              status,
              typeFilter,
              userFilter,
              detailFilter,
              page,
              limit,
            });
            notify("Vista eliminada", "success");
          }}
        />
        <DataTableSection
          toolbar={{
            summary: (
              <>
                <span>
                  Mostrando {requestsQuery.data?.items?.length ?? 0} de{" "}
                  {requestsQuery.data?.total ?? 0}
                </span>
                <span>Página {requestsQuery.data?.page ?? page}</span>
              </>
            ),
            currentPage: requestsQuery.data?.page ?? page,
            totalPages: Math.max(
              1,
              Math.ceil((requestsQuery.data?.total ?? 0) / limit),
            ),
            onPrevious: () => setPage((prev) => Math.max(prev - 1, 1)),
            onNext: () => {
              const total = requestsQuery.data?.total ?? 0;
              const totalPages = Math.max(1, Math.ceil(total / limit));
              setPage((prev) => Math.min(prev + 1, totalPages));
            },
            previousDisabled: (requestsQuery.data?.page ?? page) <= 1,
            nextDisabled:
              (requestsQuery.data?.page ?? page) >=
              Math.max(1, Math.ceil((requestsQuery.data?.total ?? 0) / limit)),
            actions: (
              <ExportMenu
                options={[
                  {
                    key: "csv",
                    label: "Exportar CSV filtrado",
                    onClick: exportFiltered,
                    disabled: (requestsQuery.data?.total ?? 0) === 0,
                  },
                  {
                    key: "json",
                    label: "Exportar JSON visible",
                    onClick: exportVisibleJson,
                    disabled: (requestsQuery.data?.items.length ?? 0) === 0,
                  },
                ]}
              />
            ),
          }}
          columns={columns}
          items={requestsQuery.data?.items ?? []}
          getRowKey={(item) => item.id}
          renderMobileCard={(item) => (
            <div className="flex flex-col gap-3">
              <div className="font-semibold text-brand-text">
                {item.user?.email ?? "-"}
              </div>
              <div className="text-sm text-brand-textMuted">
                Estado: {translateStatus(item.status)}
              </div>
              <div className="text-sm text-brand-textMuted">
                Tipo: {getPermissionRequestTypeLabel(item)}
              </div>
              <div className="text-sm text-brand-textMuted">
                Detalle: {getPermissionRequestDetail(item)}
              </div>
              <AdminActionList
                actions={buildPermissionRequestActions(item, {
                  onApprove: (id) => approveMutation.mutate(id),
                  onReject: (request) => setRejecting(request),
                })}
              />
            </div>
          )}
          tableProps={{
            ariaLabel: "Solicitudes administrativas de permisos y áreas",
            maxDesktopHeightPx: 560,
            stickyHeader: true,
            virtualized: true,
            rowHeight: 76,
          }}
        />
      </section>

      <TextFieldModal
        open={Boolean(rejecting)}
        title="Rechazar solicitud"
        label="Motivo (opcional)"
        value={rejectReason}
        onChange={setRejectReason}
        onClose={() => setRejecting(null)}
        onConfirm={() => {
          if (!rejecting) return;
          rejectMutation.mutate({ id: rejecting.id, reason: rejectReason });
          setRejecting(null);
          setRejectReason("");
        }}
        confirmLabel="Rechazar"
        confirmVariant="danger"
        confirmDisabled={rejectMutation.isPending}
      />
    </PageContainer>
  );
}
