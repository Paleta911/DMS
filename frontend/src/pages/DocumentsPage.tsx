import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Upload, Eye } from 'lucide-react';
import { documentsList, uploadDocument } from '../api/endpoints/documents';
import { searchQuery } from '../api/endpoints/search';
import type { Document } from '../types/documents';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../utils/date';
import { AccessDenied } from '../components/AccessDenied';
import { EmptyState } from '../components/EmptyState';
import { ResponsiveTable, type ResponsiveColumn } from '../components/ui/ResponsiveTable';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ResultsToolbar } from '../components/layout/ResultsToolbar';
import { SectionCard } from '../components/layout/SectionCard';
import { ResponsiveActions } from '../components/layout/ResponsiveActions';
import { FadeInSection } from '../components/ui/Motion';
import { Pill } from '../components/ui/Badge';
import { NoticeBanner } from '../components/ui/NoticeBanner';
import {
  getSearchRelevance,
  translateSearchEngine,
  translateStatus,
} from '../utils/labels';
import { getApiErrorMessage } from '../utils/apiError';
import { queryClient } from '../app/queryClient';
import { invalidateCatalogQueries, invalidateDocumentListQueries } from '../app/queryInvalidation';
import { queryKeys } from '../app/queryKeys';
import { useCatalogQueries } from '../hooks/useCatalogQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useSavedViews } from '../hooks/useSavedViews';
import { SavedViewsToolbar } from '../components/layout/SavedViewsToolbar';
import { ExportMenu } from '../components/ui/ExportMenu';
import { downloadJson, downloadText } from '../utils/download';

const LIMIT_OPTIONS = [10, 20, 30];
type UploadState = {
  open: boolean;
  mode: 'new' | 'version';
  document?: Document | null;
};

type DocumentRow = {
  id: number;
  codigo?: string | null;
  nombre: string;
  categoryNombre?: string | null;
  documentTypeCode?: string | null;
  areaCode?: string | null;
  status?: Document['status'];
  updatedAt?: string;
  score?: number | null;
  sourceDocument?: Document;
};

function parseConsecutivo(codigo?: string | null) {
  if (!codigo) return undefined;
  const parts = codigo.split('-');
  const value = Number(parts[parts.length - 1]);
  return Number.isNaN(value) ? undefined : value;
}

