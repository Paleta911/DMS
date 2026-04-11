import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { usersSearch, type UserSearchFilters } from '../../api/endpoints/users';
import type { UserSearchItem } from '../../types/users';
import { Input } from '../ui/Input';
import { queryKeys } from '../../app/queryKeys';
import { translateRole, translateStatus } from '../../utils/labels';
import { ResponsiveTable, type ResponsiveColumn } from '../ui/ResponsiveTable';

export type AssignmentKind = 'review' | 'approve';
type UserSearchResultLayout = 'simple' | 'users-areas';
type UserAreaState = 'with_area' | 'without_area' | 'manual_area';

type UserSearchInputProps = {
  label: string;
  placeholder?: string;
  kind?: AssignmentKind;
  selectedUser: UserSearchItem | null;
  onSelect: (user: UserSearchItem | null) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  disabled?: boolean;
  showRecentOnEmpty?: boolean;
  filters?: UserSearchFilters;
  recentFilters?: UserSearchFilters;
  recentLimit?: number;
  searchLimit?: number | null;
  resultLayout?: UserSearchResultLayout;
};

type AssignmentEligibility = {
  isEligible: boolean;
  message: string | null;
};

const buildUserLabel = (user: UserSearchItem) => {
  const name = [user.nombre, user.primerApellido, user.segundoApellido]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (name.length > 0) {
    return `${name} (${user.email})`;
  }
  return user.email;
};

const buildUserName = (user: UserSearchItem) =>
  [user.nombre, user.primerApellido, user.segundoApellido]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Sin nombre';

function getUserAreaState(user: UserSearchItem): UserAreaState {
  if ((user.allowedAreaCodes?.length ?? 0) > 0) {
    return 'with_area';
  }
  if ((user.requestedAreaNombre?.trim() ?? '').length > 0) {
    return 'manual_area';
  }
  return 'without_area';
}

function translateAreaState(state: UserAreaState) {
  if (state === 'with_area') {
    return 'Con área';
  }
  if (state === 'manual_area') {
    return 'Área manual';
  }
  return 'Sin área';
}

function buildAreaLabel(user: UserSearchItem) {
  if ((user.allowedAreaCodes?.length ?? 0) > 0) {
    const visibleCodes = user.allowedAreaCodes!.slice(0, 2).map((area) => area.code);
    const remaining = user.allowedAreaCodes!.length - visibleCodes.length;
    return remaining > 0 ? `${visibleCodes.join(', ')} +${remaining}` : visibleCodes.join(', ');
  }
  return user.requestedAreaNombre?.trim() || 'Sin área';
}

function getStatusDotClass(status?: string | null) {
  switch (status) {
    case 'PENDING_VERIFICATION':
      return 'bg-amber-400';
    case 'PENDING_APPROVAL':
      return 'bg-sky-400';
    case 'APPROVED':
      return 'bg-emerald-400';
    case 'REJECTED':
      return 'bg-rose-400';
    case 'DELETED':
      return 'bg-slate-950';
    default:
      return 'bg-slate-400';
  }
}

function getAreaStateDotClass(state: UserAreaState) {
  switch (state) {
    case 'with_area':
      return 'bg-emerald-400';
    case 'manual_area':
      return 'bg-amber-400';
    default:
      return 'bg-rose-400';
  }
}

function IndicatorDot({ label, className }: { label: string; className: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className={[
        'inline-flex h-3 w-3 rounded-full border border-white/10 shadow-[0_0_0_4px_rgba(15,23,42,0.18)]',
        className,
      ].join(' ')}
    />
  );
}

export function getAssignmentEligibility(
  user: UserSearchItem | null,
  kind?: AssignmentKind,
): AssignmentEligibility {
  if (!user) {
    return { isEligible: false, message: null };
  }
  if (!kind) {
    return { isEligible: true, message: null };
  }
  if (user.status !== 'APPROVED') {
    return {
      isEligible: false,
      message: 'Usuario no aprobado. Debe estar en estado APROBADO.',
    };
  }
  if (!user.canAccess) {
    return {
      isEligible: false,
      message: 'Usuario sin acceso al sistema. Activa el permiso de acceso.',
    };
  }
  if (kind === 'review' && !user.canReview) {
    return {
      isEligible: false,
      message: 'Usuario sin permiso de revisión.',
    };
  }
  if (kind === 'approve' && !user.canApprove) {
    return {
      isEligible: false,
      message: 'Usuario sin permiso de aprobación.',
    };
  }
  return { isEligible: true, message: null };
}

