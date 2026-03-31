import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersGet, usersSetAreas } from '../../api/endpoints/users';
import { areaCodesListPaged } from '../../api/endpoints/types';
import { Button } from '../../components/ui/Button';
import { NoticeBanner } from '../../components/ui/NoticeBanner';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../auth/AuthContext';
import { AccessDenied } from '../../components/AccessDenied';
import type { UserProfile, UserSearchItem } from '../../types/users';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { SectionCard } from '../../components/layout/SectionCard';
import { ResponsiveActions } from '../../components/layout/ResponsiveActions';
import { UserSearchInput } from '../../components/users/UserSearchInput';
import { translateRole } from '../../utils/labels';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryClient } from '../../app/queryClient';
import { invalidateUserDetail } from '../../app/queryInvalidation';
import { queryKeys } from '../../app/queryKeys';
import { Input } from '../../components/ui/Input';
import { ResultsToolbar } from '../../components/layout/ResultsToolbar';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

function toAreaCode(value: { code?: string } | string | null | undefined) {
  if (!value) return '';
  return typeof value === 'string' ? value : (value.code ?? '');
}

export default function UsersAreasPage() {
  const { isAdmin } = useAuth();
  const { notify } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [areaSearch, setAreaSearch] = useState('');
  const [areaPage, setAreaPage] = useState(1);
  const [areaLimit, setAreaLimit] = useState(12);
  const debouncedAreaSearch = useDebouncedValue(areaSearch);

  const areasQuery = useQuery({
    queryKey: queryKeys.catalogs.areaCodesList({
      q: debouncedAreaSearch,
      page: areaPage,
      limit: areaLimit,
    }),
    queryFn: () =>
      areaCodesListPaged({
        q: debouncedAreaSearch.trim() || undefined,
        page: areaPage,
        limit: areaLimit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const selectedUserId = selectedUser?.id;
  const userQuery = useQuery<UserProfile>({
    queryKey: queryKeys.users.detail(selectedUserId),
    queryFn: () => usersGet(Number(selectedUserId)),
    enabled: Number.isFinite(selectedUserId),
  });

  useEffect(() => {
    if (userQuery.data) {
      setSelectedAreas(
        (userQuery.data.allowedAreaCodes ?? [])
          .map((area) => toAreaCode(area))
          .filter((area): area is string => area.length > 0),
      );
    }
  }, [userQuery.data]);

  const areas = areasQuery.data?.items ?? [];
  const areaTotal = areasQuery.data?.total ?? 0;
  const areaTotalPages = Math.max(1, Math.ceil(areaTotal / areaLimit));
  const savedAreaCodes = useMemo(
    () =>
      (userQuery.data?.allowedAreaCodes ?? [])
        .map((area) => toAreaCode(area))
        .filter((area): area is string => area.length > 0),
    [userQuery.data],
  );

  const savedAreaCodeSet = useMemo(() => new Set(savedAreaCodes), [savedAreaCodes]);
  const selectedAreaCodeSet = useMemo(() => new Set(selectedAreas), [selectedAreas]);

  const pendingAdditions = useMemo(
    () => selectedAreas.filter((code) => !savedAreaCodeSet.has(code)),
    [savedAreaCodeSet, selectedAreas],
  );
  const pendingRemovals = useMemo(
    () => savedAreaCodes.filter((code) => !selectedAreaCodeSet.has(code)),
    [savedAreaCodes, selectedAreaCodeSet],
  );
  const hasChanges = pendingAdditions.length > 0 || pendingRemovals.length > 0;

  const toggleArea = (code: string) => {
    setSelectedAreas((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  const saveAreas = async () => {
    if (!selectedUserId) {
      notify('Selecciona un usuario', 'error');
      return;
    }
    if (!userQuery.data) {
      notify('Usuario no encontrado', 'error');
      return;
    }
    try {
      await usersSetAreas(selectedUserId, selectedAreas);
      notify('Áreas actualizadas', 'success');
      invalidateUserDetail(queryClient, selectedUserId);
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error al actualizar'), 'error');
    }
  };

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const userQueryStatus = (userQuery.error as any)?.response?.status;

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Usuarios / Áreas"
          subtitle="Asigna áreas permitidas por usuario."
        />

        <SectionCard>
          <div className="grid gap-4">
            <UserSearchInput
              label="Usuario (correo o nombre)"
              placeholder="Busca por correo o nombre..."
              selectedUser={selectedUser}
              onSelect={(user) => setSelectedUser(user)}
            />
            <ResponsiveActions>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setSelectedUser(null)}
                disabled={!selectedUser}
              >
                Limpiar selección
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (selectedUserId) {
                    invalidateUserDetail(queryClient, selectedUserId);
                  }
                }}
                disabled={!selectedUserId}
              >
                Actualizar perfil
              </Button>
            </ResponsiveActions>
          </div>
        </SectionCard>

        {!selectedUser ? (
          <NoticeBanner title="Selecciona un usuario">
            Busca un correo o nombre y elige un usuario para revisar sus áreas actuales.
          </NoticeBanner>
        ) : null}

        {selectedUser && userQuery.isLoading ? (
          <NoticeBanner title="Cargando perfil">Obteniendo información del usuario seleccionado.</NoticeBanner>
        ) : null}

        {userQueryStatus === 404 ? (
          <NoticeBanner variant="warning" title="Usuario no encontrado">
            Vuelve a buscar y selecciona un usuario válido para continuar.
          </NoticeBanner>
        ) : userQuery.isError ? (
          <NoticeBanner variant="error" title="No se pudo cargar el usuario">
            Intenta actualizar la búsqueda o vuelve a seleccionar el usuario.
          </NoticeBanner>
        ) : null}

        {userQuery.data ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <SectionCard>
              <div className="font-display text-lg text-ink">Perfil</div>
              <div className="mt-3 text-sm text-brand-textMuted">
                <div className="truncate">Correo: {userQuery.data.email}</div>
                <div>Rol: {translateRole(userQuery.data.role)}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {savedAreaCodes.length > 0
                  ? savedAreaCodes.map((area) => (
                      <span key={area} className="tag bg-brand-muted/20 text-brand-text">
                        {area}
                      </span>
                    ))
                  : 'Sin áreas asignadas'}
              </div>
            </SectionCard>
            <SectionCard>
              <div className="font-display text-lg text-ink">Asignar áreas</div>
              <div className="mt-4 grid gap-3">
                {hasChanges ? (
                  <NoticeBanner variant="warning" title="Cambios pendientes">
                    Guarda para aplicar {pendingAdditions.length} asignación(es) y {pendingRemovals.length}{' '}
                    desasignación(es).
                  </NoticeBanner>
                ) : savedAreaCodes.length === 0 ? (
                  <NoticeBanner title="Sin áreas asignadas">
                    Este usuario aún no tiene áreas. Marca una o más áreas y guarda para asignarlas.
                  </NoticeBanner>
                ) : (
                  <NoticeBanner variant="success" title="Sin cambios pendientes">
                    Las áreas mostradas ya coinciden con la configuración actual del usuario.
                  </NoticeBanner>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px]">
                <Input
                  label="Buscar área"
                  placeholder="Código o nombre"
                  value={areaSearch}
                  onChange={(event) => {
                    setAreaSearch(event.target.value);
                    setAreaPage(1);
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={() => {
                    setAreaSearch('');
                    setAreaPage(1);
                    setAreaLimit(12);
                  }}
                >
                  Limpiar áreas
                </Button>
              </div>
              <div className="mt-4">
                <ResultsToolbar
                  summary={
                    <>
                      <span>
                        Mostrando {areas.length} de {areaTotal}
                      </span>
                      <span>
                        Página {areasQuery.data?.page ?? areaPage} de {areaTotalPages}
                      </span>
                    </>
                  }
                  currentPage={areasQuery.data?.page ?? areaPage}
                  totalPages={areaTotalPages}
                  onPrevious={() => setAreaPage((prev) => Math.max(prev - 1, 1))}
                  onNext={() => setAreaPage((prev) => Math.min(prev + 1, areaTotalPages))}
                  previousDisabled={areaPage <= 1}
                  nextDisabled={areaPage >= areaTotalPages}
                  actions={
                    <select
                      aria-label="Límite de áreas por página"
                      value={String(areaLimit)}
                      onChange={(event) => {
                        setAreaLimit(Number(event.target.value));
                        setAreaPage(1);
                      }}
                      className="rounded-full border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
                    >
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="48">48</option>
                    </select>
                  }
                />
              </div>
              <div className="mt-4 grid gap-3">
                {areas.map((area) => (
                  <div
                    key={area.id}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-3 py-2 text-sm',
                      savedAreaCodeSet.has(area.code) && !pendingRemovals.includes(area.code)
                        ? 'border-brand-border bg-brand-bg text-brand-textMuted'
                        : pendingAdditions.includes(area.code)
                          ? 'border-brand-border bg-brand-accent/10 text-brand-text'
                          : pendingRemovals.includes(area.code)
                            ? 'border-ember/30 bg-ember/10 text-brand-text'
                            : 'border-transparent text-brand-textMuted',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAreas.includes(area.code)}
                      disabled={savedAreaCodeSet.has(area.code) && !pendingRemovals.includes(area.code)}
                      onChange={() => toggleArea(area.code)}
                    />
                    <span className="font-semibold text-ink">{area.code}</span>
                    <span className="text-xs text-brand-textMuted">{area.nombre}</span>
                    {savedAreaCodeSet.has(area.code) && !pendingRemovals.includes(area.code) ? (
                      <>
                        <span className="text-xs text-brand-textMuted">(área asignada)</span>
                        <Button
                          variant="danger"
                          className="ml-auto rounded-md px-2 py-1 text-xs"
                          onClick={() =>
                            setSelectedAreas((prev) => prev.filter((code) => code !== area.code))
                          }
                        >
                          Desasignar
                        </Button>
                      </>
                    ) : pendingAdditions.includes(area.code) ? (
                      <span className="ml-auto text-xs text-brand-accent">(se asignará al guardar)</span>
                    ) : pendingRemovals.includes(area.code) ? (
                      <>
                        <span className="ml-auto text-xs text-ember">(se desasignará al guardar)</span>
                        <Button
                          variant="outline"
                          className="rounded-md px-2 py-1 text-xs"
                          onClick={() =>
                            setSelectedAreas((prev) => [...prev, area.code].sort((a, b) => a.localeCompare(b)))
                          }
                        >
                          Cancelar cambio
                        </Button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              <ResponsiveActions>
                <Button
                  variant="outline"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() => setSelectedAreas(savedAreaCodes)}
                  disabled={!selectedUserId || !hasChanges}
                >
                  Restablecer
                </Button>
                <Button className="mt-4 w-full sm:w-auto" onClick={saveAreas} disabled={!selectedUserId || !hasChanges}>
                  Guardar
                </Button>
              </ResponsiveActions>
            </SectionCard>
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