export default function DocumentsPage() {
  const { notify } = useToast();
  const { user, isAdmin } = useAuth();
  const { initialFilters, views, saveCurrentView, deleteView, rememberLastUsed } =
    useSavedViews<{
      page: number;
      limit: number;
      q: string;
      categoryId: string;
      documentTypeCode: string;
      areaCode: string;
      sortByName: string;
    }>({
      storageKey: 'documents-filters',
      scope: user?.email ?? null,
      fallback: {
        page: 1,
        limit: 20,
        q: '',
        categoryId: '',
        documentTypeCode: '',
        areaCode: '',
        sortByName: '',
      },
    });
  const [page, setPage] = useState(initialFilters.page);
  const [limit, setLimit] = useState(initialFilters.limit);
  const [filters, setFilters] = useState({
    q: initialFilters.q,
    categoryId: initialFilters.categoryId,
    documentTypeCode: initialFilters.documentTypeCode,
    areaCode: initialFilters.areaCode,
    sortByName: initialFilters.sortByName,
  });
  const [uploadState, setUploadState] = useState<UploadState>({
    open: false,
    mode: 'new',
  });
  const [uploadForm, setUploadForm] = useState({
    nombreDocumento: '',
    comentario: '',
    categoryId: '',
    documentTypeCode: '',
    areaCode: '',
    consecutivo: '',
    file: null as File | null,
  });
  const debouncedQuery = useDebouncedValue(filters.q);
  const hasTextSearch = Boolean(debouncedQuery.trim());
  const hasActiveFilters = Boolean(
    filters.q.trim() ||
      filters.categoryId ||
      filters.documentTypeCode ||
      filters.areaCode ||
      filters.sortByName,
  );

  const documentsQuery = useQuery({
    queryKey: queryKeys.documents.list({
      page,
      limit,
      categoryId: filters.categoryId,
      documentTypeCode: filters.documentTypeCode,
      areaCode: filters.areaCode,
      sortByName: filters.sortByName,
    }),
    queryFn: () =>
      documentsList({
        page,
        limit,
        categoryId: filters.categoryId,
        documentTypeCode: filters.documentTypeCode,
        areaCode: filters.areaCode,
        sortByName: filters.sortByName as 'az' | 'za' | '',
      }),
    enabled: !hasTextSearch,
    placeholderData: (previousData) => previousData,
  });

  const searchQueryResult = useQuery({
    queryKey: queryKeys.documents.searchList(
      { ...filters, q: debouncedQuery },
      page,
      limit,
    ),
    enabled: hasTextSearch,
    queryFn: () =>
      searchQuery({
        q: debouncedQuery.trim() || undefined,
        categoryId: filters.categoryId || undefined,
        documentTypeCode: filters.documentTypeCode || undefined,
        areaCode: filters.areaCode || undefined,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const { categoriesQuery, typesQuery, areasQuery } = useCatalogQueries();

  const documentsById = useMemo(
    () => new Map((documentsQuery.data?.items ?? []).map((doc) => [String(doc.id), doc])),
    [documentsQuery.data?.items],
  );

  const rows = useMemo<DocumentRow[]>(() => {
    const baseRows = hasTextSearch
      ? (searchQueryResult.data?.items ?? []).map((item) => {
          const sourceDocument = documentsById.get(String(item.documentId));
          return {
            id: Number(item.documentId),
            codigo: item.codigo ?? sourceDocument?.codigo,
            nombre: item.nombre ?? sourceDocument?.nombre ?? '-',
            categoryNombre: item.categoryNombre ?? sourceDocument?.category?.nombre ?? '-',
            documentTypeCode: item.documentTypeCode ?? sourceDocument?.documentType?.code ?? '-',
            areaCode: item.areaCode ?? sourceDocument?.areaCode?.code ?? '-',
            status: item.status ?? sourceDocument?.status,
            updatedAt: sourceDocument?.updatedAt ?? item.updatedAt,
            score: item.score ?? null,
            sourceDocument,
          };
        })
      : (documentsQuery.data?.items ?? []).map((doc) => ({
          id: doc.id,
          codigo: doc.codigo,
          nombre: doc.nombre,
          categoryNombre: doc.category?.nombre ?? '-',
          documentTypeCode: doc.documentType?.code ?? '-',
          areaCode: doc.areaCode?.code ?? '-',
          status: doc.status,
          updatedAt: doc.updatedAt,
          sourceDocument: doc,
        }));

    if (filters.sortByName === 'az') {
      return [...baseRows].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
      );
    }
    if (filters.sortByName === 'za') {
      return [...baseRows].sort((a, b) =>
        b.nombre.localeCompare(a.nombre, 'es', { sensitivity: 'base' }),
      );
    }
    return baseRows;
  }, [
    documentsById,
    documentsQuery.data?.items,
    filters.sortByName,
    hasTextSearch,
    searchQueryResult.data?.items,
  ]);

  const total = hasTextSearch
    ? typeof searchQueryResult.data?.total === 'number'
      ? searchQueryResult.data.total
      : searchQueryResult.data?.total?.value ?? 0
    : documentsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const maxScoreInPage = useMemo(() => {
    if (!hasTextSearch) return null;
    const scores = rows
      .map((row) => row.score)
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
    return scores.length > 0 ? Math.max(...scores) : null;
  }, [hasTextSearch, rows]);

  useEffect(() => {
    rememberLastUsed({
      page,
      limit,
      ...filters,
    });
  }, [filters, limit, page, rememberLastUsed]);

  const openUpload = (mode: UploadState['mode'], document?: Document) => {
    setUploadState({ open: true, mode, document: document ?? null });
    if (mode === 'version' && document) {
      setUploadForm({
        nombreDocumento: document.nombre,
        comentario: '',
        categoryId: document.category?.id ? String(document.category.id) : '',
        documentTypeCode: document.documentType?.code ?? '',
        areaCode: document.areaCode?.code ?? '',
        consecutivo: String(parseConsecutivo(document.codigo) ?? ''),
        file: null,
      });
      return;
    }
    setUploadForm({
      nombreDocumento: '',
      comentario: '',
      categoryId: '',
      documentTypeCode: '',
      areaCode: '',
      consecutivo: '',
      file: null,
    });
  };

  const submitUpload = async () => {
    if (!uploadForm.file) {
      notify('Selecciona un archivo', 'error');
      return;
    }
    if (!uploadForm.nombreDocumento.trim()) {
      notify('Nombre del documento requerido', 'error');
      return;
    }
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
      notify('Documento cargado', 'success');
      setUploadState({ open: false, mode: 'new', document: null });
      invalidateDocumentListQueries(queryClient);
      invalidateCatalogQueries(queryClient);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 403) {
        notify('Acceso denegado', 'error');
      } else {
        notify(getApiErrorMessage(error, 'Error al subir'), 'error');
      }
    }
  };

  const canUploadVersion = (document: Document) => {
    if (isAdmin) return true;
    const area = document.areaCode?.code;
    return Boolean(area && user?.allowedAreaCodes?.includes(area));
  };

  const hasAssignedAreas = isAdmin || (user?.allowedAreaCodes?.length ?? 0) > 0;
  const isSearching = hasActiveFilters;

  const activeQueryError = hasTextSearch ? searchQueryResult.error : documentsQuery.error;
  const errorStatus = (activeQueryError as any)?.response?.status;
  const errorEndpoint =
    (activeQueryError as any)?.config?.url ?? (hasTextSearch ? '/search' : '/documents');
  const errorDetail = errorStatus ? `(${errorStatus} ${errorEndpoint})` : `(${errorEndpoint})`;

  const columns: ResponsiveColumn<DocumentRow>[] = [
    {
      header: 'Código',
      cell: (row) => (
        <span className="block max-w-[140px] truncate text-xs font-semibold">{row.codigo ?? '-'}</span>
      ),
    },
    {
      header: 'Nombre',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="max-w-[220px] truncate font-semibold text-ink">{row.nombre}</span>
          <span className="text-xs text-brand-textMuted">{row.categoryNombre ?? 'Sin categoría'}</span>
        </div>
      ),
    },
    { header: 'Tipo', cell: (row) => row.documentTypeCode ?? '-' },
    { header: 'Área', cell: (row) => row.areaCode ?? '-' },
    { header: 'Categoría', cell: (row) => row.categoryNombre ?? '-' },
    {
      header: 'Coincidencia',
      cell: (row) => {
        if (!hasTextSearch) return '-';
        const relevance = getSearchRelevance(row.score, maxScoreInPage);
        if (relevance.value === null) return '-';
        return <Pill tone={relevance.tone}>{relevance.label}</Pill>;
      },
    },
    { header: 'Estado', cell: (row) => (row.status ? <StatusBadge status={row.status} /> : '-') },
    { header: 'Actualizado', cell: (row) => formatDate(row.updatedAt) },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Link to={`/documents/${row.id}`}>
            <Button variant="outline" className="px-3">
              <Eye size={16} /> Ver
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="px-3"
            onClick={() => row.sourceDocument && openUpload('version', row.sourceDocument)}
            disabled={!row.sourceDocument || !canUploadVersion(row.sourceDocument)}
          >
            <Upload size={16} /> Versión
          </Button>
        </div>
      ),
    },
  ];

  const exportRowsAsCsv = () => {
    const headers = [
      'codigo',
      'nombre',
      'tipo',
      'area',
      'categoria',
      'coincidencia',
      'estado',
      'actualizado',
    ];
    const lines = rows.map((row) =>
      [
        row.codigo ?? '',
        row.nombre,
        row.documentTypeCode ?? '',
        row.areaCode ?? '',
        row.categoryNombre ?? '',
        hasTextSearch ? getSearchRelevance(row.score, maxScoreInPage).label : '',
        row.status ? translateStatus(row.status) : '',
        row.updatedAt ? formatDate(row.updatedAt) : '',
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );
    downloadText(
      [headers.join(','), ...lines].join('\n'),
      `documentos_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
  };

  const exportRowsAsJson = () => {
    downloadJson(
      rows.map((row) => ({
        codigo: row.codigo ?? null,
        nombre: row.nombre,
        tipo: row.documentTypeCode ?? null,
        area: row.areaCode ?? null,
        categoria: row.categoryNombre ?? null,
        coincidencia: hasTextSearch
          ? getSearchRelevance(row.score, maxScoreInPage).label
          : null,
        estado: row.status ? translateStatus(row.status) : null,
        actualizado: row.updatedAt ?? null,
      })),
      `documentos_${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  if (errorStatus === 403) {
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
          title="Documentos"
          subtitle={hasActiveFilters ? 'Búsqueda avanzada por coincidencia.' : 'Listado general.'}
        />

        <FadeInSection>
          <SectionCard>
            {!hasAssignedAreas ? (
              <NoticeBanner variant="warning" title="Sin áreas asignadas" className="mb-4">
                Aún no tienes áreas asignadas. No verás documentos hasta que un administrador te
                asigne al menos un área.
              </NoticeBanner>
            ) : isSearching ? (
              <NoticeBanner title="Búsqueda avanzada activa" className="mb-4">
                Se están mostrando coincidencias por texto y filtros. Si no encuentras un documento,
                limpia los filtros o ajusta la consulta.
              </NoticeBanner>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input
                label="Buscar"
                placeholder="Código o nombre"
                value={filters.q}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, q: event.target.value }));
                  setPage(1);
                }}
              />
              <Select
                label="Categoría"
                value={filters.categoryId}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, categoryId: event.target.value }));
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {categoriesQuery.data?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </Select>
              <Select
                label="Tipo"
                value={filters.documentTypeCode}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, documentTypeCode: event.target.value }));
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {typesQuery.data?.map((type) => (
                  <option key={type.id} value={type.code}>
                    {type.code}
                  </option>
                ))}
              </Select>
              <Select
                label="Área"
                value={filters.areaCode}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, areaCode: event.target.value }));
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {areasQuery.data?.map((area) => (
                  <option key={area.id} value={area.code}>
                    {area.code}
                  </option>
                ))}
              </Select>
              <Select
                label="Orden nombre"
                value={filters.sortByName}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, sortByName: event.target.value }));
                  setPage(1);
                }}
              >
                <option value="">Por defecto</option>
                <option value="az">A - Z</option>
                <option value="za">Z - A</option>
              </Select>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Select
                label="Límite"
                value={String(limit)}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="sm:max-w-[120px]"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <ResponsiveActions>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      q: '',
                      categoryId: '',
                      documentTypeCode: '',
                      areaCode: '',
                      sortByName: '',
                    });
                    setPage(1);
                  }}
                >
                  Limpiar filtros
                </Button>
                <Button variant="secondary" onClick={() => openUpload('new')}>
                  <Upload size={16} /> Subir documento
                </Button>
              </ResponsiveActions>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brand-textMuted">
              {hasActiveFilters ? 'Búsqueda avanzada' : 'Filtrado local'}
            </p>
          </SectionCard>
        </FadeInSection>

        <SavedViewsToolbar
          views={views}
          onApply={(saved) => {
            setPage(saved.page);
            setLimit(saved.limit);
            setFilters({
              q: saved.q,
              categoryId: saved.categoryId,
              documentTypeCode: saved.documentTypeCode,
              areaCode: saved.areaCode,
              sortByName: saved.sortByName,
            });
          }}
          onSave={(name) => {
            saveCurrentView(name, {
              page,
              limit,
              ...filters,
            });
            notify('Vista guardada', 'success');
          }}
          onDelete={(id) => {
            deleteView(id, {
              page,
              limit,
              ...filters,
            });
            notify('Vista eliminada', 'success');
          }}
        />

        {documentsQuery.isLoading || (hasTextSearch && searchQueryResult.isLoading) ? (
          <FadeInSection delay={0.05}>
            <SectionCard className="flex items-center justify-center p-10">
              <Spinner />
            </SectionCard>
          </FadeInSection>
        ) : documentsQuery.isError || (hasTextSearch && searchQueryResult.isError) ? (
          <FadeInSection delay={0.05}>
            <NoticeBanner variant="error" title="No se pudieron cargar los documentos">
              Revisa tu conexión o vuelve a intentarlo. Referencia técnica: {errorDetail}
            </NoticeBanner>
          </FadeInSection>
        ) : total === 0 ? (
          <FadeInSection delay={0.05}>
            <EmptyState
              title="Sin documentos"
              subtitle={
                hasAssignedAreas
                  ? 'Ajusta filtros o sube un documento.'
                  : 'No tienes áreas asignadas, solicita asignación al administrador.'
              }
            />
          </FadeInSection>
        ) : (
          <FadeInSection delay={0.05}>
            <SectionCard>
              <ResultsToolbar
                summary={
                  <>
                    <span>Mostrando {rows.length} de {total}</span>
                    <span>Página {page} de {totalPages}</span>
                    {hasTextSearch ? (
                      <Pill tone={searchQueryResult.data?.engine === 'elastic' ? 'APPROVED' : 'IN_REVIEW'}>
                        Motor: {translateSearchEngine(searchQueryResult.data?.engine)}
                      </Pill>
                    ) : null}
                  </>
                }
                currentPage={page}
                totalPages={totalPages}
                onPrevious={() => setPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                previousDisabled={page <= 1}
                nextDisabled={page >= totalPages}
                actions={
                  <ExportMenu
                    options={[
                      {
                        key: 'csv',
                        label: 'Exportar CSV visible',
                        onClick: exportRowsAsCsv,
                        disabled: rows.length === 0,
                      },
                      {
                        key: 'json',
                        label: 'Exportar JSON visible',
                        onClick: exportRowsAsJson,
                        disabled: rows.length === 0,
                      },
                    ]}
                  />
                }
              />
              <div className="mt-4">
                <ResponsiveTable
                  columns={columns}
                  items={rows}
                  getRowKey={(row) => row.id}
                  ariaLabel="Listado principal de documentos"
                  maxDesktopHeightPx={560}
                  stickyHeader
                  virtualized
                  rowHeight={84}
                  renderMobileCard={(row) => (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                            {row.codigo ?? 'Sin código'}
                          </div>
                          <div className="truncate font-semibold text-ink">{row.nombre}</div>
                          <div className="truncate text-xs text-brand-textMuted">
                            {row.categoryNombre ?? 'Sin categoría'}
                          </div>
                        </div>
                        {row.status ? <StatusBadge status={row.status} /> : null}
                      </div>
                      <div className="grid gap-2 text-xs text-brand-textMuted sm:grid-cols-2">
                        <div>
                          <span className="text-brand-textMuted">Tipo:</span> {row.documentTypeCode ?? '-'}
                        </div>
                        <div>
                          <span className="text-brand-textMuted">Área:</span> {row.areaCode ?? '-'}
                        </div>
                        <div>
                          <span className="text-brand-textMuted">Actualizado:</span> {formatDate(row.updatedAt)}
                        </div>
                        <div>
                          <span className="text-brand-textMuted">Coincidencia:</span>{' '}
                          {hasTextSearch ? (() => {
                            const relevance = getSearchRelevance(row.score, maxScoreInPage);
                            return relevance.value === null
                              ? '-'
                              : relevance.label;
                          })() : '-'}
                        </div>
                      </div>
                      <ResponsiveActions>
                        <Link to={`/documents/${row.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" className="w-full sm:w-auto">
                            <Eye size={16} /> Ver
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full sm:w-auto"
                          onClick={() => row.sourceDocument && openUpload('version', row.sourceDocument)}
                          disabled={!row.sourceDocument || !canUploadVersion(row.sourceDocument)}
                        >
                          <Upload size={16} /> Versión
                        </Button>
                      </ResponsiveActions>
                    </div>
                  )}
                />
              </div>
            </SectionCard>
          </FadeInSection>
        )}

        <Modal
          open={uploadState.open}
          title={uploadState.mode === 'version' ? 'Nueva versión' : 'Nuevo documento'}
          onClose={() => setUploadState({ open: false, mode: 'new', document: null })}
        >
          <div className="grid gap-4">
            <NoticeBanner
              title={uploadState.mode === 'version' ? 'Subiendo nueva versión' : 'Subiendo documento'}
            >
              {uploadState.mode === 'version'
                ? 'Mantén tipo, área y consecutivo para conservar el historial del documento actual.'
                : 'Si es un documento SIG, selecciona tipo y área para generar su código automáticamente.'}
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
                onChange={(event) =>
                  setUploadForm((prev) => ({ ...prev, documentTypeCode: event.target.value }))
                }
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
                placeholder="Auto"
              />
            </div>
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setUploadState({ open: false, mode: 'new', document: null })}>
                Cancelar
              </Button>
              <Button onClick={submitUpload}>Guardar</Button>
            </ResponsiveActions>
          </div>
        </Modal>
      </section>
    </PageContainer>
  );
}
