import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  adminRegistrationApprove,
  adminRegistrationForceVerify,
  adminRegistrationReject,
  adminRegistrationResend,
  adminRegistrationsExportCsv,
  adminRegistrationsList,
  type RegistrationRecord,
  type RegistrationStatus,
} from '../../api/endpoints/adminRegistrations';
import { AdminActionList } from '../../components/admin/AdminActionList';
import { TextFieldModal } from '../../components/admin/TextFieldModal';
import { useToast } from '../../components/ToastProvider';
import { Select } from '../../components/ui/Select';
import { type ResponsiveColumn } from '../../components/ui/ResponsiveTable';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { FilterCard } from '../../components/layout/FilterCard';
import { AccessDenied } from '../../components/AccessDenied';
import { useAuth } from '../../auth/AuthContext';
import { translateStatus } from '../../utils/labels';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryClient } from '../../app/queryClient';
import { invalidateAdminRegistrations } from '../../app/queryInvalidation';
import { queryKeys } from '../../app/queryKeys';
import { DataTableSection } from '../../components/layout/DataTableSection';
import { Input } from '../../components/ui/Input';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ExportMenu } from '../../components/ui/ExportMenu';
import { SavedViewsToolbar } from '../../components/layout/SavedViewsToolbar';
import { useSavedViews } from '../../hooks/useSavedViews';
import { downloadBlob, downloadJson } from '../../utils/download';

