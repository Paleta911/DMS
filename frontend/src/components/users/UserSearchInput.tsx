import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { usersSearch } from '../../api/endpoints/users';
import type { UserSearchItem } from '../../types/users';
import { Input } from '../ui/Input';
import { queryKeys } from '../../app/queryKeys';

export type AssignmentKind = 'review' | 'approve';

type UserSearchInputProps = {
  label: string;
  placeholder?: string;
  kind?: AssignmentKind;
  selectedUser: UserSearchItem | null;
  onSelect: (user: UserSearchItem | null) => void;
  disabled?: boolean;
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
  disabled,
}: UserSearchInputProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (selectedUser) {
      setSearch(buildUserLabel(selectedUser));
    }
  }, [selectedUser]);

  const searchQuery = useQuery({
    queryKey: queryKeys.users.searchList(debounced),
    queryFn: () => usersSearch(debounced),
    enabled: debounced.length >= 2,
  });

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const showHint = debounced.length < 2 && search.length > 0;
  const showResults = debounced.length >= 2 && !selectedUser;
  const selectedEligibility = getAssignmentEligibility(selectedUser, kind);

  return (
    <div className="grid gap-2">
      <Input
        label={label}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
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
          <div className="text-xs text-brand-textMuted">Buscando usuarios...</div>
        ) : results.length > 0 ? (
          <div className="grid gap-2 rounded-lg border border-brand-border bg-brand-surface p-2 text-sm shadow-sm">
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
        ) : (
          <div className="text-xs text-brand-textMuted">
            No se encontraron usuarios con &quot;{debounced}&quot;.
          </div>
        )
      ) : null}
    </div>
  );
}
