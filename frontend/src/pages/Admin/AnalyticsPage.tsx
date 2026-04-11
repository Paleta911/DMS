import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsSummary } from '../../api/endpoints/adminAnalytics';
import { useAuth } from '../../auth/AuthContext';
import { AccessDenied } from '../../components/AccessDenied';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { SectionCard } from '../../components/layout/SectionCard';
import { NoticeBanner } from '../../components/ui/NoticeBanner';
import { Spinner } from '../../components/ui/Spinner';
import { Pill } from '../../components/ui/Badge';
import { queryKeys } from '../../app/queryKeys';
import { useFeatureFlag } from '../../features/FeatureFlagsProvider';
import { formatDate } from '../../utils/date';
import { translateStatus } from '../../utils/labels';

const ANALYTICS_ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  AUTH_LOGIN_FAIL: 'Inicio de sesión fallido',
  REGISTER: 'Registro de usuario',
  EMAIL_SENT: 'Correo enviado',
  EMAIL_FAILED: 'Fallo de envío de correo',
  EMAIL_VERIFIED: 'Correo verificado',
  EMAIL_VERIFY_FAILED: 'Fallo en verificación de correo',
  AUTH_LOGIN_BLOCKED: 'Inicio de sesión bloqueado',
  AUTH_REFRESH_SUCCESS: 'Renovación de sesión exitosa',
  AUTH_REFRESH_FAIL: 'Fallo en renovación de sesión',
  REG_APPROVED: 'Registro aprobado',
  REG_REJECTED: 'Registro rechazado',
  REG_RESTORED: 'Registro restaurado',
  USER_DELETED: 'Usuario eliminado',
  USER_SUSPENDED: 'Cuenta suspendida',
  USER_RESTORED: 'Cuenta restaurada',
  USER_HARD_DELETED: 'Cuenta eliminada definitivamente',
  USER_PROFILE_UPDATED: 'Perfil actualizado',
  PERMISSION_REQUEST_CREATED: 'Solicitud creada',
  PERMISSION_REQUEST_APPROVED: 'Solicitud aprobada',
  PERMISSION_REQUEST_REJECTED: 'Solicitud rechazada',
  DOCUMENT_UPLOAD: 'Documento cargado',
  DOCUMENT_UPDATE: 'Documento actualizado',
  VERSION_DOWNLOAD: 'Versión descargada',
  SEARCH_QUERY: 'Búsqueda realizada',
  ACCESS_DENIED: 'Acceso denegado',
  WORKFLOW_SUBMIT: 'Envío a revisión',
  WORKFLOW_ASSIGN: 'Asignación de revisión/aprobación',
  WORKFLOW_REVIEW_DECISION: 'Decisión de revisión',
  WORKFLOW_APPROVAL_DECISION: 'Decisión de aprobación',
  WORKFLOW_STATUS_CHANGE: 'Cambio de estado de flujo',
  WORKFLOW_RESET_ON_NEW_VERSION: 'Reinicio de flujo por nueva versión',
  DOCUMENT_TYPE_CREATED: 'Tipo de documento creado',
  DOCUMENT_TYPE_UPDATED: 'Tipo de documento actualizado',
  DOCUMENT_TYPE_DELETED: 'Tipo de documento eliminado',
  DOCUMENT_TYPE_DEACTIVATED: 'Tipo de documento desactivado',
  CATEGORY_CREATED: 'Categoría creada',
  CATEGORY_UPDATED: 'Categoría actualizada',
  CATEGORY_DEACTIVATED: 'Categoría desactivada',
  CATEGORY_DELETED: 'Categoría eliminada',
  AREA_CODE_CREATED: 'Área creada',
  AREA_CODE_UPDATED: 'Área actualizada',
  AREA_CODE_DELETED: 'Área eliminada',
  AREA_CODE_DEACTIVATED: 'Área desactivada',
  USER_AREAS_UPDATED: 'Áreas de usuario actualizadas',
  DOCUMENT_CONTENT_REPROCESS: 'Reproceso de contenido documental',
  DOCUMENT_VISIBILITY_POLICY_UPDATED: 'Visibilidad documental actualizada',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  PERMISSIONS: 'Permisos',
  AREAS: 'Áreas',
};

const SEARCH_STATUS_LABELS: Record<string, string> = {
  up: 'activo',
  down: 'inactivo',
  unknown: 'desconocido',
};

function translateAnalyticsBucketLabel(
  label: string,
  kind: 'status' | 'requestType' | 'auditAction' | 'raw',
) {
  switch (kind) {
    case 'status':
      return translateStatus(label);
    case 'requestType':
      return REQUEST_TYPE_LABELS[label] ?? label;
    case 'auditAction':
      return ANALYTICS_ACTION_LABELS[label] ?? label;
    default:
      return label;
  }
}

function SummaryCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <SectionCard className="flex h-full flex-col gap-2">
      <div className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">
        {title}
      </div>
      <div className="font-display text-3xl text-brand-primary">{value}</div>
      {helper ? <div className="text-sm text-brand-textMuted">{helper}</div> : null}
    </SectionCard>
  );
}

