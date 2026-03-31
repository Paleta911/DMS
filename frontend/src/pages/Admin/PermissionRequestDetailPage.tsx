import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  adminPermissionRequestApprove,
  adminPermissionRequestApprovePartial,
  adminPermissionRequestGet,
  adminPermissionRequestReject,
} from '../../api/endpoints/permissionRequests';
import { useAuth } from '../../auth/AuthContext';
import { AccessDenied } from '../../components/AccessDenied';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { SectionCard } from '../../components/layout/SectionCard';
import { useToast } from '../../components/ToastProvider';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { NoticeBanner } from '../../components/ui/NoticeBanner';
import { Textarea } from '../../components/ui/Textarea';
import { translateStatus } from '../../utils/labels';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  getPermissionRequestDetail,
  getPermissionRequestTypeLabel,
  parsePermissionRequestAreaCodes,
} from '../../utils/permissionRequests';
import { queryClient } from '../../app/queryClient';
import { invalidateAdminPermissionRequests } from '../../app/queryInvalidation';
import { queryKeys } from '../../app/queryKeys';

export default function PermissionRequestDetailPage() {
  const { id } = useParams();
  const requestId = Number(id);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { notify } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialAreaCodes, setPartialAreaCodes] = useState<string[]>([]);
  const [partialNote, setPartialNote] = useState('');

  const detailQuery = useQuery({
    queryKey: queryKeys.permissions.adminDetail(requestId),
    queryFn: () => adminPermissionRequestGet(requestId),
    enabled: Number.isFinite(requestId),
  });

  const approveMutation = useMutation({
    mutationFn: () => adminPermissionRequestApprove(requestId),
    onSuccess: () => {
      notify('Solicitud aprobada', 'success');
      invalidateAdminPermissionRequests(queryClient, requestId);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al aprobar'), 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminPermissionRequestReject(requestId, rejectReason || undefined),
    onSuccess: () => {
      notify('Solicitud rechazada', 'success');
      setRejectOpen(false);
      setRejectReason('');
      invalidateAdminPermissionRequests(queryClient, requestId);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al rechazar'), 'error');
    },
  });

  const partialApproveMutation = useMutation({
    mutationFn: () =>
      adminPermissionRequestApprovePartial(requestId, {
        areaCodes: partialAreaCodes,
        note: partialNote || undefined,
      }),
    onSuccess: () => {
      notify('Aprobación parcial aplicada', 'success');
      setPartialOpen(false);
      setPartialAreaCodes([]);
      setPartialNote('');
      invalidateAdminPermissionRequests(queryClient, requestId);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al aprobar parcialmente'), 'error');
    },
  });

  const request = detailQuery.data;
  const detail = useMemo(() => (request ? getPermissionRequestDetail(request) : '-'), [request]);

  const requestedAreas = useMemo(
    () => parsePermissionRequestAreaCodes(request?.requestedAreaCodes),
    [request?.requestedAreaCodes],
  );
  const reviewedLabel = request?.status === 'PENDING' ? null : translateStatus(request?.status ?? 'PENDING');

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
          title={`Solicitud #${requestId}`}
          subtitle="Detalle de solicitud de permisos/áreas."
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/permission-requests')}>
              Volver
            </Button>
          }
        />

        {detailQuery.isLoading ? (
          <NoticeBanner title="Cargando solicitud">
            Obteniendo el detalle y el historial de revisión de la solicitud seleccionada.
          </NoticeBanner>
        ) : null}

        {detailQuery.isError ? (
          <NoticeBanner variant="error" title="No se pudo cargar la solicitud">
            Intenta volver a la lista y abre de nuevo el detalle.
          </NoticeBanner>
        ) : null}

        {request?.status === 'PENDING' ? (
          <NoticeBanner title="Solicitud pendiente">
            Revisa el detalle y decide si la solicitud debe aprobarse, aprobarse parcialmente o rechazarse.
          </NoticeBanner>
        ) : request ? (
          <NoticeBanner variant="success" title="Solicitud atendida">
            Esta solicitud ya fue marcada como {reviewedLabel?.toLowerCase()}. Solo se muestra para consulta.
          </NoticeBanner>
        ) : null}

        <SectionCard>
          <div className="grid gap-3 text-sm text-brand-text sm:grid-cols-2">
            <div>
              <span className="text-brand-textMuted">Usuario:</span> {request?.user?.email ?? '-'}
            </div>
            <div>
              <span className="text-brand-textMuted">Estado:</span>{' '}
              {request ? translateStatus(request.status) : '-'}
            </div>
            <div>
              <span className="text-brand-textMuted">Tipo:</span>{' '}
              {request ? getPermissionRequestTypeLabel(request) : '-'}
            </div>
            <div>
              <span className="text-brand-textMuted">Fecha:</span>{' '}
              {request?.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
            </div>
            <div className="sm:col-span-2">
              <span className="text-brand-textMuted">Detalle:</span> {detail}
            </div>
            <div className="sm:col-span-2">
              <span className="text-brand-textMuted">Comentario del solicitante:</span>{' '}
              {request?.comment ?? '-'}
            </div>
            <div className="sm:col-span-2">
              <span className="text-brand-textMuted">Notas de revisión:</span>{' '}
              {request?.reviewReason ?? '-'}
            </div>
          </div>
        </SectionCard>

        {request?.status === 'PENDING' ? (
          <SectionCard>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                Aprobar
              </Button>
              {request?.requestType === 'AREAS' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPartialAreaCodes([]);
                    setPartialNote('');
                    setPartialOpen(true);
                  }}
                  disabled={partialApproveMutation.isPending || requestedAreas.length === 0}
                >
                  Aprobar parcial
                </Button>
              ) : null}
              <Button variant="danger" onClick={() => setRejectOpen(true)} disabled={rejectMutation.isPending}>
                Rechazar
              </Button>
            </div>
          </SectionCard>
        ) : null}
      </section>

      <Modal open={rejectOpen} title="Rechazar solicitud" onClose={() => setRejectOpen(false)}>
        <div className="grid gap-4">
          <Textarea
            label="Motivo de rechazo (opcional)"
            rows={4}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
              Rechazar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={partialOpen} title="Aprobación parcial de áreas" onClose={() => setPartialOpen(false)}>
        <div className="grid gap-4">
          <NoticeBanner title="Selecciona las áreas a aprobar">
            Las áreas no seleccionadas seguirán pendientes hasta que se aprueben o rechacen por separado.
          </NoticeBanner>
          <div className="grid gap-2">
            {requestedAreas.length === 0 ? (
              <div className="text-sm text-brand-textMuted">
                No hay áreas pendientes para esta solicitud.
              </div>
            ) : (
              requestedAreas.map((code) => (
                <label key={code} className="flex items-center gap-2 text-sm text-brand-text">
                  <input
                    type="checkbox"
                    checked={partialAreaCodes.includes(code)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setPartialAreaCodes((prev) => [...prev, code]);
                        return;
                      }
                      setPartialAreaCodes((prev) => prev.filter((item) => item !== code));
                    }}
                    className="h-4 w-4 rounded border-brand-border text-brand-primary"
                  />
                  {code}
                </label>
              ))
            )}
          </div>
          <Textarea
            label="Nota de aprobación parcial (opcional)"
            rows={3}
            value={partialNote}
            onChange={(event) => setPartialNote(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPartialOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => partialApproveMutation.mutate()}
              disabled={partialAreaCodes.length === 0 || partialApproveMutation.isPending}
            >
              Confirmar aprobación parcial
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
