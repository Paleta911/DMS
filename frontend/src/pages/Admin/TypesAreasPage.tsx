import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  adminAreaCodesList,
  adminDocumentTypesList,
  areaCodesCreate,
  areaCodesDelete,
  areaCodesHardDelete,
  areaCodesUpdate,
  documentTypesCreate,
  documentTypesDelete,
  documentTypesHardDelete,
  documentTypesUpdate,
} from '../../api/endpoints/types';
import { useAuth } from '../../auth/AuthContext';
import { AccessDenied } from '../../components/AccessDenied';
import { CatalogRecordCard } from '../../components/admin/CatalogRecordCard';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { FilterCard } from '../../components/layout/FilterCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ResultsToolbar } from '../../components/layout/ResultsToolbar';
import { ResponsiveActions } from '../../components/layout/ResponsiveActions';
import { SectionCard } from '../../components/layout/SectionCard';
import { useToast } from '../../components/ToastProvider';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { queryClient } from '../../app/queryClient';
import { queryKeys } from '../../app/queryKeys';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSavedViews } from '../../hooks/useSavedViews';
import type { AreaCode, DocumentType } from '../../types/documents';
import { getApiErrorMessage } from '../../utils/apiError';

type EditingType = { id: number; code: string; nombreLargo: string } | null;
type EditingArea = { id: number; code: string; nombre: string } | null;
type StatusFilter = 'active' | 'inactive' | 'all';

type TypesAreasFilters = {
  typeSearch: string;
  typeStatus: StatusFilter;
  typePage: number;
  typeLimit: number;
  areaSearch: string;
  areaStatus: StatusFilter;
  areaPage: number;
  areaLimit: number;
};

const INITIAL_TYPES_AREAS_FILTERS: TypesAreasFilters = {
  typeSearch: '',
  typeStatus: 'active',
  typePage: 1,
  typeLimit: 10,
  areaSearch: '',
  areaStatus: 'active',
  areaPage: 1,
  areaLimit: 10,
};

function buildCatalogActionLabel(item: { activo?: boolean }) {
  return item.activo === false ? 'Reactivar' : 'Desactivar';
}