function ListCard({
  title,
  items,
  emptyLabel,
  kind = 'raw',
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
  kind?: 'status' | 'requestType' | 'auditAction' | 'raw';
}) {
  return (
    <SectionCard className="flex h-full flex-col gap-4">
      <div className="font-semibold text-brand-text">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-brand-textMuted">{emptyLabel}</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-bg/60 px-3 py-2"
            >
              <span className="text-sm text-brand-text">
                {translateAnalyticsBucketLabel(item.label, kind)}
              </span>
              <Pill tone="INFO">{item.count}</Pill>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default function AnalyticsPage() {
  const { isAdmin } = useAuth();
  const analyticsEnabled = useFeatureFlag('admin-analytics');
  const analyticsQuery = useQuery({
    queryKey: queryKeys.analytics.summary,
    queryFn: adminAnalyticsSummary,
    enabled: analyticsEnabled && isAdmin,
    staleTime: 30000,
  });

  const searchSummary = useMemo(() => {
    const search = analyticsQuery.data?.search;
    if (!search) {
      return [];
    }
    return [
      { label: 'Consultas Elastic', count: search.counters.queryElastic },
      { label: 'Consultas respaldo', count: search.counters.queryFallback },
      { label: 'Documentos indexados', count: search.counters.indexed },
      { label: 'Reintentos', count: search.counters.retries },
      { label: 'Descartados', count: search.counters.dropped },
    ];
  }, [analyticsQuery.data?.search]);

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Analítica"
          subtitle="Resumen operativo del sistema para seguimiento administrativo."
        />

        {!analyticsEnabled ? (
          <NoticeBanner variant="warning" title="Analítica deshabilitada">
            La analítica administrativa está deshabilitada por configuración.
          </NoticeBanner>
        ) : analyticsQuery.isLoading ? (
          <SectionCard className="flex items-center justify-center p-10">
            <Spinner />
          </SectionCard>
        ) : analyticsQuery.isError || !analyticsQuery.data ? (
          <NoticeBanner variant="error" title="No se pudo cargar la analítica">
            Vuelve a intentarlo en unos minutos o revisa el estado del backend.
          </NoticeBanner>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Documentos"
                value={analyticsQuery.data.documents.total}
                helper={`${analyticsQuery.data.documents.createdLast7d} creados en 7 días`}
              />
              <SummaryCard
                title="Registros aprobados"
                value={analyticsQuery.data.registrations.approvedLast30d}
                helper={`${analyticsQuery.data.registrations.pendingApproval} pendientes de aprobación`}
              />
              <SummaryCard
                title="Solicitudes pendientes"
                value={analyticsQuery.data.permissionRequests.totalPending}
                helper="Permisos y áreas pendientes"
              />
              <SummaryCard
                title="Eventos de auditoría"
                value={analyticsQuery.data.audit.totalLast24h}
                helper={`${analyticsQuery.data.audit.accessDeniedLast24h} accesos denegados en 24h`}
              />
            </div>

            <SectionCard className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-brand-text">Estado de búsqueda</div>
                <div className="text-sm text-brand-textMuted">
                  Generado el {formatDate(analyticsQuery.data.generatedAt)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill
                  tone={
                    analyticsQuery.data.search.elasticStatus === 'up'
                      ? 'APPROVED'
                      : analyticsQuery.data.search.elasticStatus === 'down'
                        ? 'REJECTED'
                        : 'INFO'
                  }
                >
                  Elastic: {SEARCH_STATUS_LABELS[analyticsQuery.data.search.elasticStatus] ?? analyticsQuery.data.search.elasticStatus}
                </Pill>
                <Pill tone="INFO">
                  Cola: {analyticsQuery.data.search.queue.pendingJobs} pendiente(s)
                </Pill>
                <Pill
                  tone={
                    analyticsQuery.data.search.queue.workerRunning
                      ? 'APPROVED'
                      : 'REJECTED'
                  }
                >
                  Worker:{' '}
                  {analyticsQuery.data.search.queue.workerRunning
                    ? 'activo'
                    : 'inactivo'}
                </Pill>
              </div>
            </SectionCard>

            <div className="grid gap-4 xl:grid-cols-2">
              <ListCard
                title="Documentos por estado"
                items={analyticsQuery.data.documents.byStatus}
                emptyLabel="Sin documentos registrados."
                kind="status"
              />
              <ListCard
                title="Áreas con más documentos"
                items={analyticsQuery.data.documents.topAreas}
                emptyLabel="Sin áreas con actividad."
              />
              <ListCard
                title="Registros por estado"
                items={analyticsQuery.data.registrations.byStatus}
                emptyLabel="Sin registros de usuarios."
                kind="status"
              />
              <ListCard
                title="Solicitudes por tipo"
                items={analyticsQuery.data.permissionRequests.byType}
                emptyLabel="Sin solicitudes registradas."
                kind="requestType"
              />
              <ListCard
                title="Solicitudes por estado"
                items={analyticsQuery.data.permissionRequests.byStatus}
                emptyLabel="Sin solicitudes registradas."
                kind="status"
              />
              <ListCard
                title="Acciones más frecuentes"
                items={analyticsQuery.data.audit.topActionsLast7d}
                emptyLabel="Sin eventos recientes."
                kind="auditAction"
              />
            </div>

            <ListCard
              title="Actividad de búsqueda e indexación"
              items={searchSummary}
              emptyLabel="Sin actividad de búsqueda disponible."
            />
          </>
        )}
      </section>
    </PageContainer>
  );
}
