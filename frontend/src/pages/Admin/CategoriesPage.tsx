import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminCategoriesList,
  categoriesCreate,
  categoriesDelete,
  categoriesHardDelete,
  categoriesUpdate,
} from '../../api/endpoints/categories';
import { CatalogRecordCard } from '../../components/admin/CatalogRecordCard';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { TextFieldModal } from '../../components/admin/TextFieldModal';
import { AccessDenied } from '../../components/AccessDenied';
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
import { useAuth } from '../../auth/AuthContext';
import { queryClient } from '../../app/queryClient';
import { invalidateDocumentListQueries } from '../../app/queryInvalidation';
import { queryKeys } from '../../app/queryKeys';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSavedViews } from '../../hooks/useSavedViews';
import type { Category } from '../../types/documents';
import { getApiErrorMessage } from '../../utils/apiError';

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
});

type FormValues = z.infer<typeof schema>;

type StatusFilter = 'active' | 'inactive' | 'all';

type CategoryFilters = {
  search: string;
  statusFilter: StatusFilter;
  page: number;
  limit: number;
};

const INITIAL_CATEGORY_FILTERS: CategoryFilters = {
  search: '',
  statusFilter: 'active',
  page: 1,
  limit: 12,
};

function buildCategoryActionLabel(category: Category) {
  return category.activo === false ? 'Reactivar' : 'Desactivar';
}