export default function TypesAreasPage() {
  const { user, isAdmin } = useAuth();
  const { notify } = useToast();
  const { initialFilters, rememberLastUsed } = useSavedViews<TypesAreasFilters>({
    storageKey: 'admin-types-areas-filters',
    scope: user?.email ?? null,
    fallback: INITIAL_TYPES_AREAS_FILTERS,
  });
  const [typeForm, setTypeForm] = useState({ code: '', nombreLargo: '' });
  const [areaForm, setAreaForm] = useState({ code: '', nombre: '' });
  const [editingType, setEditingType] = useState<EditingType>(null);
  const [editingArea, setEditingArea] = useState<EditingArea>(null);
  const [pendingTypeToggle, setPendingTypeToggle] = useState<DocumentType | null>(null);
  const [pendingAreaToggle, setPendingAreaToggle] = useState<AreaCode | null>(null);
  const [pendingTypeDelete, setPendingTypeDelete] = useState<DocumentType | null>(null);
  const [pendingAreaDelete, setPendingAreaDelete] = useState<AreaCode | null>(null);
  const [typeSearch, setTypeSearch] = useState(initialFilters.typeSearch);
  const [areaSearch, setAreaSearch] = useState(initialFilters.areaSearch);
  const [typeStatus, setTypeStatus] = useState<StatusFilter>(initialFilters.typeStatus);
  const [areaStatus, setAreaStatus] = useState<StatusFilter>(initialFilters.areaStatus);
  const [typePage, setTypePage] = useState(initialFilters.typePage);
  const [areaPage, setAreaPage] = useState(initialFilters.areaPage);
  const [typeLimit, setTypeLimit] = useState(initialFilters.typeLimit);
  const [areaLimit, setAreaLimit] = useState(initialFilters.areaLimit);
  const debouncedTypeSearch = useDebouncedValue(typeSearch);
  const debouncedAreaSearch = useDebouncedValue(areaSearch);

  useEffect(() => {
    rememberLastUsed({
      typeSearch,
      typeStatus,
      typePage,
      typeLimit,
      areaSearch,
      areaStatus,
      areaPage,
      areaLimit,
    });
  }, [
    areaLimit,
    areaPage,
    areaSearch,
    areaStatus,
    rememberLastUsed,
    typeLimit,
    typePage,
    typeSearch,
    typeStatus,
  ]);

  const typesQuery = useQuery({
    queryKey: queryKeys.adminCatalogs.documentTypes({
      q: debouncedTypeSearch,
      typeStatus,
      typePage,
      typeLimit,
    }),
    queryFn: () =>
      adminDocumentTypesList({
        q: debouncedTypeSearch.trim() || undefined,
        includeInactive: typeStatus === 'all',
        status: typeStatus,
        page: typePage,
        limit: typeLimit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const areasQuery = useQuery({
    queryKey: queryKeys.adminCatalogs.areaCodes({
      q: debouncedAreaSearch,
      areaStatus,
      areaPage,
      areaLimit,
    }),
    queryFn: () =>
      adminAreaCodesList({
        q: debouncedAreaSearch.trim() || undefined,
        includeInactive: areaStatus === 'all',
        status: areaStatus,
        page: areaPage,
        limit: areaLimit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const refreshCatalogs = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.documentTypes }),
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.areaCodes }),
      queryClient.invalidateQueries({ queryKey: ['admin-document-types'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-area-codes'] }),
    ]);

  const createTypeMutation = useMutation({
    mutationFn: () =>
      documentTypesCreate({ code: typeForm.code, nombreLargo: typeForm.nombreLargo }),
    onSuccess: async () => {
      notify('Tipo creado', 'success');
      setTypeForm({ code: '', nombreLargo: '' });
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo crear el tipo'), 'error');
    },
  });

  const createAreaMutation = useMutation({
    mutationFn: () => areaCodesCreate({ code: areaForm.code, nombre: areaForm.nombre }),
    onSuccess: async () => {
      notify('Área creada', 'success');
      setAreaForm({ code: '', nombre: '' });
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo crear el área'), 'error');
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: number;
      code?: string;
      nombreLargo?: string;
      activo?: boolean;
    }) => documentTypesUpdate(id, changes),
    onSuccess: async (_updated, variables) => {
      const message =
        variables.activo === false
          ? 'Tipo desactivado'
          : variables.activo === true
            ? 'Tipo reactivado'
            : 'Tipo actualizado';
      notify(message, 'success');
      setEditingType(null);
      setPendingTypeToggle(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo actualizar el tipo'), 'error');
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: number;
      code?: string;
      nombre?: string;
      activo?: boolean;
    }) => areaCodesUpdate(id, changes),
    onSuccess: async (_updated, variables) => {
      const message =
        variables.activo === false
          ? 'Área desactivada'
          : variables.activo === true
            ? 'Área reactivada'
            : 'Área actualizada';
      notify(message, 'success');
      setEditingArea(null);
      setPendingAreaToggle(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo actualizar el área'), 'error');
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => documentTypesDelete(id),
    onSuccess: async () => {
      notify('Tipo desactivado', 'success');
      setPendingTypeToggle(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo desactivar el tipo'), 'error');
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: number) => areaCodesDelete(id),
    onSuccess: async () => {
      notify('Área desactivada', 'success');
      setPendingAreaToggle(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo desactivar el área'), 'error');
    },
  });

  const hardDeleteTypeMutation = useMutation({
    mutationFn: (id: number) => documentTypesHardDelete(id),
    onSuccess: async () => {
      notify('Tipo eliminado', 'success');
      setPendingTypeDelete(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo eliminar el tipo'), 'error');
    },
  });

  const hardDeleteAreaMutation = useMutation({
    mutationFn: (id: number) => areaCodesHardDelete(id),
    onSuccess: async () => {
      notify('Área eliminada', 'success');
      setPendingAreaDelete(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo eliminar el área'), 'error');
    },
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const typeTotal = typesQuery.data?.total ?? 0;
  const typeTotalPages = Math.max(1, Math.ceil(typeTotal / typeLimit));
  const areaTotal = areasQuery.data?.total ?? 0;
  const areaTotalPages = Math.max(1, Math.ceil(areaTotal / areaLimit));

  const renderCatalogActions = (
    item: { id: number; activo?: boolean },
    onEdit: () => void,
    onToggle: () => void,
    onDelete: () => void,
  ) => (
    <div className="flex w-full flex-col items-center text-center">
      <div className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-brand-textMuted">
        Acciones
      </div>
      <div className="flex w-full justify-center">
        <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onEdit}>
            Editar
          </Button>
          {item.activo === false ? (
            <Button className="w-full sm:w-auto" onClick={onToggle}>
              Reactivar
            </Button>
          ) : (
            <Button variant="danger" className="w-full sm:w-auto" onClick={onToggle}>
              Desactivar
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full border-ember/40 text-ember hover:bg-ember/10 sm:w-auto"
            onClick={onDelete}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader title="Tipos y áreas" subtitle="Catálogos oficiales del SIG." />

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard>
            <div className="font-display text-lg text-ink">Tipos de documento</div>
            <div className="mt-4 grid gap-3">
              <Input
                label="Código"
                value={typeForm.code}
                onChange={(event) =>
                  setTypeForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
              />
              <Input
                label="Nombre largo"
                value={typeForm.nombreLargo}
                onChange={(event) =>
                  setTypeForm((prev) => ({ ...prev, nombreLargo: event.target.value }))
                }
              />
              <Button
                variant="secondary"
                onClick={() => createTypeMutation.mutate()}
                disabled={!typeForm.code.trim() || !typeForm.nombreLargo.trim()}
              >
                Crear tipo
              </Button>
            </div>
            <p className="mt-3 text-xs text-brand-textMuted">
              Al desactivar un tipo, los documentos relacionados quedan sin tipo asignado.
            </p>

            <FilterCard
              className="mt-4"
              gridClassName="grid gap-3 md:grid-cols-3"
              footer={
                <ResponsiveActions>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTypeSearch(INITIAL_TYPES_AREAS_FILTERS.typeSearch);
                      setTypeStatus(INITIAL_TYPES_AREAS_FILTERS.typeStatus);
                      setTypePage(INITIAL_TYPES_AREAS_FILTERS.typePage);
                      setTypeLimit(INITIAL_TYPES_AREAS_FILTERS.typeLimit);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </ResponsiveActions>
              }
            >
              <Input
                label="Buscar"
                value={typeSearch}
                placeholder="Código o nombre"
                onChange={(event) => {
                  setTypeSearch(event.target.value);
                  setTypePage(1);
                }}
              />
              <Select
                label="Estado"
                value={typeStatus}
                onChange={(event) => {
                  setTypeStatus(event.target.value as StatusFilter);
                  setTypePage(1);
                }}
              >
                <option value="active">Solo activos</option>
                <option value="inactive">Solo inactivos</option>
                <option value="all">Activos e inactivos</option>
              </Select>
              <Select
                label="Límite"
                value={String(typeLimit)}
                onChange={(event) => {
                  setTypeLimit(Number(event.target.value));
                  setTypePage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </Select>
            </FilterCard>

            {typesQuery.isLoading ? (
              <div className="mt-4 flex items-center justify-center p-8">
                <Spinner />
              </div>
            ) : typeTotal === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin tipos"
                  subtitle="No hay tipos que coincidan con los filtros actuales."
                />
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <ResultsToolbar
                    summary={
                      <>
                        <span>
                          Mostrando {typesQuery.data?.items.length ?? 0} de {typeTotal}
                        </span>
                        <span>
                          Página {typesQuery.data?.page ?? typePage} de {typeTotalPages}
                        </span>
                      </>
                    }
                    currentPage={typesQuery.data?.page ?? typePage}
                    totalPages={typeTotalPages}
                    onPrevious={() => setTypePage((prev) => Math.max(prev - 1, 1))}
                    onNext={() =>
                      setTypePage((prev) => Math.min(prev + 1, typeTotalPages))
                    }
                    previousDisabled={typePage <= 1}
                    nextDisabled={typePage >= typeTotalPages}
                  />
                </div>
                <div className="mt-4 grid gap-3">
                  {(typesQuery.data?.items ?? []).map((item) => (
                    <CatalogRecordCard
                      key={item.id}
                      metadata={[
                        { label: 'Código', value: item.code, emphasize: true },
                        { label: 'Nombre', value: item.nombreLargo },
                        {
                          label: 'Estado',
                          value: item.activo === false ? 'Inactivo' : 'Activo',
                        },
                      ]}
                      actions={renderCatalogActions(
                        item,
                        () =>
                          setEditingType({
                            id: item.id,
                            code: item.code,
                            nombreLargo: item.nombreLargo,
                          }),
                        () =>
                          item.activo === false
                            ? updateTypeMutation.mutate({ id: item.id, activo: true })
                            : setPendingTypeToggle(item),
                        () => setPendingTypeDelete(item),
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard>
            <div className="font-display text-lg text-ink">Áreas</div>
            <div className="mt-4 grid gap-3">
              <Input
                label="Código"
                value={areaForm.code}
                onChange={(event) =>
                  setAreaForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
              />
              <Input
                label="Nombre"
                value={areaForm.nombre}
                onChange={(event) =>
                  setAreaForm((prev) => ({ ...prev, nombre: event.target.value }))
                }
              />
              <Button
                variant="secondary"
                onClick={() => createAreaMutation.mutate()}
                disabled={!areaForm.code.trim() || !areaForm.nombre.trim()}
              >
                Crear área
              </Button>
            </div>
            <p className="mt-3 text-xs text-brand-textMuted">
              Al desactivar un área, documentos y usuarios pierden esa asignación.
            </p>

            <FilterCard
              className="mt-4"
              gridClassName="grid gap-3 md:grid-cols-3"
              footer={
                <ResponsiveActions>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAreaSearch(INITIAL_TYPES_AREAS_FILTERS.areaSearch);
                      setAreaStatus(INITIAL_TYPES_AREAS_FILTERS.areaStatus);
                      setAreaPage(INITIAL_TYPES_AREAS_FILTERS.areaPage);
                      setAreaLimit(INITIAL_TYPES_AREAS_FILTERS.areaLimit);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </ResponsiveActions>
              }
            >
              <Input
                label="Buscar"
                value={areaSearch}
                placeholder="Código o nombre"
                onChange={(event) => {
                  setAreaSearch(event.target.value);
                  setAreaPage(1);
                }}
              />
              <Select
                label="Estado"
                value={areaStatus}
                onChange={(event) => {
                  setAreaStatus(event.target.value as StatusFilter);
                  setAreaPage(1);
                }}
              >
                <option value="active">Solo activas</option>
                <option value="inactive">Solo inactivas</option>
                <option value="all">Activas e inactivas</option>
              </Select>
              <Select
                label="Límite"
                value={String(areaLimit)}
                onChange={(event) => {
                  setAreaLimit(Number(event.target.value));
                  setAreaPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </Select>
            </FilterCard>

            {areasQuery.isLoading ? (
              <div className="mt-4 flex items-center justify-center p-8">
                <Spinner />
              </div>
            ) : areaTotal === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin áreas"
                  subtitle="No hay áreas que coincidan con los filtros actuales."
                />
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <ResultsToolbar
                    summary={
                      <>
                        <span>
                          Mostrando {areasQuery.data?.items.length ?? 0} de {areaTotal}
                        </span>
                        <span>
                          Página {areasQuery.data?.page ?? areaPage} de {areaTotalPages}
                        </span>
                      </>
                    }
                    currentPage={areasQuery.data?.page ?? areaPage}
                    totalPages={areaTotalPages}
                    onPrevious={() => setAreaPage((prev) => Math.max(prev - 1, 1))}
                    onNext={() =>
                      setAreaPage((prev) => Math.min(prev + 1, areaTotalPages))
                    }
                    previousDisabled={areaPage <= 1}
                    nextDisabled={areaPage >= areaTotalPages}
                  />
                </div>
                <div className="mt-4 grid gap-3">
                  {(areasQuery.data?.items ?? []).map((item) => (
                    <CatalogRecordCard
                      key={item.id}
                      metadata={[
                        { label: 'Código', value: item.code, emphasize: true },
                        { label: 'Nombre', value: item.nombre },
                        {
                          label: 'Estado',
                          value: item.activo === false ? 'Inactiva' : 'Activa',
                        },
                      ]}
                      actions={renderCatalogActions(
                        item,
                        () =>
                          setEditingArea({
                            id: item.id,
                            code: item.code,
                            nombre: item.nombre,
                          }),
                        () =>
                          item.activo === false
                            ? updateAreaMutation.mutate({ id: item.id, activo: true })
                            : setPendingAreaToggle(item),
                        () => setPendingAreaDelete(item),
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        <Modal
          open={Boolean(editingType)}
          title="Editar tipo de documento"
          onClose={() => setEditingType(null)}
        >
          <div className="grid gap-4">
            <Input
              label="Código"
              value={editingType?.code ?? ''}
              onChange={(event) =>
                setEditingType((prev) =>
                  prev ? { ...prev, code: event.target.value.toUpperCase() } : prev,
                )
              }
            />
            <Input
              label="Nombre largo"
              value={editingType?.nombreLargo ?? ''}
              onChange={(event) =>
                setEditingType((prev) =>
                  prev ? { ...prev, nombreLargo: event.target.value } : prev,
                )
              }
            />
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setEditingType(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  editingType &&
                  updateTypeMutation.mutate({
                    id: editingType.id,
                    code: editingType.code,
                    nombreLargo: editingType.nombreLargo,
                  })
                }
                disabled={
                  updateTypeMutation.isPending ||
                  !editingType?.code.trim() ||
                  !editingType?.nombreLargo.trim()
                }
              >
                Guardar
              </Button>
            </ResponsiveActions>
          </div>
        </Modal>

        <Modal open={Boolean(editingArea)} title="Editar área" onClose={() => setEditingArea(null)}>
          <div className="grid gap-4">
            <Input
              label="Código"
              value={editingArea?.code ?? ''}
              onChange={(event) =>
                setEditingArea((prev) =>
                  prev ? { ...prev, code: event.target.value.toUpperCase() } : prev,
                )
              }
            />
            <Input
              label="Nombre"
              value={editingArea?.nombre ?? ''}
              onChange={(event) =>
                setEditingArea((prev) => (prev ? { ...prev, nombre: event.target.value } : prev))
              }
            />
            <ResponsiveActions>
              <Button variant="outline" onClick={() => setEditingArea(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  editingArea &&
                  updateAreaMutation.mutate({
                    id: editingArea.id,
                    code: editingArea.code,
                    nombre: editingArea.nombre,
                  })
                }
                disabled={
                  updateAreaMutation.isPending ||
                  !editingArea?.code.trim() ||
                  !editingArea?.nombre.trim()
                }
              >
                Guardar
              </Button>
            </ResponsiveActions>
          </div>
        </Modal>

        <ConfirmActionModal
          open={Boolean(pendingTypeToggle)}
          title={`${buildCatalogActionLabel(pendingTypeToggle ?? { activo: true })} tipo de documento`}
          description={
            pendingTypeToggle?.activo === false
              ? 'El tipo volverá a estar disponible para asignación.'
              : 'Los documentos que lo usen quedarán sin tipo asignado.'
          }
          onClose={() => setPendingTypeToggle(null)}
          onConfirm={() => pendingTypeToggle && deleteTypeMutation.mutate(pendingTypeToggle.id)}
          confirmLabel="Desactivar"
          confirmDisabled={deleteTypeMutation.isPending}
        />

        <ConfirmActionModal
          open={Boolean(pendingTypeDelete)}
          title="Eliminar tipo de documento"
          description={
            pendingTypeDelete ? (
              <>
                Se eliminará definitivamente el tipo <strong>{pendingTypeDelete.code}</strong>. Los
                documentos que lo usen quedarán sin tipo asignado.
              </>
            ) : (
              ''
            )
          }
          onClose={() => setPendingTypeDelete(null)}
          onConfirm={() =>
            pendingTypeDelete && hardDeleteTypeMutation.mutate(pendingTypeDelete.id)
          }
          confirmLabel="Eliminar"
          confirmDisabled={hardDeleteTypeMutation.isPending}
        />

        <ConfirmActionModal
          open={Boolean(pendingAreaToggle)}
          title={`${buildCatalogActionLabel(pendingAreaToggle ?? { activo: true })} área`}
          description={
            pendingAreaToggle?.activo === false
              ? 'El área volverá a estar disponible para asignación.'
              : 'Los documentos y usuarios perderán esta asignación.'
          }
          onClose={() => setPendingAreaToggle(null)}
          onConfirm={() => pendingAreaToggle && deleteAreaMutation.mutate(pendingAreaToggle.id)}
          confirmLabel="Desactivar"
          confirmDisabled={deleteAreaMutation.isPending}
        />

        <ConfirmActionModal
          open={Boolean(pendingAreaDelete)}
          title="Eliminar área"
          description={
            pendingAreaDelete ? (
              <>
                Se eliminará definitivamente el área <strong>{pendingAreaDelete.code}</strong>. Los
                documentos y usuarios que la tengan asignada perderán esa relación.
              </>
            ) : (
              ''
            )
          }
          onClose={() => setPendingAreaDelete(null)}
          onConfirm={() => pendingAreaDelete && hardDeleteAreaMutation.mutate(pendingAreaDelete.id)}
          confirmLabel="Eliminar"
          confirmDisabled={hardDeleteAreaMutation.isPending}
        />
      </section>
    </PageContainer>
  );
}
