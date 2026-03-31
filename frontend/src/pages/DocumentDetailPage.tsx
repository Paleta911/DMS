import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { downloadVersion } from '../api/endpoints/versions';
import {
  getDocument,
  getDocumentVersions,
  getWorkflow,
  uploadDocument,
  workflowApprove,
  workflowAssign,
  workflowObsolete,
  workflowReview,
  workflowSubmit,
} from '../api/endpoints/documents';
import { Button } from '../components/ui/Button';
import { StatusBadge, Pill } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../utils/date';
import { downloadBlob } from '../utils/download';
import { AccessDenied } from '../components/AccessDenied';
import { ResponsiveTable, type ResponsiveColumn } from '../components/ui/ResponsiveTable';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/layout/SectionCard';
import { ResponsiveActions } from '../components/layout/ResponsiveActions';
import { FadeInSection } from '../components/ui/Motion';
import type { WorkflowApproval, Version } from '../types/documents';
import type { UserSearchItem } from '../types/users';
import { UserSearchInput, getAssignmentEligibility } from '../components/users/UserSearchInput';
import { NoticeBanner } from '../components/ui/NoticeBanner';
import { translateStatus } from '../utils/labels';
import { getApiErrorMessage } from '../utils/apiError';
import { queryClient } from '../app/queryClient';
import { invalidateDocumentScopeQueries, invalidateWorkflowQueries } from '../app/queryInvalidation';
import { queryKeys } from '../app/queryKeys';
import { useCatalogQueries } from '../hooks/useCatalogQueries';

const assignSchema = z.object({
  revisoUserId: z.coerce.number().int().positive(),
  aproboUserId: z.coerce.number().int().positive(),
});

const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comentario: z.string().max(500).optional(),
});

function parseConsecutivo(codigo?: string | null) {
  if (!codigo) return undefined;
  const parts = codigo.split('-');
  const value = Number(parts[parts.length - 1]);
  return Number.isNaN(value) ? undefined : value;
}

