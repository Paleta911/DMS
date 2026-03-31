import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  adminAreaCodesList,
  adminDocumentTypesList,
  areaCodesCreate,
  areaCodesDelete,
  areaCodesUpdate,
  documentTypesCreate,
  documentTypesDelete,
  documentTypesUpdate,
} from '../../api/endpoints/types';
import { useAuth } from '../../auth/AuthContext';
import { AccessDenied } from '../../components/AccessDenied';
import { CatalogRecordCard } from '../../components/admin/CatalogRecordCard';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { TextFieldModal } from '../../components/admin/TextFieldModal';
import { FilterCard } from '../../components/layout/FilterCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ResultsToolbar } from '../../components/layout/ResultsToolbar';
import { SectionCard } from '../../components/layout/SectionCard';
import { ResponsiveActions } from '../../components/layout/ResponsiveActions';
import { useToast } from '../../components/ToastProvider';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { queryClient } from '../../app/queryClient';
import { queryKeys } from '../../app/queryKeys';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { AreaCode, DocumentType } from '../../types/documents';
import { getApiErrorMessage } from '../../utils/apiError';

type EditingType = { id: number; nombreLargo: string } | null;
type EditingArea = { id: number; nombre: string } | null;
type StatusFilter = 'active' | 'all';

function buildCatalogActionLabel(item: { activo?: boolean }) {
  return item.activo === false ? 'Reactivar' : 'Desactivar';
}

export default function TypesAreasPage() {
  const { isAdmin } = useAuth();
  const { notify } = useToast();
  const [typeForm, setTypeForm] = useState({ code: '', nombreLargo: '' });
  const [areaForm, setAreaForm] = useState({ code: '', nombre: '' });
  const [editingType, setEditingType] = useState<EditingType>(null);
  const [editingArea, setEditingArea] = useState<EditingArea>(null);
  const [pendingTypeToggle, setPendingTypeToggle] = useState<DocumentType | null>(null);
  const [pendingAreaToggle, setPendingAreaToggle] = useState<AreaCode | null>(null);
  const [typeSearch, setTypeSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [typeStatus, setTypeStatus] = useState<StatusFilter>('active');
  const [areaStatus, setAreaStatus] = useState<StatusFilter>('active');
  const [typePage, setTypePage] = useState(1);
  const [areaPage, setAreaPage] = useState(1);
  const [typeLimit, setTypeLimit] = useState(10);
  const [areaLimit, setAreaLimit] = useState(10);
  const debouncedTypeSearch = useDebouncedValue(typeSearch);
  const debouncedAreaSearch = useDebouncedValue(areaSearch);

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
    mutationFn: (payload: { id: number; nombreLargo?: string; activo?: boolean }) =>
      documentTypesUpdate(payload.id, payload),
    onSuccess: async (updated) => {
      notify(updated.activo === false ? 'Tipo desactivado' : 'Tipo actualizado', 'success');
      setEditingType(null);
      setPendingTypeToggle(null);
      await refreshCatalogs();
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'No se pudo actualizar el tipo'), 'error');
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: (payload: { id: number; nombre?: string; activo?: boolean }) =>
      areaCodesUpdate(payload.id, payload),
    onSuccess: async (updated) => {
      notify(updated.activo === false ? 'Área desactivada' : 'Área actualizada', 'success');
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
  ) => (
    <div>
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-brand-textMuted">
        Acciones
      </div>
      <ResponsiveActions>
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
      </ResponsiveActions>
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
                        () => setEditingType({ id: item.id, nombreLargo: item.nombreLargo }),
                        () =>
                          item.activo === false
                            ? updateTypeMutation.mutate({ id: item.id, activo: true })
                            : setPendingTypeToggle(item),
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
                        () => setEditingArea({ id: item.id, nombre: item.nombre }),
                        () =>
                          item.activo === false
                            ? updateAreaMutation.mutate({ id: item.id, activo: true })
                            : setPendingAreaToggle(item),
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        <TextFieldModal
          open={Boolean(editingType)}
          title="Editar tipo de documento"
          label="Nombre largo"
          value={editingType?.nombreLargo ?? ''}
          onChange={(value) =>
            setEditingType((prev) => (prev ? { ...prev, nombreLargo: value } : prev))
          }
          onClose={() => setEditingType(null)}
          onConfirm={() =>
            editingType &&
            updateTypeMutation.mutate({
              id: editingType.id,
              nombreLargo: editingType.nombreLargo,
            })
          }
          confirmDisabled={updateTypeMutation.isPending || !editingType?.nombreLargo.trim()}
        />

        <TextFieldModal
          open={Boolean(editingArea)}
          title="Editar área"
          label="Nombre"
          value={editingArea?.nombre ?? ''}
          onChange={(value) => setEditingArea((prev) => (prev ? { ...prev, nombre: value } : prev))}
          onClose={() => setEditingArea(null)}
          onConfirm={() =>
            editingArea &&
            updateAreaMutation.mutate({
              id: editingArea.id,
              nombre: editingArea.nombre,
            })
          }
          confirmDisabled={updateAreaMutation.isPending || !editingArea?.nombre.trim()}
        />

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
      </section>
    </PageContainer>
  );
}