const statusOptions: Array<{ value: RegistrationStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING_VERIFICATION', label: 'Pendiente verificación' },
  { value: 'PENDING_APPROVAL', label: 'Pendiente aprobación' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED', label: 'Rechazado' },
];

function buildRegistrationActions(
  item: RegistrationRecord,
  actions: {
    onApprove: (id: number) => void;
    onReject: (item: RegistrationRecord) => void;
    onResend: (id: number) => void;
    onForceVerify: (id: number) => void;
  },
) {
  const result: Array<{
    key: string;
    label: string;
    onClick: () => void;
    variant: 'outline' | 'danger';
  }> = [];

  if (item.status === 'PENDING_APPROVAL') {
    result.push(
      {
        key: `approve-${item.id}`,
        label: 'Aprobar',
        onClick: () => actions.onApprove(item.id),
        variant: 'outline',
      },
      {
        key: `reject-${item.id}`,
        label: 'Rechazar',
        onClick: () => actions.onReject(item),
        variant: 'danger',
      },
    );
  }

  if (item.status === 'PENDING_VERIFICATION') {
    result.push(
      {
        key: `resend-${item.id}`,
        label: 'Reenviar',
        onClick: () => actions.onResend(item.id),
        variant: 'outline',
      },
      {
        key: `force-${item.id}`,
        label: 'Forzar verificación',
        onClick: () => actions.onForceVerify(item.id),
        variant: 'outline',
      },
    );
  }

  return result;
}

export default function RegistrationsPage() {
  const { user, isAdmin } = useAuth();
  const { notify } = useToast();
  const { initialFilters, views, saveCurrentView, deleteView, rememberLastUsed } =
    useSavedViews<{
      status: RegistrationStatus | 'ALL';
      search: string;
      page: number;
      limit: number;
    }>({
      storageKey: 'registration-filters',
      scope: user?.email ?? null,
      fallback: {
        status: 'ALL',
        search: '',
        page: 1,
        limit: 20,
      },
    });
  const [status, setStatus] = useState<RegistrationStatus | 'ALL'>(initialFilters.status);
  const [search, setSearch] = useState(initialFilters.search);
  const [page, setPage] = useState(initialFilters.page);
  const [limit, setLimit] = useState(initialFilters.limit);
  const [rejecting, setRejecting] = useState<RegistrationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    rememberLastUsed({ status, search, page, limit });
  }, [limit, page, rememberLastUsed, search, status]);

  const registrationsQuery = useQuery({
    queryKey: queryKeys.registrations.list({
      status,
      q: debouncedSearch,
      page,
      limit,
    }),
    queryFn: () =>
      adminRegistrationsList({
        status: status === 'ALL' ? undefined : status,
        q: debouncedSearch.trim() || undefined,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationApprove(id),
    onSuccess: () => {
      notify('Registro aprobado', 'success');
      invalidateAdminRegistrations(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al aprobar'), 'error');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationResend(id),
    onSuccess: () => {
      notify('Código reenviado', 'success');
      invalidateAdminRegistrations(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al reenviar'), 'error');
    },
  });

  const forceVerifyMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationForceVerify(id),
    onSuccess: () => {
      notify('Registro verificado manualmente', 'success');
      invalidateAdminRegistrations(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al forzar verificación'), 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: number; reason?: string }) => adminRegistrationReject(payload.id, payload.reason),
    onSuccess: () => {
      notify('Registro rechazado', 'success');
      invalidateAdminRegistrations(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al rechazar'), 'error');
    },
  });

  if (!isAdmin || !user?.isSuperAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : '-';
  const total = registrationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const exportFiltered = async () => {
    if (total === 0) {
      return;
    }
    try {
      const blob = await adminRegistrationsExportCsv({
        status: status === 'ALL' ? undefined : status,
        q: debouncedSearch.trim() || undefined,
        maxRows: 10000,
      });
      downloadBlob(blob, `registros_filtrados_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'No se pudo exportar el listado'), 'error');
    }
  };

  const exportVisibleJson = () => {
    downloadJson(
      (registrationsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        correo: item.email,
        nombre: [item.nombre, item.primerApellido, item.segundoApellido]
          .filter(Boolean)
          .join(' ') || null,
        telefono: item.telefono ?? null,
        nacimiento: item.fechaNacimiento ?? null,
        estado: translateStatus(item.status),
        registrado: item.registeredAt ?? null,
        verificado: item.verifiedAt ?? null,
        envio: item.sendStatus ?? null,
        intentosEnvio: item.sendAttempts ?? 0,
        intentosVerificacion: item.verifyAttempts ?? 0,
        ultimoError: item.lastError ?? null,
      })),
      `registros_visibles_${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  const columns = useMemo<ResponsiveColumn<RegistrationRecord>[]>(
    () => [
      { header: 'Correo', cell: (item) => item.email },
      {
        header: 'Nombre',
        cell: (item) =>
          [item.nombre, item.primerApellido, item.segundoApellido]
            .filter(Boolean)
            .join(' ') || '-',
      },
      { header: 'Teléfono', cell: (item) => item.telefono ?? '-' },
      { header: 'Nacimiento', cell: (item) => formatDate(item.fechaNacimiento) },
      { header: 'Estado', cell: (item) => translateStatus(item.status) },
      { header: 'Registrado', cell: (item) => formatDate(item.registeredAt) },
      { header: 'Envíos', cell: (item) => `${translateStatus(item.sendStatus) ?? '-'} (${item.sendAttempts ?? 0})` },
      { header: 'Último envío', cell: (item) => formatDate(item.lastSentAt) },
      { header: 'Intentos', cell: (item) => item.verifyAttempts ?? 0 },
      { header: 'Error', cell: (item) => item.lastError ?? '-' },
      { header: 'Verificado', cell: (item) => formatDate(item.verifiedAt) },
      {
        header: 'Acciones',
        cell: (item) => (
          <AdminActionList
            actions={buildRegistrationActions(item, {
              onApprove: (id) => approveMutation.mutate(id),
              onReject: (record) => setRejecting(record),
              onResend: (id) => resendMutation.mutate(id),
              onForceVerify: (id) => forceVerifyMutation.mutate(id),
            })}
          />
        ),
      },
    ],
    [approveMutation, resendMutation, forceVerifyMutation],
  );

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader title="Registros" subtitle="Aprueba y monitorea solicitudes de acceso." />
        <FilterCard gridClassName="grid gap-4 md:grid-cols-3">
          <Input
            label="Buscar"
            placeholder="Correo o nombre"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as RegistrationStatus | 'ALL');
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
          </Select>
        </FilterCard>
        <SavedViewsToolbar
          views={views}
          onApply={(saved) => {
            setStatus(saved.status);
            setSearch(saved.search);
            setPage(saved.page);
            setLimit(saved.limit);
          }}
          onSave={(name) => {
            saveCurrentView(name, { status, search, page, limit });
            notify('Vista guardada', 'success');
          }}
          onDelete={(id) => {
            deleteView(id, { status, search, page, limit });
            notify('Vista eliminada', 'success');
          }}
        />
        <DataTableSection
          toolbar={{
            summary: (
              <>
                <span>
                  Mostrando {registrationsQuery.data?.items.length ?? 0} de {total}
                </span>
                <span>
                  Página {registrationsQuery.data?.page ?? page} de {totalPages}
                </span>
              </>
            ),
            currentPage: registrationsQuery.data?.page ?? page,
            totalPages,
            onPrevious: () => setPage((prev) => Math.max(prev - 1, 1)),
            onNext: () => setPage((prev) => Math.min(prev + 1, totalPages)),
            previousDisabled: page <= 1,
            nextDisabled: page >= totalPages,
            actions: (
              <ExportMenu
                options={[
                  {
                    key: 'csv',
                    label: 'Exportar CSV filtrado',
                    onClick: exportFiltered,
                    disabled: total === 0,
                  },
                  {
                    key: 'json',
                    label: 'Exportar JSON visible',
                    onClick: exportVisibleJson,
                    disabled: (registrationsQuery.data?.items.length ?? 0) === 0,
                  },
                ]}
              />
            ),
          }}
          columns={columns}
          items={registrationsQuery.data?.items ?? []}
          getRowKey={(item) => item.id}
          renderMobileCard={(item) => (
            <div className="flex flex-col gap-3">
              <div className="font-semibold text-brand-text">{item.email}</div>
              <div className="text-sm text-brand-textMuted">Estado: {translateStatus(item.status)}</div>
              <div className="text-sm text-brand-textMuted">
                Nombre: {[item.nombre, item.primerApellido, item.segundoApellido].filter(Boolean).join(' ') || '-'}
              </div>
              <div className="text-sm text-brand-textMuted">Teléfono: {item.telefono ?? '-'}</div>
              <div className="text-sm text-brand-textMuted">Nacimiento: {formatDate(item.fechaNacimiento)}</div>
              <div className="text-sm text-brand-textMuted">Registrado: {formatDate(item.registeredAt)}</div>
              <div className="text-sm text-brand-textMuted">
                Envíos: {translateStatus(item.sendStatus)} ({item.sendAttempts ?? 0})
              </div>
              <div className="text-sm text-brand-textMuted">Último envío: {formatDate(item.lastSentAt)}</div>
              <div className="text-sm text-brand-textMuted">Intentos: {item.verifyAttempts ?? 0}</div>
              <div className="text-sm text-brand-textMuted">Error: {item.lastError ?? '-'}</div>
              <div className="text-sm text-brand-textMuted">Verificado: {formatDate(item.verifiedAt)}</div>
              <AdminActionList
                actions={buildRegistrationActions(item, {
                  onApprove: (id) => approveMutation.mutate(id),
                  onReject: (record) => setRejecting(record),
                  onResend: (id) => resendMutation.mutate(id),
                  onForceVerify: (id) => forceVerifyMutation.mutate(id),
                })}
              />
            </div>
          )}
          tableProps={{
            ariaLabel: 'Registros de usuarios pendientes y atendidos',
            maxDesktopHeightPx: 560,
            stickyHeader: true,
            virtualized: true,
            rowHeight: 76,
          }}
        />
      </section>

      <TextFieldModal
        open={Boolean(rejecting)}
        title="Rechazar registro"
        label="Motivo (opcional)"
        value={rejectReason}
        onChange={setRejectReason}
        onClose={() => setRejecting(null)}
        onConfirm={() => {
          if (!rejecting) return;
          rejectMutation.mutate({ id: rejecting.id, reason: rejectReason });
          setRejecting(null);
          setRejectReason('');
        }}
        confirmLabel="Rechazar"
        confirmVariant="danger"
        confirmDisabled={rejectMutation.isPending}
      />
    </PageContainer>
  );
}