export default function CategoriesPage() {
  const { user, isAdmin } = useAuth();
  const { notify } = useToast();
  const { initialFilters, rememberLastUsed } = useSavedViews<CategoryFilters>({
    storageKey: 'admin-categories-filters',
    scope: user?.email ?? null,
    fallback: INITIAL_CATEGORY_FILTERS,
  });
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [search, setSearch] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilters.statusFilter);
  const [page, setPage] = useState(initialFilters.page);
  const [limit, setLimit] = useState(initialFilters.limit);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    rememberLastUsed({
      search,
      statusFilter,
      page,
      limit,
    });
  }, [limit, page, rememberLastUsed, search, statusFilter]);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.adminCatalogs.categories({
      q: debouncedSearch,
      statusFilter,
      page,
      limit,
    }),
    queryFn: () =>
      adminCategoriesList({
        q: debouncedSearch.trim() || undefined,
        includeInactive: statusFilter === 'all',
        status: statusFilter,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (nombre: string) => categoriesCreate(nombre),
    onSuccess: () => {
      notify('Categoría creada', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.categories });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 409) {
        notify('Ya existe una categoría con ese nombre', 'error');
        return;
      }
      notify(getApiErrorMessage(error, 'Error al crear categoría'), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...changes }: { id: number; nombre?: string; activo?: boolean }) =>
      categoriesUpdate(id, changes),
    onSuccess: (_updated, variables) => {
      const message =
        variables.activo === false
          ? 'Categoría desactivada'
          : variables.activo === true
            ? 'Categoría reactivada'
            : 'Categoría actualizada';
      notify(message, 'success');
      setEditing(null);
      setPendingToggle(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.categories });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      invalidateDocumentListQueries(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al actualizar categoría'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesDelete(id),
    onSuccess: () => {
      notify('Categoría desactivada', 'success');
      setPendingToggle(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.categories });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      invalidateDocumentListQueries(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al desactivar categoría'), 'error');
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: number) => categoriesHardDelete(id),
    onSuccess: () => {
      notify('Categoría eliminada', 'success');
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.categories });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      invalidateDocumentListQueries(queryClient);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, 'Error al eliminar categoría'), 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '' },
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    await createMutation.mutateAsync(values.nombre);
    reset();
  });

  const total = categoriesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Categorías"
          subtitle="Organiza documentos por grupos y conserva trazabilidad incluso al desactivarlas."
        />

        <SectionCard>
          <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
            <Input label="Nueva categoría" error={errors.nombre?.message} {...register('nombre')} />
            <div className="flex items-end">
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                Crear
              </Button>
            </div>
          </form>
        </SectionCard>

        <FilterCard
          gridClassName="grid gap-4 md:grid-cols-3"
          footer={
            <ResponsiveActions>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch(INITIAL_CATEGORY_FILTERS.search);
                  setStatusFilter(INITIAL_CATEGORY_FILTERS.statusFilter);
                  setPage(INITIAL_CATEGORY_FILTERS.page);
                  setLimit(INITIAL_CATEGORY_FILTERS.limit);
                }}
              >
                Limpiar filtros
              </Button>
            </ResponsiveActions>
          }
        >
          <Input
            label="Buscar"
            placeholder="Nombre de categoría"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="active">Solo activas</option>
            <option value="inactive">Solo inactivas</option>
            <option value="all">Activas e inactivas</option>
          </Select>
          <Select
            label="Límite"
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value="6">6</option>
            <option value="12">12</option>
            <option value="24">24</option>
          </Select>
        </FilterCard>

        {categoriesQuery.isLoading ? (
          <SectionCard className="flex items-center justify-center p-10">
            <Spinner />
          </SectionCard>
        ) : total === 0 ? (
          <EmptyState
            title="Sin categorías"
            subtitle="No hay categorías que coincidan con los filtros actuales."
          />
        ) : (
          <SectionCard>
            <ResultsToolbar
              summary={
                <>
                  <span>
                    Mostrando {categoriesQuery.data?.items.length ?? 0} de {total}
                  </span>
                  <span>
                    Página {categoriesQuery.data?.page ?? page} de {totalPages}
                  </span>
                </>
              }
              currentPage={categoriesQuery.data?.page ?? page}
              totalPages={totalPages}
              onPrevious={() => setPage((prev) => Math.max(prev - 1, 1))}
              onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              previousDisabled={page <= 1}
              nextDisabled={page >= totalPages}
            />

            <div className="mt-4 grid gap-3">
              {(categoriesQuery.data?.items ?? []).map((category) => (
                <CatalogRecordCard
                  key={category.id}
                  metadata={[
                    { label: 'Nombre', value: category.nombre, emphasize: true },
                    {
                      label: 'Estado',
                      value: category.activo === false ? 'Inactiva' : 'Activa',
                    },
                  ]}
                  actions={
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setEditing(category)}
                      >
                        Editar
                      </Button>
                      {category.activo === false ? (
                        <Button
                          className="w-full"
                          onClick={() =>
                            updateMutation.mutate({ id: category.id, activo: true })
                          }
                        >
                          Reactivar
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          className="w-full"
                          onClick={() => setPendingToggle(category)}
                        >
                          Desactivar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full border-ember/40 text-ember hover:bg-ember/10"
                        onClick={() => setPendingDelete(category)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          </SectionCard>
        )}

        <TextFieldModal
          open={Boolean(editing)}
          title="Editar categoría"
          label="Nombre"
          value={editing?.nombre ?? ''}
          onChange={(value) =>
            setEditing((prev) => (prev ? { ...prev, nombre: value } : prev))
          }
          onClose={() => setEditing(null)}
          onConfirm={() => {
            if (!editing) return;
            const validation = schema.safeParse({ nombre: editing.nombre });
            if (!validation.success) {
              notify(validation.error.issues[0]?.message ?? 'Nombre inválido', 'error');
              return;
            }
            updateMutation.mutate({ id: editing.id, nombre: editing.nombre });
          }}
          confirmDisabled={updateMutation.isPending || !editing?.nombre.trim()}
        />

        <ConfirmActionModal
          open={Boolean(pendingToggle)}
          title={`${buildCategoryActionLabel(pendingToggle ?? { id: 0, nombre: '', activo: true })} categoría`}
          description={
            pendingToggle?.activo === false
              ? 'Esta categoría volverá a estar disponible para asignación.'
              : 'Los documentos que usen esta categoría quedarán sin categoría asignada.'
          }
          onClose={() => setPendingToggle(null)}
          onConfirm={() => {
            if (!pendingToggle) return;
            if (pendingToggle.activo === false) {
              updateMutation.mutate({ id: pendingToggle.id, activo: true });
              return;
            }
            deleteMutation.mutate(pendingToggle.id);
          }}
          confirmLabel={buildCategoryActionLabel(pendingToggle ?? { id: 0, nombre: '', activo: true })}
          confirmVariant={pendingToggle?.activo === false ? 'primary' : 'danger'}
          confirmDisabled={deleteMutation.isPending || updateMutation.isPending}
        />

        <ConfirmActionModal
          open={Boolean(pendingDelete)}
          title="Eliminar categoría"
          description={
            pendingDelete ? (
              <>
                Se eliminará definitivamente la categoría <strong>{pendingDelete.nombre}</strong>.
                Los documentos que la usen quedarán sin categoría asignada.
              </>
            ) : (
              ''
            )
          }
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            if (!pendingDelete) return;
            hardDeleteMutation.mutate(pendingDelete.id);
          }}
          confirmLabel="Eliminar"
          confirmDisabled={hardDeleteMutation.isPending}
        />
      </section>
    </PageContainer>
  );
}