function getTextExtractionBadge(version: Version) {
  if (version.textSource === 'PDF_OCR') {
    return {
      tone: 'WARN' as const,
      label: version.ocrPageCount ? `OCR (${version.ocrPageCount} pág.)` : 'OCR',
      help: 'Texto extraído por OCR desde un PDF escaneado.',
    };
  }
  if (version.textSource === 'PDF_TEXT') {
    return {
      tone: 'APPROVED' as const,
      label: 'PDF con texto',
      help: 'Texto extraído directamente del PDF.',
    };
  }
  if (version.textSource === 'DOCX_TEXT') {
    return {
      tone: 'APPROVED' as const,
      label: 'DOCX con texto',
      help: 'Texto extraído directamente del archivo Word.',
    };
  }
  return {
    tone: 'default' as const,
    label: 'Sin texto indexable',
    help: 'No se logró extraer texto para búsqueda en esta versión.',
  };
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const documentId = Number(id);
  const { user, isAdmin } = useAuth();
  const { notify } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<null | 'submit' | 'obsolete'>(null);
  const [decisionOpen, setDecisionOpen] = useState<
    | { type: 'review' | 'approve'; decision: 'APPROVED' | 'REJECTED' }
    | null
  >(null);
  const [actionLoading, setActionLoading] = useState<
    null | 'assign' | 'decision' | 'submit' | 'obsolete' | 'upload'
  >(null);
  const [assignUsers, setAssignUsers] = useState<{
    reviso: UserSearchItem | null;
    aprobo: UserSearchItem | null;
  }>({ reviso: null, aprobo: null });
  const [decisionComment, setDecisionComment] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    nombreDocumento: '',
    comentario: '',
    categoryId: '',
    documentTypeCode: '',
    areaCode: '',
    consecutivo: '',
    file: null as File | null,
  });

  const invalidateDocumentScope = () => {
    invalidateDocumentScopeQueries(queryClient, documentId);
  };

  const invalidateWorkflow = () => {
    invalidateWorkflowQueries(queryClient, documentId);
  };

  const documentQuery = useQuery({
    queryKey: queryKeys.documents.detail(documentId),
    queryFn: () => getDocument(documentId),
    enabled: Number.isFinite(documentId),
  });

  const workflowQuery = useQuery({
    queryKey: queryKeys.documents.workflow(documentId),
    queryFn: () => getWorkflow(documentId),
    enabled: Number.isFinite(documentId),
  });

  const versionsQuery = useQuery({
    queryKey: queryKeys.documents.versions(documentId),
    queryFn: () => getDocumentVersions(documentId),
    enabled: Number.isFinite(documentId),
  });

  const { categoriesQuery, typesQuery, areasQuery } = useCatalogQueries();

  const approvals = workflowQuery.data?.approvals ?? [];
  const reviewer = useMemo(
    () => approvals.find((approval) => approval.step === 'REVISO')?.user?.email ?? 'Sin asignar',
    [approvals],
  );
  const approver = useMemo(
    () => approvals.find((approval) => approval.step === 'APROBO')?.user?.email ?? 'Sin asignar',
    [approvals],
  );
  const elaborador = useMemo(
    () => approvals.find((approval) => approval.step === 'ELABORO')?.user?.email ?? 'Sin asignar',
    [approvals],
  );

  const isReviewer = approvals.some(
    (approval) => approval.step === 'REVISO' && approval.user?.id === user?.id,
  );
  const isApprover = approvals.some(
    (approval) => approval.step === 'APROBO' && approval.user?.id === user?.id,
  );
  const isElaborador = approvals.some(
    (approval) => approval.step === 'ELABORO' && approval.user?.id === user?.id,
  );
  const versions = versionsQuery.data ?? [];

  const revisoEligibility = getAssignmentEligibility(assignUsers.reviso, 'review');
  const aproboEligibility = getAssignmentEligibility(assignUsers.aprobo, 'approve');
  const canSaveAssignment =
    Boolean(assignUsers.reviso && assignUsers.aprobo) &&
    revisoEligibility.isEligible &&
    aproboEligibility.isEligible;

  const openUpload = () => {
    const doc = documentQuery.data;
    if (!doc) return;
    setUploadForm({
      nombreDocumento: doc.nombre,
      comentario: '',
      categoryId: doc.category?.id ? String(doc.category.id) : '',
      documentTypeCode: doc.documentType?.code ?? '',
      areaCode: doc.areaCode?.code ?? '',
      consecutivo: String(parseConsecutivo(doc.codigo) ?? ''),
      file: null,
    });
    setUploadOpen(true);
  };

  const submitUpload = async () => {
    if (!uploadForm.file) {
      notify('Selecciona un archivo', 'error');
      return;
    }
    setActionLoading('upload');
    const form = new FormData();
    form.append('file', uploadForm.file);
    form.append('nombreDocumento', uploadForm.nombreDocumento);
    if (uploadForm.comentario) form.append('comentario', uploadForm.comentario);
    if (uploadForm.categoryId) form.append('categoryId', uploadForm.categoryId);
    if (uploadForm.documentTypeCode) form.append('documentTypeCode', uploadForm.documentTypeCode);
    if (uploadForm.areaCode) form.append('areaCode', uploadForm.areaCode);
    if (uploadForm.consecutivo) form.append('consecutivo', uploadForm.consecutivo);

    try {
      await uploadDocument(form);
      notify('Nueva versión cargada', 'success');
      setUploadOpen(false);
      invalidateDocumentScope();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 403) {
        notify('Acceso denegado', 'error');
      } else {
        notify(getApiErrorMessage(error, 'Error al subir'), 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const submitAssign = async () => {
    if (!canSaveAssignment) {
      notify('Selecciona usuarios aptos para revisión y aprobación', 'error');
      return;
    }
    const validation = assignSchema.safeParse({
      revisoUserId: assignUsers.reviso?.id,
      aproboUserId: assignUsers.aprobo?.id,
    });
    if (!validation.success) {
      notify('Selecciona usuarios válidos', 'error');
      return;
    }
    setActionLoading('assign');
    try {
      await workflowAssign(documentId, validation.data.revisoUserId, validation.data.aproboUserId);
      notify('Flujo actualizado', 'success');
      setAssignOpen(false);
      invalidateWorkflow();
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error al asignar'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const submitDecision = async () => {
    if (!decisionOpen) return;
    const validation = decisionSchema.safeParse({
      decision: decisionOpen.decision,
      comentario: decisionComment || undefined,
    });
    if (!validation.success) {
      notify('Decisión inválida', 'error');
      return;
    }
    setActionLoading('decision');
    try {
      if (decisionOpen.type === 'review') {
        await workflowReview(documentId, validation.data);
      } else {
        await workflowApprove(documentId, validation.data);
      }
      notify('Decisión registrada', 'success');
      setDecisionOpen(null);
      setDecisionComment('');
      invalidateWorkflow();
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error en decisión'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const submitReview = async () => {
    setActionLoading('submit');
    try {
      await workflowSubmit(documentId);
      notify('Enviado a revisión', 'success');
      invalidateWorkflow();
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error en el flujo'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const markObsolete = async () => {
    setActionLoading('obsolete');
    try {
      await workflowObsolete(documentId);
      notify('Documento marcado como obsoleto', 'success');
      invalidateDocumentScope();
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error al actualizar'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const buildDownloadName = (versionId: number, originalName?: string | null, storedName?: string) => {
    const ext = originalName?.includes('.') ? `.${originalName.split('.').pop()}` : '';
    const base =
      documentQuery.data?.codigo?.trim()
        ? `${documentQuery.data.codigo}-v${versionId}`
        : storedName ?? `version-${versionId}`;
    return `${base}${ext}`;
  };

  const parseBlobError = async (blob: Blob) => {
    try {
      const text = await blob.text();
      const json = JSON.parse(text);
      return json?.message ?? text;
    } catch {
      return 'Error al descargar';
    }
  };

  const handleDownload = async (versionId: number, originalName?: string | null, storedName?: string) => {
    try {
      const { blob } = await downloadVersion(versionId);
      downloadBlob(blob, buildDownloadName(versionId, originalName, storedName));
    } catch (error: any) {
      if (error?.response?.data instanceof Blob) {
        const message = await parseBlobError(error.response.data);
        notify(message, 'error');
        return;
      }
      notify(getApiErrorMessage(error, 'No se pudo descargar'), 'error');
    }
  };

  const approvalsColumns: ResponsiveColumn<WorkflowApproval>[] = [
    { header: 'Paso', cell: (approval) => approval.step },
    { header: 'Usuario', cell: (approval) => approval.user?.email ?? '-' },
    {
      header: 'Decisión',
      cell: (approval) => (
        <Pill
          tone={
            approval.decision === 'APPROVED'
              ? 'APPROVED'
              : approval.decision === 'REJECTED'
              ? 'OBSOLETE'
              : 'default'
          }
        >
          {translateStatus(approval.decision)}
        </Pill>
      ),
    },
    { header: 'Comentario', cell: (approval) => approval.comentario ?? '-' },
    { header: 'Fecha', cell: (approval) => formatDate(approval.decidedAt) },
  ];

  const versionsColumns: ResponsiveColumn<Version>[] = [
    { header: 'Archivo', cell: (version) => (
        <span className="block max-w-[240px] truncate">{version.originalName ?? version.storedName ?? `Versión ${version.id}`}</span>
      ), className: 'max-w-[260px]' },
    {
      header: 'Extracción',
      cell: (version) => {
        const badge = getTextExtractionBadge(version);
        return (
          <div className="flex flex-col gap-1">
            <Pill tone={badge.tone}>{badge.label}</Pill>
            <span className="text-xs text-brand-textMuted">{badge.help}</span>
          </div>
        );
      },
      className: 'min-w-[220px]',
    },
    { header: 'Comentario', cell: (version) => (
        <span className="block max-w-[260px] truncate">{version.comentario ?? '-'}</span>
      ), className: 'max-w-[280px]' },
    { header: 'Usuario', cell: (version) => version.uploadedBy?.email ?? '-' },
    { header: 'Fecha', cell: (version) => formatDate(version.createdAt) },
    {
      header: '',
      cell: (version) => (
        <Button variant="outline" onClick={() => handleDownload(version.id, version.originalName, version.storedName)}>
          Descargar
        </Button>
      ),
    },
  ];

  const loading = documentQuery.isLoading || workflowQuery.isLoading || versionsQuery.isLoading;
  const forbidden =
    (documentQuery.error as any)?.response?.status === 403 ||
    (workflowQuery.error as any)?.response?.status === 403;

  if (forbidden) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <FadeInSection>
          <PageHeader
            title={documentQuery.data?.nombre ?? 'Documento'}
            subtitle="Detalle, flujo y versiones."
            actions={
              <ResponsiveActions>
                <Button variant="outline" onClick={openUpload} disabled={actionLoading !== null}>
                  Subir versión
                </Button>
                {isAdmin ? (
                  <Button variant="secondary" onClick={() => setAssignOpen(true)} disabled={actionLoading !== null}>
                    Asignar revisión/aprobación
                  </Button>
                ) : null}
              </ResponsiveActions>
            }
          />
        </FadeInSection>

        {loading ? (
          <FadeInSection delay={0.05}>
            <NoticeBanner title="Cargando documento">
              <span className="inline-flex items-center gap-2">
                <Spinner /> Obteniendo detalle, flujo y versiones.
              </span>
            </NoticeBanner>
          </FadeInSection>
        ) : documentQuery.isError ? (
          <FadeInSection delay={0.05}>
            <NoticeBanner variant="error" title="No se pudo cargar el documento">
              Vuelve al listado y abre de nuevo el documento. Si el problema persiste, verifica tus permisos.
            </NoticeBanner>
          </FadeInSection>
        ) : (
          <>
            <FadeInSection delay={0.05}>
              <SectionCard>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                      {documentQuery.data?.codigo ?? 'Sin código'}
                    </div>
                    <div className="font-display text-2xl text-ink">{documentQuery.data?.nombre}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={documentQuery.data?.status ?? 'DRAFT'} />
                      {documentQuery.data?.documentType?.code ? <Pill>{documentQuery.data.documentType.code}</Pill> : null}
                      {documentQuery.data?.areaCode?.code ? <Pill>{documentQuery.data.areaCode.code}</Pill> : null}
                    </div>
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Actualizado: {formatDate(documentQuery.data?.updatedAt)}
                  </div>
                </div>
              </SectionCard>
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <NoticeBanner
                title="Estado operativo del documento"
                variant={
                  isApprover || isReviewer || isElaborador || isAdmin ? 'info' : 'success'
                }
              >
                {isReviewer
                  ? 'Eres el responsable de revisión. Registra tu decisión cuando el documento esté listo.'
                  : isApprover
                    ? 'Eres el responsable de aprobación final. Revisa el historial antes de decidir.'
                    : isElaborador || isAdmin
                      ? 'Puedes gestionar el flujo, subir nuevas versiones o reasignar responsables.'
                      : 'El documento está disponible solo para consulta y descarga según tus permisos.'}
              </NoticeBanner>
              <div className="grid min-w-0 gap-6 min-[2000px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <SectionCard className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-lg text-ink">Flujo</div>
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">Aprobaciones</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isAdmin || isElaborador ? (
                        <Button
                          variant="outline"
                          onClick={() => setConfirmOpen('submit')}
                          disabled={actionLoading !== null}
                        >
                          Enviar a revisión
                        </Button>
                      ) : null}
                      {isReviewer ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setDecisionOpen({ type: 'review', decision: 'APPROVED' })}
                            disabled={actionLoading !== null}
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDecisionOpen({ type: 'review', decision: 'REJECTED' })}
                            disabled={actionLoading !== null}
                          >
                            Rechazar
                          </Button>
                        </>
                      ) : null}
                      {isApprover ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setDecisionOpen({ type: 'approve', decision: 'APPROVED' })}
                            disabled={actionLoading !== null}
                          >
                            Aprobar final
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDecisionOpen({ type: 'approve', decision: 'REJECTED' })}
                            disabled={actionLoading !== null}
                          >
                            Rechazar
                          </Button>
                        </>
                      ) : null}
                      {isAdmin ? (
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmOpen('obsolete')}
                          disabled={actionLoading !== null}
                        >
                          Obsoleto
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mb-4 grid gap-3 text-sm text-brand-textMuted md:grid-cols-2">
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">Estado</span>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={workflowQuery.data?.status ?? 'DRAFT'} />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">Roles</span>
                      <div className="mt-1 flex flex-col gap-1 text-sm">
                        <span>Elabora: {elaborador}</span>
                        <span>Revisa: {reviewer}</span>
                        <span>Aprueba: {approver}</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveTable
                    columns={approvalsColumns}
                    items={approvals}
                    getRowKey={(item) => item.id}
                    ariaLabel="Historial de aprobaciones del documento"
                    maxDesktopHeightPx={360}
                    stickyHeader
                    virtualized
                    rowHeight={76}
                    renderMobileCard={(approval) => (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                              {approval.step}
                            </div>
                            <div className="text-sm text-brand-textMuted">{approval.user?.email ?? '-'}</div>
                          </div>
                          <Pill
                            tone={
                              approval.decision === 'APPROVED'
                                ? 'APPROVED'
                                : approval.decision === 'REJECTED'
                                ? 'OBSOLETE'
                                : 'default'
                            }
                          >
                            {translateStatus(approval.decision)}
                          </Pill>
                        </div>
                        <div className="text-xs text-brand-textMuted">
                          Comentario: {approval.comentario ?? '-'}
                        </div>
                        <div className="text-xs text-brand-textMuted">{formatDate(approval.decidedAt)}</div>
                      </div>
                    )}
                  />
                </SectionCard>
                <SectionCard className="min-w-0">
                  <div className="font-display text-lg text-ink">Versiones</div>
                  {versions.length === 0 ? (
                    <div className="mt-4">
                      <NoticeBanner title="Sin versiones registradas">
                        Este documento todavía no tiene archivos asociados para descarga.
                      </NoticeBanner>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <ResponsiveTable
                        columns={versionsColumns}
                        items={versions}
                        getRowKey={(item) => item.id}
                        ariaLabel="Versiones disponibles del documento"
                        maxDesktopHeightPx={360}
                        stickyHeader
                        virtualized
                        rowHeight={76}
                        renderMobileCard={(version) => (
                          <div className="flex flex-col gap-3">
                            <div className="font-semibold text-ink">
                              {version.originalName ?? version.storedName ?? `Versión ${version.id}`}
                            </div>
                            <div className="text-xs text-brand-textMuted">
                              {version.comentario ?? 'Sin comentario'}
                            </div>
                            <div className="text-xs text-brand-textMuted">
                              {version.uploadedBy?.email ?? '-'} · {formatDate(version.createdAt)}
                            </div>
                            <div className="text-xs text-brand-textMuted">
                              {getTextExtractionBadge(version).label}
                            </div>
                            <ResponsiveActions>
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => handleDownload(version.id, version.originalName, version.storedName)}
                              >
                                Descargar
                              </Button>
                            </ResponsiveActions>
                          </div>
                        )}
                      />
                    </div>
                  )}
                </SectionCard>
              </div>
            </FadeInSection>
          </>
        )}

        <Modal open={assignOpen} title="Asignar revisión / aprobación" onClose={() => setAssignOpen(false)}>
          <div className="grid gap-4">
            <NoticeBanner title="Selecciona responsables aptos">
              El usuario de revisión debe tener permiso para revisar y el de aprobación debe tener permiso para aprobar.
            </NoticeBanner>
            <UserSearchInput
              label="Revisión (correo o nombre)"
              placeholder="Busca al revisor..."
              kind="review"
              selectedUser={assignUsers.reviso}
              onSelect={(user) => setAssignUsers((prev) => ({ ...prev, reviso: user }))}
            />
            <UserSearchInput
              label="Aprobación (correo o nombre)"
              placeholder="Busca al aprobador..."
              kind="approve"
              selectedUser={assignUsers.aprobo}
              onSelect={(user) => setAssignUsers((prev) => ({ ...prev, aprobo: user }))}
            />
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submitAssign} disabled={actionLoading === 'assign' || !canSaveAssignment}>
                {actionLoading === 'assign' ? 'Guardando...' : 'Guardar'}
              </Button>
            </ResponsiveActions>
          </div>
        </Modal>

        <Modal
          open={confirmOpen !== null}
          title={confirmOpen === 'submit' ? 'Enviar a revisión' : 'Marcar obsoleto'}
          onClose={() => setConfirmOpen(null)}
        >
          <div className="grid gap-4">
            <NoticeBanner variant={confirmOpen === 'obsolete' ? 'warning' : 'info'}>
              {confirmOpen === 'submit'
                ? 'Se notificará el flujo de revisión configurado para este documento.'
                : 'El documento dejará de considerarse vigente dentro del sistema.'}
            </NoticeBanner>
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setConfirmOpen(null)}>
                Cancelar
              </Button>
              <Button
                variant={confirmOpen === 'obsolete' ? 'danger' : 'secondary'}
                onClick={async () => {
                  if (confirmOpen === 'submit') {
                    await submitReview();
                  } else {
                    await markObsolete();
                  }
                  setConfirmOpen(null);
                }}
                disabled={actionLoading !== null}
              >
                Confirmar
              </Button>
            </ResponsiveActions>
          </div>
        </Modal>

        <Modal open={Boolean(decisionOpen)} title="Decisión" onClose={() => setDecisionOpen(null)}>
          <div className="grid gap-4">
            <NoticeBanner title="Confirma tu decisión">
              {decisionOpen?.type === 'review'
                ? `Registrarás la decisión de revisión: ${translateStatus(decisionOpen?.decision)}.`
                : `Registrarás la decisión final: ${translateStatus(decisionOpen?.decision)}.`}
            </NoticeBanner>
            <Textarea
              label="Comentario"
              value={decisionComment}
              onChange={(event) => setDecisionComment(event.target.value)}
            />
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setDecisionOpen(null)}>
                Cancelar
              </Button>
              <Button onClick={submitDecision} disabled={actionLoading === 'decision'}>
                {actionLoading === 'decision' ? 'Guardando...' : 'Confirmar'}
              </Button>
            </ResponsiveActions>
          </div>
        </Modal>

        <Modal open={uploadOpen} title="Subir nueva versión" onClose={() => setUploadOpen(false)}>
          <div className="grid gap-4">
            <NoticeBanner title="Mantén la trazabilidad del documento">
              La nueva versión conservará el historial del documento actual y reiniciará el flujo si ya estaba aprobado. Si el archivo es un PDF escaneado, el sistema intentará aplicar OCR para volverlo buscable por contenido dentro del sistema.
            </NoticeBanner>
            <Input
              label="Nombre documento"
              value={uploadForm.nombreDocumento}
              onChange={(event) => setUploadForm((prev) => ({ ...prev, nombreDocumento: event.target.value }))}
            />
            <Textarea
              label="Comentario"
              value={uploadForm.comentario}
              onChange={(event) => setUploadForm((prev) => ({ ...prev, comentario: event.target.value }))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Categoría"
                value={uploadForm.categoryId}
                onChange={(event) => setUploadForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              >
                <option value="">Sin categoría</option>
                {categoriesQuery.data?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </Select>
              <Input
                label="Archivo"
                type="file"
                onChange={(event) =>
                  setUploadForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Tipo"
                value={uploadForm.documentTypeCode}
                onChange={(event) => setUploadForm((prev) => ({ ...prev, documentTypeCode: event.target.value }))}
              >
                <option value="">No SIG</option>
                {typesQuery.data?.map((type) => (
                  <option key={type.id} value={type.code}>
                    {type.code}
                  </option>
                ))}
              </Select>
              <Select
                label="Área"
                value={uploadForm.areaCode}
                onChange={(event) => setUploadForm((prev) => ({ ...prev, areaCode: event.target.value }))}
              >
                <option value="">No SIG</option>
                {areasQuery.data?.map((area) => (
                  <option key={area.id} value={area.code}>
                    {area.code}
                  </option>
                ))}
              </Select>
              <Input
                label="Consecutivo"
                value={uploadForm.consecutivo}
                onChange={(event) => setUploadForm((prev) => ({ ...prev, consecutivo: event.target.value }))}
              />
            </div>
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submitUpload} disabled={actionLoading === 'upload'}>
                {actionLoading === 'upload' ? 'Subiendo...' : 'Subir'}
              </Button>
            </ResponsiveActions>
          </div>
        </Modal>
      </section>
    </PageContainer>
  );
}
