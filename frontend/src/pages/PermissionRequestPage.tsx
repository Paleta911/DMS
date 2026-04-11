import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  permissionRequestsCreate,
  permissionRequestsMine,
} from '../api/endpoints/permissionRequests';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { useToast } from '../components/ToastProvider';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/layout/SectionCard';
import { ResponsiveTable, type ResponsiveColumn } from '../components/ui/ResponsiveTable';
import type { PermissionKey, PermissionRequest } from '../types/permissions';
import { translateStatus } from '../utils/labels';
import { useAuth } from '../auth/AuthContext';
import { AccessDenied } from '../components/AccessDenied';
import { Pill } from '../components/ui/Badge';
import { NoticeBanner } from '../components/ui/NoticeBanner';
import { getApiErrorMessage } from '../utils/apiError';
import { queryClient } from '../app/queryClient';
import { invalidateMyPermissionRequests } from '../app/queryInvalidation';
import { queryKeys } from '../app/queryKeys';
import { ResultsToolbar } from '../components/layout/ResultsToolbar';
import {
  getPermissionRequestDetail,
  getPermissionRequestTypeLabel,
} from '../utils/permissionRequests';

const permissionOptions: Array<{ key: PermissionKey; label: string }> = [
  { key: 'READ', label: 'Ver documentos' },
  { key: 'UPLOAD', label: 'Subir documentos' },
  { key: 'UPLOAD_NEW_VERSION', label: 'Subir nueva versión' },
  { key: 'REVIEW', label: 'Revisar documentos' },
  { key: 'APPROVE', label: 'Aprobar documentos' },
  { key: 'DELETE', label: 'Eliminar documentos' },
];

const permissionFieldByKey: Partial<Record<PermissionKey, keyof NonNullable<NonNullable<ReturnType<typeof useAuth>['user']>['permissions']>>> = {
  READ: 'canRead',
  UPLOAD: 'canUpload',
  UPLOAD_NEW_VERSION: 'canUploadNewVersion',
  REVIEW: 'canReview',
  APPROVE: 'canApprove',
  DELETE: 'canDelete',
};