export function UserSearchInput({
  label,
  placeholder,
  kind,
  selectedUser,
  onSelect,
  searchValue,
  onSearchChange,
  disabled,
  showRecentOnEmpty = false,
  filters,
  recentFilters,
  recentLimit = 10,
  searchLimit = 10,
  resultLayout = 'simple',
}: UserSearchInputProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const isControlled = typeof searchValue === 'string';
  const search = isControlled ? searchValue : internalSearch;

  const updateSearch = (value: string) => {
    if (!isControlled) {
      setInternalSearch(value);
    }
    onSearchChange?.(value);
  };
  const cleanedFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters ?? {}).filter(([, value]) => (value?.trim() ?? '').length > 0),
      ) as UserSearchFilters,
    [filters],
  );
  const hasExplicitFilters = Object.keys(cleanedFilters).length > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (selectedUser) {
      updateSearch(buildUserLabel(selectedUser));
    }
  }, [selectedUser]);

  const isRecentMode =
    showRecentOnEmpty && debounced.length === 0 && !selectedUser && !hasExplicitFilters;
  const activeFilters = useMemo(
    () => {
      if (!isRecentMode) {
        return cleanedFilters;
      }
      return {
        ...(recentFilters ?? {}),
        ...cleanedFilters,
      };
    },
    [cleanedFilters, isRecentMode, recentFilters],
  );
  const searchParams = useMemo(
    () => ({
      query: isRecentMode ? '__recent__' : debounced,
      recent: isRecentMode,
      filters: activeFilters,
      limit: isRecentMode ? recentLimit : searchLimit,
    }),
    [activeFilters, debounced, isRecentMode, recentLimit, searchLimit],
  );
  const searchQuery = useQuery({
    queryKey: queryKeys.users.searchList(searchParams),
    queryFn: () =>
      usersSearch(
        debounced,
        isRecentMode ? recentLimit : (searchLimit ?? undefined),
        isRecentMode,
        activeFilters,
      ),
    enabled:
      isRecentMode ||
      debounced.length >= 2 ||
      hasExplicitFilters,
  });

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const showHint = !showRecentOnEmpty && debounced.length < 2 && search.length > 0;
  const showResults = (isRecentMode || debounced.length >= 2 || hasExplicitFilters) && !selectedUser;
  const selectedEligibility = getAssignmentEligibility(selectedUser, kind);
  const isUsersAreasLayout = resultLayout === 'users-areas';
  const usersAreasColumns = useMemo<ResponsiveColumn<UserSearchItem>[]>(
    () => [
      {
        header: 'Estado',
        width: 72,
        minWidth: 72,
        headerClassName: 'text-center',
        className: 'text-center',
        cell: (user) => (
          <div className="flex justify-center">
            <IndicatorDot
              label={translateStatus(user.status)}
              className={getStatusDotClass(user.status)}
            />
          </div>
        ),
      },
      {
        header: 'Nombre',
        width: 300,
        minWidth: 200,
        cell: (user) => <span className="block truncate font-medium text-brand-text">{buildUserName(user)}</span>,
      },
      {
        header: 'Correo',
        width: 280,
        minWidth: 220,
        cell: (user) => <span className="block truncate text-brand-textMuted">{user.email}</span>,
      },
      {
        header: 'Área',
        width: 220,
        minWidth: 160,
        cell: (user) => <span className="block truncate text-brand-text">{buildAreaLabel(user)}</span>,
      },
      {
        header: 'Sit.',
        width: 76,
        minWidth: 76,
        headerClassName: 'text-center',
        className: 'text-center',
        cell: (user) => {
          const areaState = getUserAreaState(user);
          return (
            <div className="flex justify-center">
              <IndicatorDot
                label={translateAreaState(areaState)}
                className={getAreaStateDotClass(areaState)}
              />
            </div>
          );
        },
      },
      {
        header: 'Rol',
        width: 140,
        minWidth: 120,
        cell: (user) => <span className="text-brand-textMuted">{translateRole(user.role)}</span>,
      },
    ],
    [],
  );

  return (
    <div className="grid min-w-0 gap-2">
      <Input
        label={label}
        value={search}
        onChange={(event) => {
          updateSearch(event.target.value);
          if (selectedUser) {
            onSelect(null);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />

      {selectedUser ? (
        <>
          <div className="text-xs text-brand-textMuted">Seleccionado: {buildUserLabel(selectedUser)}</div>
          {kind && !selectedEligibility.isEligible && selectedEligibility.message ? (
            <div className="text-xs text-ember">{selectedEligibility.message}</div>
          ) : kind ? (
            <div className="text-xs text-brand-accent">Usuario apto para esta asignación.</div>
          ) : null}
        </>
      ) : null}

      {showHint ? (
        <div className="text-xs text-brand-textMuted">
          Escribe al menos 2 caracteres para buscar usuarios.
        </div>
      ) : null}

      {showResults ? (
        searchQuery.isLoading ? (
          <div className="text-xs text-brand-textMuted">
            {isRecentMode ? 'Cargando usuarios recientes...' : 'Buscando usuarios...'}
          </div>
        ) : searchQuery.isError ? (
          <div className="text-xs text-ember">
            No se pudo cargar la búsqueda de usuarios.
          </div>
        ) : results.length > 0 ? (
          isUsersAreasLayout ? (
            <div className="grid gap-2">
              {isRecentMode ? (
                <div className="px-2 text-xs font-medium uppercase tracking-widest text-brand-textMuted">
                  Usuarios recientes
                </div>
              ) : null}
              <ResponsiveTable
                columns={usersAreasColumns}
                items={results}
                getRowKey={(user) => user.id}
                onRowClick={(user) => onSelect(user)}
                renderMobileCard={(user) => {
                  const areaState = getUserAreaState(user);
                  return (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <IndicatorDot
                            label={translateStatus(user.status)}
                            className={getStatusDotClass(user.status)}
                          />
                          <span className="truncate font-medium text-brand-text">{buildUserName(user)}</span>
                        </div>
                        <span className="text-xs text-brand-textMuted">{translateRole(user.role)}</span>
                      </div>
                      <div className="text-sm text-brand-textMuted">{user.email}</div>
                      <div className="flex items-center justify-between gap-3 text-xs text-brand-textMuted">
                        <span className="truncate">Área: {buildAreaLabel(user)}</span>
                        <div className="flex items-center gap-2">
                          <IndicatorDot
                            label={translateAreaState(areaState)}
                            className={getAreaStateDotClass(areaState)}
                          />
                          <span>{translateAreaState(areaState)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
                ariaLabel="Resultados de usuarios"
                maxDesktopHeightPx={360}
                stickyHeader
              />
            </div>
          ) : (
            <div className="grid gap-2 rounded-lg border border-brand-border bg-brand-surface p-2 text-sm shadow-sm">
              {isRecentMode ? (
                <div className="px-2 text-xs font-medium uppercase tracking-widest text-brand-textMuted">
                  Usuarios recientes
                </div>
              ) : null}
              {results.map((user) => {
                const eligibility = getAssignmentEligibility(user, kind);
                return (
                  <button
                    key={user.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm text-brand-text transition hover:bg-brand-bg"
                    onClick={() => {
                      onSelect(user);
                    }}
                  >
                    <span className="truncate">{buildUserLabel(user)}</span>
                    <span className="ml-3 inline-flex items-center gap-1 text-xs text-brand-textMuted">
                      #{user.id}
                      {kind ? (
                        eligibility.isEligible ? (
                          <CheckCircle2 size={14} className="text-brand-accent" />
                        ) : (
                          <XCircle size={14} className="text-ember" />
                        )
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-xs text-brand-textMuted">
            {isRecentMode
              ? 'No hay usuarios recientes para mostrar.'
              : debounced.length > 0
                ? `No se encontraron usuarios con "${debounced}".`
                : 'No se encontraron usuarios con los filtros seleccionados.'}
          </div>
        )
      ) : null}
    </div>
  );
}