const schema = z.object({
  permissions: z.array(z.string()).min(1, 'Selecciona al menos un permiso'),
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PermissionRequestPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const listQuery = useQuery({
    queryKey: queryKeys.permissions.mine({
      page: historyPage,
      limit: historyLimit,
    }),
    queryFn: () =>
      permissionRequestsMine({
        page: historyPage,
        limit: historyLimit,
      }),
    placeholderData: (previousData) => previousData,
  });
  const pendingRequestsQuery = useQuery({
    queryKey: queryKeys.permissions.mine({
      page: 1,
      limit: 100,
      scope: 'pending-only',
    }),
    queryFn: () =>
      permissionRequestsMine({
        page: 1,
        limit: 100,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { permissions: PermissionKey[]; comment?: string }) =>
      permissionRequestsCreate(payload),
    onSuccess: () => {
      notify('Solicitud enviada', 'success');
      invalidateMyPermissionRequests(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al solicitar permisos'), 'error');
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { permissions: [], comment: '' },
  });

  const selected = watch('permissions') ?? [];
  const historyItems = listQuery.data?.items ?? [];
  const pendingItems = pendingRequestsQuery.data?.items ?? [];
  const historyTotal = listQuery.data?.total ?? 0;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyLimit));

  const pendingPermissionKeys = useMemo(() => {
    const result = new Set<string>();
    for (const item of pendingItems) {
      if (item.status !== 'PENDING' || item.requestType === 'AREAS') continue;
      try {
        const parsed = JSON.parse(item.requestedPermissions ?? '[]') as string[];
        parsed.forEach((key) => result.add(key));
      } catch {
        continue;
      }
    }
    return result;
  }, [pendingItems]);

  const requestableOptions = useMemo(
    () =>
      permissionOptions.filter((option) => {
        const field = permissionFieldByKey[option.key];
        if (!field) return false;
        return !user?.permissions?.[field];
      }),
    [user?.permissions],
  );

  const hasAllRequestablePermissions = requestableOptions.length === 0;
  const pendingPermissionCount = pendingPermissionKeys.size;

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const onSubmit = handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      permissions: values.permissions as PermissionKey[],
      comment: values.comment,
    });
    reset();
  });

  const columns = useMemo<ResponsiveColumn<PermissionRequest>[]>(
    () => [
      { header: 'Fecha', cell: (item) => new Date(item.createdAt ?? '').toLocaleDateString() },
      {
        header: 'Tipo',
        cell: (item) =>
          item.requestType === 'AREAS' ? (
            <Pill tone="IN_REVIEW">Áreas</Pill>
          ) : (
            <Pill tone="default">Permisos</Pill>
          ),
      },
      {
        header: 'Detalle',
        cell: (item) => getPermissionRequestDetail(item),
      },
      { header: 'Estado', cell: (item) => translateStatus(item.status) },
      { header: 'Motivo', cell: (item) => item.reviewReason ?? '-' },
    ],
    [],
  );

  if (user?.isSuperAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader title="Solicitar permisos" subtitle="Pide accesos adicionales a la asesora." />

        {pendingPermissionCount > 0 ? (
          <NoticeBanner title="Tienes solicitudes pendientes">
            {pendingPermissionCount} permiso(s) siguen en revisión.
          </NoticeBanner>
        ) : null}

        <SectionCard>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <h3 className="font-semibold text-brand-text">Solicitar permisos</h3>
            {hasAllRequestablePermissions ? (
              <NoticeBanner variant="success" title="Sin permisos pendientes por solicitar">
                Ya cuentas con todos los permisos disponibles en este formulario.
              </NoticeBanner>
            ) : (
              <NoticeBanner title="Selecciona solo los permisos que necesites">
                Los permisos ya activos o que ya están en revisión aparecen marcados y bloqueados para evitar duplicados.
              </NoticeBanner>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {permissionOptions.map((option) => {
                const field = permissionFieldByKey[option.key];
                const alreadyGranted = field ? Boolean(user?.permissions?.[field]) : false;
                const pending = pendingPermissionKeys.has(option.key);
                return (
                  <label key={option.key} className="flex items-center gap-2 text-sm text-brand-text">
                    {alreadyGranted || pending ? (
                      <input
                        type="checkbox"
                        checked={alreadyGranted || pending}
                        disabled
                        readOnly
                        className="h-4 w-4 rounded border-brand-border text-brand-primary"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        value={option.key}
                        {...register('permissions')}
                        checked={selected.includes(option.key)}
                        className="h-4 w-4 rounded border-brand-border text-brand-primary"
                      />
                    )}
                    <span className={alreadyGranted || pending ? 'text-brand-textMuted' : ''}>
                      {option.label}
                      {alreadyGranted ? ' (ya activo)' : pending ? ' (pendiente)' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.permissions ? (
              <div className="text-sm text-ember">{errors.permissions.message}</div>
            ) : null}
            <Textarea label="Comentario" rows={3} {...register('comment')} />
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || hasAllRequestablePermissions}>
              {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </form>
        </SectionCard>

        <SectionCard>
          {listQuery.isLoading ? (
            <NoticeBanner title="Cargando historial">
              Consultando el estado más reciente de tus solicitudes.
            </NoticeBanner>
          ) : historyItems.length === 0 ? (
            <NoticeBanner title="Sin historial de solicitudes">
              Aquí aparecerán tus solicitudes en cuanto envíes la primera.
            </NoticeBanner>
          ) : (
            <div className="flex flex-col gap-4">
              <ResultsToolbar
                summary={
                  <>
                    <span>
                      Mostrando {historyItems.length} de {historyTotal}
                    </span>
                    <span>
                      Página {listQuery.data?.page ?? historyPage} de {historyTotalPages}
                    </span>
                  </>
                }
                currentPage={listQuery.data?.page ?? historyPage}
                totalPages={historyTotalPages}
                onPrevious={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                onNext={() =>
                  setHistoryPage((prev) => Math.min(prev + 1, historyTotalPages))
                }
                previousDisabled={(listQuery.data?.page ?? historyPage) <= 1}
                nextDisabled={(listQuery.data?.page ?? historyPage) >= historyTotalPages}
                actions={
                  <select
                    aria-label="Solicitudes por página"
                    value={String(historyLimit)}
                    onChange={(event) => {
                      setHistoryLimit(Number(event.target.value));
                      setHistoryPage(1);
                    }}
                    className="rounded-full border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                }
              />
              <ResponsiveTable
                columns={columns}
                items={historyItems}
                getRowKey={(item) => item.id}
                maxDesktopHeightPx={420}
                stickyHeader
                virtualized
                rowHeight={76}
                renderMobileCard={(item) => (
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="font-semibold text-brand-text">{translateStatus(item.status)}</div>
                    <div>Tipo: {getPermissionRequestTypeLabel(item)}</div>
                    <div>Detalle: {getPermissionRequestDetail(item)}</div>
                    <div>Motivo: {item.reviewReason ?? '-'}</div>
                  </div>
                )}
              />
            </div>
          )}
        </SectionCard>
      </section>
    </PageContainer>
  );
}
