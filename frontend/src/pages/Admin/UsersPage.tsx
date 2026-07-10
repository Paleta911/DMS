import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  adminRegistrationApprove,
  adminRegistrationDelete,
  adminRegistrationDeletePermanent,
  adminRegistrationForceVerify,
  adminRegistrationReject,
  adminRegistrationRestore,
  adminRegistrationResend,
  adminRegistrationsExportCsv,
  adminRegistrationsList,
  type RegistrationRecord,
  type RegistrationStatus,
} from "../../api/endpoints/adminRegistrations";
import {
  usersDeletePermanent,
  usersGet,
  usersRestoreDeleted,
  usersSetAreas,
} from "../../api/endpoints/users";
import { areaCodesListPaged } from "../../api/endpoints/types";
import { AccessDenied } from "../../components/AccessDenied";
import { useAuth } from "../../auth/AuthContext";
import { queryClient } from "../../app/queryClient";
import {
  invalidateAdminRegistrations,
  invalidateUserDetail,
} from "../../app/queryInvalidation";
import { queryKeys } from "../../app/queryKeys";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { SectionCard } from "../../components/layout/SectionCard";
import { ResponsiveActions } from "../../components/layout/ResponsiveActions";
import { DataTableSection } from "../../components/layout/DataTableSection";
import { FilterCard } from "../../components/layout/FilterCard";
import { ResultsToolbar } from "../../components/layout/ResultsToolbar";
import { SavedViewsToolbar } from "../../components/layout/SavedViewsToolbar";
import { NoticeBanner } from "../../components/ui/NoticeBanner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import {
  LegendSelect,
  type LegendSelectOption,
} from "../../components/ui/LegendSelect";
import { ConfirmActionModal } from "../../components/admin/ConfirmActionModal";
import { TextFieldModal } from "../../components/admin/TextFieldModal";
import { ExportMenu } from "../../components/ui/ExportMenu";
import { type ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { AdminActionList } from "../../components/admin/AdminActionList";
import { UserSearchInput } from "../../components/users/UserSearchInput";
import { useToast } from "../../components/ToastProvider";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useSavedViews } from "../../hooks/useSavedViews";
import { translateRole, translateStatus } from "../../utils/labels";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob, downloadJson } from "../../utils/download";
import type { UserProfile, UserSearchItem } from "../../types/users";

// Super-admin operations page for user/registration lifecycle, area assignment, and account actions.
type UserSearchFilters = {
  status: string;
  role: string;
  areaState: string;
};

type UserDirectoryFilters = UserSearchFilters & {
  search: string;
};

type UserAreaFilters = {
  areaSearch: string;
  areaPage: number;
  areaLimit: number;
};

type UserActionTarget = {
  id: number;
  email: string;
};

const INITIAL_USER_SEARCH_FILTERS: UserSearchFilters = {
  status: "",
  role: "",
  areaState: "",
};

const INITIAL_USER_DIRECTORY_FILTERS: UserDirectoryFilters = {
  search: "",
  ...INITIAL_USER_SEARCH_FILTERS,
};

const INITIAL_USER_AREA_FILTERS: UserAreaFilters = {
  areaSearch: "",
  areaPage: 1,
  areaLimit: 12,
};

const USER_STATUS_FILTER_OPTIONS: LegendSelectOption[] = [
  { value: "", label: "Todos" },
  {
    value: "PENDING_VERIFICATION",
    label: "Pendiente de verificación",
    dotClassName: "bg-amber-400",
  },
  {
    value: "PENDING_APPROVAL",
    label: "Pendiente de aprobación",
    dotClassName: "bg-sky-400",
  },
  { value: "APPROVED", label: "Aprobado", dotClassName: "bg-emerald-400" },
  { value: "REJECTED", label: "Rechazado", dotClassName: "bg-rose-400" },
  { value: "DELETED", label: "Eliminado", dotClassName: "bg-slate-950" },
];

const AREA_STATE_FILTER_OPTIONS: LegendSelectOption[] = [
  { value: "", label: "Todas" },
  {
    value: "with_area",
    label: "Con áreas asignadas",
    dotClassName: "bg-emerald-400",
  },
  {
    value: "without_area",
    label: "Sin áreas asignadas",
    dotClassName: "bg-rose-400",
  },
  {
    value: "manual_area",
    label: "Área manual solicitada",
    dotClassName: "bg-amber-400",
  },
];

const REGISTRATION_STATUS_OPTIONS: LegendSelectOption[] = [
  { value: "ALL", label: "Todos" },
  {
    value: "PENDING_VERIFICATION",
    label: "Pendiente verificación",
    dotClassName: "bg-amber-400",
  },
  {
    value: "PENDING_APPROVAL",
    label: "Pendiente aprobación",
    dotClassName: "bg-sky-400",
  },
  { value: "APPROVED", label: "Aprobado", dotClassName: "bg-emerald-400" },
  { value: "REJECTED", label: "Rechazado", dotClassName: "bg-rose-400" },
];

function toAreaCode(value: { code?: string } | string | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : (value.code ?? "");
}

function buildUserName(user: {
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
}) {
  return (
    [user.nombre, user.primerApellido, user.segundoApellido]
      .filter(Boolean)
      .join(" ")
      .trim() || "Sin nombre"
  );
}

function getStatusDotClass(status?: string | null) {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-amber-400";
    case "PENDING_APPROVAL":
      return "bg-sky-400";
    case "APPROVED":
      return "bg-emerald-400";
    case "REJECTED":
      return "bg-rose-400";
    case "DELETED":
      return "bg-slate-950";
    default:
      return "bg-slate-400";
  }
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function buildAreaLabel(item: RegistrationRecord) {
  return item.requestedAreaNombre
    ? `${item.areaLabel ?? "Mi área no está en la lista"}: ${item.requestedAreaNombre}`
    : (item.areaLabel ?? "-");
}

function mapRegistrationToSelectedUser(
  item: RegistrationRecord,
): UserSearchItem {
  return {
    id: item.id,
    email: item.email,
    nombre: item.nombre ?? null,
    primerApellido: item.primerApellido ?? null,
    segundoApellido: item.segundoApellido ?? null,
    role: "user",
    status: item.status,
  };
}

function buildRegistrationActions(
  item: RegistrationRecord,
  actions: {
    onApprove: (id: number) => void;
    onDelete: (item: RegistrationRecord) => void;
    onDeletePermanent: (item: RegistrationRecord) => void;
    onReject: (item: RegistrationRecord) => void;
    onRestore: (id: number) => void;
    onResend: (id: number) => void;
    onForceVerify: (id: number) => void;
  },
) {
  // Available actions depend on current registration lifecycle status.
  const result: Array<{
    key: string;
    label: string;
    onClick: () => void;
    variant: "outline" | "danger";
  }> = [];

  if (item.status === "PENDING_APPROVAL") {
    result.push(
      {
        key: `approve-${item.id}`,
        label: "Aprobar",
        onClick: () => actions.onApprove(item.id),
        variant: "outline",
      },
      {
        key: `reject-${item.id}`,
        label: "Rechazar",
        onClick: () => actions.onReject(item),
        variant: "danger",
      },
    );
  }

  if (item.status === "PENDING_VERIFICATION") {
    result.push(
      {
        key: `resend-${item.id}`,
        label: "Reenviar",
        onClick: () => actions.onResend(item.id),
        variant: "outline",
      },
      {
        key: `force-${item.id}`,
        label: "Forzar verificación",
        onClick: () => actions.onForceVerify(item.id),
        variant: "outline",
      },
    );
  }

  if (item.status === "REJECTED") {
    result.push({
      key: `restore-${item.id}`,
      label: "Restaurar",
      onClick: () => actions.onRestore(item.id),
      variant: "outline",
    });
  }

  if (item.status === "APPROVED") {
    result.push(
      {
        key: `delete-${item.id}`,
        label: "Eliminar",
        onClick: () => actions.onDelete(item),
        variant: "outline",
      },
      {
        key: `delete-permanent-${item.id}`,
        label: "Eliminar definitivamente",
        onClick: () => actions.onDeletePermanent(item),
        variant: "danger",
      },
    );
  }

  return result;
}

function StatusDot({
  status,
  label,
}: {
  status?: string | null;
  label: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={[
        "inline-flex h-3 w-3 rounded-full border border-white/10 shadow-[0_0_0_4px_rgba(15,23,42,0.18)]",
        getStatusDotClass(status),
      ].join(" ")}
    />
  );
}

export default function UsersPage() {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const { notify } = useToast();
  const {
    initialFilters: initialUserDirectoryFilters,
    rememberLastUsed: rememberUserDirectoryFilters,
  } = useSavedViews<UserDirectoryFilters>({
    storageKey: "admin-users-directory-filters",
    scope: user?.email ?? null,
    fallback: INITIAL_USER_DIRECTORY_FILTERS,
  });
  const {
    initialFilters: initialUserAreaFilters,
    rememberLastUsed: rememberUserAreaFilters,
  } = useSavedViews<UserAreaFilters>({
    storageKey: "admin-users-area-filters",
    scope: user?.email ?? null,
    fallback: INITIAL_USER_AREA_FILTERS,
  });
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [userSearchText, setUserSearchText] = useState(
    initialUserDirectoryFilters.search,
  );
  const [userSearchFilters, setUserSearchFilters] = useState<UserSearchFilters>(
    {
      status: initialUserDirectoryFilters.status,
      role: initialUserDirectoryFilters.role,
      areaState: initialUserDirectoryFilters.areaState,
    },
  );
  const [areaSearch, setAreaSearch] = useState(
    initialUserAreaFilters.areaSearch,
  );
  const [areaPage, setAreaPage] = useState(initialUserAreaFilters.areaPage);
  const [areaLimit, setAreaLimit] = useState(initialUserAreaFilters.areaLimit);
  const [rejectTarget, setRejectTarget] = useState<UserActionTarget | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<UserActionTarget | null>(
    null,
  );
  const [restoreDeletedTarget, setRestoreDeletedTarget] =
    useState<UserActionTarget | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] =
    useState<UserActionTarget | null>(null);
  const [isRestoringDeletedUser, setIsRestoringDeletedUser] = useState(false);
  const [isPermanentlyDeletingUser, setIsPermanentlyDeletingUser] =
    useState(false);
  const debouncedAreaSearch = useDebouncedValue(areaSearch);
  const {
    initialFilters,
    views,
    saveCurrentView,
    deleteView,
    rememberLastUsed,
  } = useSavedViews<{
    status: RegistrationStatus | "ALL";
    search: string;
    page: number;
    limit: number;
  }>({
    storageKey: "registration-filters",
    scope: user?.email ?? null,
    fallback: {
      status: "ALL",
      search: "",
      page: 1,
      limit: 20,
    },
  });
  const [registrationStatus, setRegistrationStatus] = useState<
    RegistrationStatus | "ALL"
  >(initialFilters.status);
  const [registrationSearch, setRegistrationSearch] = useState(
    initialFilters.search,
  );
  const [registrationPage, setRegistrationPage] = useState(initialFilters.page);
  const [registrationLimit, setRegistrationLimit] = useState(
    initialFilters.limit,
  );
  const debouncedRegistrationSearch = useDebouncedValue(registrationSearch);

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

  const registrationsQuery = useQuery({
    queryKey: queryKeys.registrations.list({
      status: registrationStatus,
      q: debouncedRegistrationSearch,
      page: registrationPage,
      limit: registrationLimit,
    }),
    queryFn: () =>
      adminRegistrationsList({
        status: registrationStatus === "ALL" ? undefined : registrationStatus,
        q: debouncedRegistrationSearch.trim() || undefined,
        page: registrationPage,
        limit: registrationLimit,
      }),
    enabled: isSuperAdmin,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    // Keep selected areas aligned when user detail query changes.
    if (userQuery.data) {
      setSelectedAreas(
        (userQuery.data.allowedAreaCodes ?? [])
          .map((area) => toAreaCode(area))
          .filter((area): area is string => area.length > 0),
      );
    }
  }, [userQuery.data]);

  useEffect(() => {
    rememberUserDirectoryFilters({
      search: userSearchText,
      status: userSearchFilters.status,
      role: userSearchFilters.role,
      areaState: userSearchFilters.areaState,
    });
  }, [
    rememberUserDirectoryFilters,
    userSearchFilters.areaState,
    userSearchFilters.role,
    userSearchFilters.status,
    userSearchText,
  ]);

  useEffect(() => {
    rememberUserAreaFilters({
      areaSearch,
      areaPage,
      areaLimit,
    });
  }, [areaLimit, areaPage, areaSearch, rememberUserAreaFilters]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }
    rememberLastUsed({
      status: registrationStatus,
      search: registrationSearch,
      page: registrationPage,
      limit: registrationLimit,
    });
  }, [
    isSuperAdmin,
    registrationLimit,
    registrationPage,
    registrationSearch,
    registrationStatus,
    rememberLastUsed,
  ]);

  const refreshAdminViews = async (userId: number | null | undefined) => {
    // Fan-out invalidation keeps admin tabs coherent after user/registration actions.
    await Promise.all([
      invalidateUserDetail(queryClient, userId),
      queryClient.invalidateQueries({ queryKey: queryKeys.users.search }),
      invalidateAdminRegistrations(queryClient),
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all }),
    ]);
  };

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
  const requestedAreaNombre = userQuery.data?.requestedAreaNombre?.trim() ?? "";
  const hasRequestedCustomArea =
    requestedAreaNombre.length > 0 && savedAreaCodes.length === 0;
  const selectedUserStatus = userQuery.data?.status;
  const isDeletedUser = selectedUserStatus === "DELETED";
  const isRejectedUser = selectedUserStatus === "REJECTED";
  const isPendingVerification = selectedUserStatus === "PENDING_VERIFICATION";
  const isPendingApproval = selectedUserStatus === "PENDING_APPROVAL";
  const isApprovedUser = selectedUserStatus === "APPROVED";
  const isMutableTarget = Boolean(
    userQuery.data &&
    userQuery.data.role !== "admin" &&
    !userQuery.data.isSuperAdmin,
  );

  const savedAreaCodeSet = useMemo(
    () => new Set(savedAreaCodes),
    [savedAreaCodes],
  );
  const selectedAreaCodeSet = useMemo(
    () => new Set(selectedAreas),
    [selectedAreas],
  );
  const pendingAdditions = useMemo(
    () => selectedAreas.filter((code) => !savedAreaCodeSet.has(code)),
    [savedAreaCodeSet, selectedAreas],
  );
  const pendingRemovals = useMemo(
    () => savedAreaCodes.filter((code) => !selectedAreaCodeSet.has(code)),
    [savedAreaCodes, selectedAreaCodeSet],
  );
  const hasAreaChanges =
    pendingAdditions.length > 0 || pendingRemovals.length > 0;

  const registrationsTotal = registrationsQuery.data?.total ?? 0;
  const registrationsTotalPages = Math.max(
    1,
    Math.ceil(registrationsTotal / registrationLimit),
  );

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationApprove(id),
    onSuccess: async (_, id) => {
      notify("Registro aprobado", "success");
      await refreshAdminViews(id);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al aprobar"), "error");
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationResend(id),
    onSuccess: async (_, id) => {
      notify("Código reenviado", "success");
      await refreshAdminViews(id);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al reenviar"), "error");
    },
  });

  const restoreRegistrationMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationRestore(id),
    onSuccess: async (_, id) => {
      notify("Registro restaurado", "success");
      await refreshAdminViews(id);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al restaurar"), "error");
    },
  });

  const forceVerifyMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationForceVerify(id),
    onSuccess: async (_, id) => {
      notify("Registro verificado manualmente", "success");
      await refreshAdminViews(id);
    },
    onError: (error: any) => {
      notify(
        getApiErrorMessage(error, "Error al forzar verificación"),
        "error",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: number; reason?: string }) =>
      adminRegistrationReject(payload.id, payload.reason),
    onSuccess: async (_, payload) => {
      notify("Registro rechazado", "success");
      await refreshAdminViews(payload.id);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al rechazar"), "error");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationDelete(id),
    onSuccess: async (_, id) => {
      notify("Usuario suspendido", "success");
      await refreshAdminViews(id);
    },
    onError: (error: any) => {
      notify(getApiErrorMessage(error, "Error al suspender usuario"), "error");
    },
  });

  const deletePermanentMutation = useMutation({
    mutationFn: (id: number) => adminRegistrationDeletePermanent(id),
    onSuccess: async (_, id) => {
      notify("Usuario eliminado definitivamente", "success");
      if (selectedUserId === id) {
        setSelectedUser(null);
        setSelectedAreas([]);
      }
      await refreshAdminViews(id);
    },
    onError: (error: any) => {
      notify(
        getApiErrorMessage(error, "Error al eliminar definitivamente"),
        "error",
      );
    },
  });

  const saveAreas = async () => {
    if (!selectedUserId) {
      notify("Selecciona un usuario", "error");
      return;
    }
    if (!userQuery.data) {
      notify("Usuario no encontrado", "error");
      return;
    }
    try {
      await usersSetAreas(selectedUserId, selectedAreas);
      notify("Áreas actualizadas", "success");
      await refreshAdminViews(selectedUserId);
    } catch (error: any) {
      notify(getApiErrorMessage(error, "Error al actualizar"), "error");
    }
  };

  const restoreDeletedUser = async () => {
    if (!restoreDeletedTarget) {
      return;
    }
    try {
      setIsRestoringDeletedUser(true);
      await usersRestoreDeleted(restoreDeletedTarget.id);
      notify("Usuario restaurado", "success");
      setRestoreDeletedTarget(null);
      await refreshAdminViews(restoreDeletedTarget.id);
    } catch (error: any) {
      notify(getApiErrorMessage(error, "Error al restaurar usuario"), "error");
    } finally {
      setIsRestoringDeletedUser(false);
    }
  };

  const permanentlyDeleteSelectedUser = async () => {
    if (!permanentDeleteTarget) {
      return;
    }
    try {
      setIsPermanentlyDeletingUser(true);
      const targetId = permanentDeleteTarget.id;
      const canUseUsersEndpoint = isDeletedUser || !isSuperAdmin;
      if (canUseUsersEndpoint) {
        await usersDeletePermanent(targetId);
      } else {
        await deletePermanentMutation.mutateAsync(targetId);
      }
      if (canUseUsersEndpoint) {
        notify("Usuario eliminado definitivamente", "success");
        if (selectedUserId === targetId) {
          setSelectedUser(null);
          setSelectedAreas([]);
        }
        await refreshAdminViews(targetId);
      }
      setPermanentDeleteTarget(null);
    } catch (error: any) {
      notify(
        getApiErrorMessage(error, "Error al eliminar definitivamente"),
        "error",
      );
    } finally {
      setIsPermanentlyDeletingUser(false);
    }
  };

  const registrationColumns = useMemo<ResponsiveColumn<RegistrationRecord>[]>(
    () => [
      {
        header: "Correo",
        cell: (item) => item.email,
        minWidth: 220,
        width: 240,
      },
      {
        header: "Nombre",
        minWidth: 220,
        width: 280,
        cell: (item) => buildUserName(item),
      },
      {
        header: "Teléfono",
        cell: (item) => item.telefono ?? "-",
        minWidth: 140,
        width: 150,
      },
      {
        header: "Nacimiento",
        cell: (item) => formatDate(item.fechaNacimiento),
        minWidth: 130,
        width: 140,
      },
      {
        header: "Estado",
        width: 86,
        minWidth: 86,
        headerClassName: "text-center",
        className: "text-center",
        cell: (item) => (
          <div className="flex justify-center">
            <StatusDot
              status={item.status}
              label={translateStatus(item.status)}
            />
          </div>
        ),
      },
      {
        header: "Área",
        cell: (item) => buildAreaLabel(item),
        minWidth: 210,
        width: 250,
      },
      {
        header: "Registrado",
        cell: (item) => formatDate(item.registeredAt),
        minWidth: 130,
        width: 140,
      },
      {
        header: "Envíos",
        cell: (item) =>
          `${translateStatus(item.sendStatus) ?? "-"} (${item.sendAttempts ?? 0})`,
        minWidth: 140,
        width: 150,
      },
      {
        header: "Último envío",
        cell: (item) => formatDate(item.lastSentAt),
        minWidth: 130,
        width: 140,
      },
      {
        header: "Intentos",
        cell: (item) => item.verifyAttempts ?? 0,
        minWidth: 100,
        width: 100,
      },
      {
        header: "Error",
        cell: (item) => item.lastError ?? "-",
        minWidth: 220,
        width: 240,
      },
      {
        header: "Verificado",
        cell: (item) => formatDate(item.verifiedAt),
        minWidth: 130,
        width: 140,
      },
      {
        header: "Acciones",
        minWidth: 260,
        width: 320,
        cell: (item) => (
          <AdminActionList
            actions={buildRegistrationActions(item, {
              onApprove: (id) => approveMutation.mutate(id),
              onDelete: (record) =>
                setSuspendTarget({ id: record.id, email: record.email }),
              onDeletePermanent: (record) =>
                setPermanentDeleteTarget({
                  id: record.id,
                  email: record.email,
                }),
              onReject: (record) =>
                setRejectTarget({ id: record.id, email: record.email }),
              onRestore: (id) => restoreRegistrationMutation.mutate(id),
              onResend: (id) => resendMutation.mutate(id),
              onForceVerify: (id) => forceVerifyMutation.mutate(id),
            })}
          />
        ),
      },
    ],
    [
      approveMutation,
      forceVerifyMutation,
      resendMutation,
      restoreRegistrationMutation,
    ],
  );

  if (!isAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const triggerReject = () => {
    if (!rejectTarget) {
      return;
    }
    rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason });
    setRejectTarget(null);
    setRejectReason("");
  };

  const openSuspendSelectedUser = () => {
    if (!userQuery.data) {
      return;
    }
    setSuspendTarget({ id: userQuery.data.id, email: userQuery.data.email });
  };

  const openPermanentDeleteSelectedUser = () => {
    if (!userQuery.data) {
      return;
    }
    setPermanentDeleteTarget({
      id: userQuery.data.id,
      email: userQuery.data.email,
    });
  };

  const openRestoreDeletedSelectedUser = () => {
    if (!userQuery.data) {
      return;
    }
    setRestoreDeletedTarget({
      id: userQuery.data.id,
      email: userQuery.data.email,
    });
  };

  const runApprove = () => {
    if (!selectedUserId) {
      return;
    }
    approveMutation.mutate(selectedUserId);
  };

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Usuarios"
          subtitle="Gestiona cuentas, registros y áreas desde un solo lugar."
        />

        <SectionCard>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <LegendSelect
                label="Estado"
                value={userSearchFilters.status}
                options={USER_STATUS_FILTER_OPTIONS}
                onChange={(value) =>
                  setUserSearchFilters((prev) => ({ ...prev, status: value }))
                }
              />
              <Select
                label="Rol"
                value={userSearchFilters.role}
                onChange={(event) =>
                  setUserSearchFilters((prev) => ({
                    ...prev,
                    role: event.target.value,
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </Select>
              <LegendSelect
                label="Situación de área"
                value={userSearchFilters.areaState}
                options={AREA_STATE_FILTER_OPTIONS}
                onChange={(value) =>
                  setUserSearchFilters((prev) => ({
                    ...prev,
                    areaState: value,
                  }))
                }
              />
            </div>
            <UserSearchInput
              label="Usuario (correo o nombre)"
              placeholder="Busca por correo o nombre..."
              selectedUser={selectedUser}
              onSelect={(nextUser) => setSelectedUser(nextUser)}
              searchValue={userSearchText}
              onSearchChange={setUserSearchText}
              showRecentOnEmpty
              filters={userSearchFilters}
              recentFilters={{ role: "user" }}
              recentLimit={10}
              searchLimit={null}
              resultLayout="users-areas"
            />
            <ResponsiveActions>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setUserSearchText(INITIAL_USER_DIRECTORY_FILTERS.search);
                  setUserSearchFilters(INITIAL_USER_SEARCH_FILTERS);
                }}
                disabled={
                  !userSearchText &&
                  !userSearchFilters.status &&
                  !userSearchFilters.role &&
                  !userSearchFilters.areaState
                }
              >
                Limpiar filtros
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedAreas([]);
                }}
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
            Busca un correo o nombre y elige un usuario para revisar su cuenta,
            sus registros y sus áreas actuales.
          </NoticeBanner>
        ) : null}

        {selectedUser && userQuery.isLoading ? (
          <NoticeBanner title="Cargando perfil">
            Obteniendo información del usuario seleccionado.
          </NoticeBanner>
        ) : null}

        {selectedUser && userQuery.isError ? (
          <NoticeBanner variant="error" title="No se pudo cargar el usuario">
            Intenta actualizar la búsqueda o vuelve a seleccionar el usuario.
          </NoticeBanner>
        ) : null}
        {selectedUser && userQuery.data ? (
          <div id="admin-user-detail" className="grid gap-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <SectionCard>
                <div className="font-display text-lg text-ink">Perfil</div>
                <div className="mt-3 grid gap-2 text-sm text-brand-textMuted">
                  <div className="truncate">Correo: {userQuery.data.email}</div>
                  <div>Nombre: {buildUserName(userQuery.data)}</div>
                  <div>Rol: {translateRole(userQuery.data.role)}</div>
                  <div className="flex items-center gap-2">
                    <StatusDot
                      status={userQuery.data.status}
                      label={translateStatus(userQuery.data.status)}
                    />
                    <span>
                      Estado: {translateStatus(userQuery.data.status)}
                    </span>
                  </div>
                  <div>Teléfono: {userQuery.data.telefono ?? "-"}</div>
                  <div>
                    Fecha de nacimiento:{" "}
                    {formatDate(userQuery.data.fechaNacimiento)}
                  </div>
                  <div>
                    Registrado: {formatDateTime(userQuery.data.createdAt)}
                  </div>
                  <div>
                    Verificado: {formatDateTime(userQuery.data.verifiedAt)}
                  </div>
                  <div>
                    Aprobado: {formatDateTime(userQuery.data.approvedAt)}
                  </div>
                  {userQuery.data.deletedAt ? (
                    <div>
                      Suspensión: {formatDateTime(userQuery.data.deletedAt)}
                    </div>
                  ) : null}
                  {userQuery.data.rejectedReason ? (
                    <div>
                      Motivo de rechazo: {userQuery.data.rejectedReason}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {savedAreaCodes.length > 0 ? (
                    savedAreaCodes.map((area) => (
                      <span
                        key={area}
                        className="tag bg-brand-muted/20 text-brand-text"
                      >
                        {area}
                      </span>
                    ))
                  ) : hasRequestedCustomArea ? (
                    <span className="tag bg-brand-muted/20 text-brand-text">
                      Mi área no está en la lista
                    </span>
                  ) : (
                    <span className="text-sm text-brand-textMuted">
                      Sin áreas asignadas
                    </span>
                  )}
                </div>
                {requestedAreaNombre ? (
                  <div className="mt-3 text-sm text-brand-textMuted">
                    Área solicitada: {requestedAreaNombre}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard>
                <div className="font-display text-lg text-ink">
                  {isSuperAdmin ? "Registro y acciones" : "Estado de cuenta"}
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-2 text-sm text-brand-textMuted md:grid-cols-2">
                    <div>
                      Estado de envío:{" "}
                      {translateStatus(userQuery.data.sendStatus)}
                    </div>
                    <div>
                      Envíos realizados: {userQuery.data.sendAttempts ?? 0}
                    </div>
                    <div>
                      Último envío: {formatDateTime(userQuery.data.lastSentAt)}
                    </div>
                    <div>
                      Intentos de verificación:{" "}
                      {userQuery.data.verifyAttempts ?? 0}
                    </div>
                    <div>
                      Último intento:{" "}
                      {formatDateTime(userQuery.data.lastAttemptAt)}
                    </div>
                    <div>
                      Error último envío: {userQuery.data.lastError ?? "-"}
                    </div>
                  </div>

                  {isDeletedUser ? (
                    <NoticeBanner variant="warning" title="Cuenta suspendida">
                      Esta cuenta perdió acceso al sistema. Puedes restaurarla o
                      eliminarla definitivamente.
                    </NoticeBanner>
                  ) : isPendingVerification ? (
                    <NoticeBanner title="Pendiente de verificación">
                      Falta verificar el correo antes de pasar a aprobación.
                    </NoticeBanner>
                  ) : isPendingApproval ? (
                    <NoticeBanner title="Pendiente de aprobación">
                      El correo ya fue verificado. Falta la decisión del
                      superadmin.
                    </NoticeBanner>
                  ) : isRejectedUser ? (
                    <NoticeBanner variant="warning" title="Registro rechazado">
                      El registro fue rechazado. Puedes restaurarlo para
                      devolverlo a su etapa correspondiente.
                    </NoticeBanner>
                  ) : isApprovedUser ? (
                    <NoticeBanner variant="success" title="Cuenta aprobada">
                      La cuenta está activa y puede usar el sistema según sus
                      permisos actuales.
                    </NoticeBanner>
                  ) : null}

                  {!isMutableTarget ? (
                    <NoticeBanner
                      variant="warning"
                      title="Cuenta administrativa"
                    >
                      Las cuentas administrativas no se gestionan desde este
                      módulo.
                    </NoticeBanner>
                  ) : null}

                  {isMutableTarget ? (
                    <ResponsiveActions>
                      {isSuperAdmin && isPendingVerification ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              resendMutation.mutate(userQuery.data.id)
                            }
                          >
                            Reenviar código
                          </Button>
                          <Button
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              forceVerifyMutation.mutate(userQuery.data.id)
                            }
                          >
                            Forzar verificación
                          </Button>
                        </>
                      ) : null}

                      {isSuperAdmin && isPendingApproval ? (
                        <>
                          <Button
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={runApprove}
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="danger"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              setRejectTarget({
                                id: userQuery.data.id,
                                email: userQuery.data.email,
                              })
                            }
                          >
                            Rechazar
                          </Button>
                        </>
                      ) : null}

                      {isSuperAdmin && isRejectedUser ? (
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() =>
                            restoreRegistrationMutation.mutate(
                              userQuery.data.id,
                            )
                          }
                        >
                          Restaurar registro
                        </Button>
                      ) : null}

                      {isSuperAdmin && isApprovedUser ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={openSuspendSelectedUser}
                          >
                            Suspender
                          </Button>
                          <Button
                            variant="danger"
                            className="w-full sm:w-auto"
                            onClick={openPermanentDeleteSelectedUser}
                          >
                            Eliminar definitivamente
                          </Button>
                        </>
                      ) : null}

                      {isDeletedUser ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={openRestoreDeletedSelectedUser}
                          >
                            Restaurar
                          </Button>
                          <Button
                            variant="danger"
                            className="w-full sm:w-auto"
                            onClick={openPermanentDeleteSelectedUser}
                          >
                            Eliminar definitivamente
                          </Button>
                        </>
                      ) : null}
                    </ResponsiveActions>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <SectionCard>
              <div className="font-display text-lg text-ink">Asignar áreas</div>
              <div className="mt-4 grid gap-3">
                {isDeletedUser ? (
                  <NoticeBanner variant="warning" title="Usuario eliminado">
                    Esta cuenta está suspendida. Restaúrala primero si necesitas
                    volver a asignar áreas.
                  </NoticeBanner>
                ) : hasAreaChanges ? (
                  <NoticeBanner variant="warning" title="Cambios pendientes">
                    Guarda para aplicar {pendingAdditions.length} asignación(es)
                    y {pendingRemovals.length} desasignación(es).
                  </NoticeBanner>
                ) : savedAreaCodes.length === 0 ? (
                  hasRequestedCustomArea ? (
                    <NoticeBanner
                      variant="warning"
                      title="Área manual solicitada"
                    >
                      Este usuario se registró con un área que no estaba en la
                      lista: {requestedAreaNombre}. Asigna un área real cuando
                      esté disponible.
                    </NoticeBanner>
                  ) : (
                    <NoticeBanner title="Sin áreas asignadas">
                      Este usuario aún no tiene áreas. Marca una o más áreas y
                      guarda para asignarlas.
                    </NoticeBanner>
                  )
                ) : (
                  <NoticeBanner
                    variant="success"
                    title="Sin cambios pendientes"
                  >
                    Las áreas mostradas ya coinciden con la configuración actual
                    del usuario.
                  </NoticeBanner>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px]">
                <Input
                  label="Buscar área"
                  placeholder="Código o nombre"
                  value={areaSearch}
                  disabled={isDeletedUser}
                  onChange={(event) => {
                    setAreaSearch(event.target.value);
                    setAreaPage(1);
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={() => {
                    setAreaSearch(INITIAL_USER_AREA_FILTERS.areaSearch);
                    setAreaPage(INITIAL_USER_AREA_FILTERS.areaPage);
                    setAreaLimit(INITIAL_USER_AREA_FILTERS.areaLimit);
                  }}
                  disabled={isDeletedUser}
                >
                  Limpiar
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
                        Página {areasQuery.data?.page ?? areaPage} de{" "}
                        {areaTotalPages}
                      </span>
                    </>
                  }
                  currentPage={areasQuery.data?.page ?? areaPage}
                  totalPages={areaTotalPages}
                  onPrevious={() =>
                    setAreaPage((prev) => Math.max(prev - 1, 1))
                  }
                  onNext={() =>
                    setAreaPage((prev) => Math.min(prev + 1, areaTotalPages))
                  }
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
                      "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                      savedAreaCodeSet.has(area.code) &&
                      !pendingRemovals.includes(area.code)
                        ? "border-brand-border bg-brand-bg text-brand-textMuted"
                        : pendingAdditions.includes(area.code)
                          ? "border-brand-border bg-brand-accent/10 text-brand-text"
                          : pendingRemovals.includes(area.code)
                            ? "border-ember/30 bg-ember/10 text-brand-text"
                            : "border-transparent text-brand-textMuted",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAreas.includes(area.code)}
                      disabled={
                        isDeletedUser ||
                        (savedAreaCodeSet.has(area.code) &&
                          !pendingRemovals.includes(area.code))
                      }
                      onChange={() =>
                        setSelectedAreas((prev) =>
                          prev.includes(area.code)
                            ? prev.filter((item) => item !== area.code)
                            : [...prev, area.code],
                        )
                      }
                    />
                    <span className="font-semibold text-ink">{area.code}</span>
                    <span className="text-xs text-brand-textMuted">
                      {area.nombre}
                    </span>
                    {savedAreaCodeSet.has(area.code) &&
                    !pendingRemovals.includes(area.code) ? (
                      <>
                        <span className="text-xs text-brand-textMuted">
                          (área asignada)
                        </span>
                        <Button
                          variant="danger"
                          className="ml-auto rounded-md px-2 py-1 text-xs"
                          disabled={isDeletedUser}
                          onClick={() =>
                            setSelectedAreas((prev) =>
                              prev.filter((code) => code !== area.code),
                            )
                          }
                        >
                          Desasignar
                        </Button>
                      </>
                    ) : pendingAdditions.includes(area.code) ? (
                      <span className="ml-auto text-xs text-brand-accent">
                        (se asignará al guardar)
                      </span>
                    ) : pendingRemovals.includes(area.code) ? (
                      <>
                        <span className="ml-auto text-xs text-ember">
                          (se desasignará al guardar)
                        </span>
                        <Button
                          variant="outline"
                          className="rounded-md px-2 py-1 text-xs"
                          disabled={isDeletedUser}
                          onClick={() =>
                            setSelectedAreas((prev) =>
                              [...prev, area.code].sort((a, b) =>
                                a.localeCompare(b),
                              ),
                            )
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
                  disabled={!selectedUserId || !hasAreaChanges || isDeletedUser}
                >
                  Restablecer
                </Button>
                <Button
                  className="mt-4 w-full sm:w-auto"
                  onClick={saveAreas}
                  disabled={!selectedUserId || !hasAreaChanges || isDeletedUser}
                >
                  Guardar
                </Button>
              </ResponsiveActions>
            </SectionCard>
          </div>
        ) : null}
        {isSuperAdmin ? (
          <>
            <PageHeader
              title="Registros"
              subtitle="Bandeja de seguimiento para verificación, aprobación y atención de solicitudes."
            />
            <FilterCard gridClassName="grid gap-4 md:grid-cols-3">
              <Input
                label="Buscar"
                placeholder="Correo o nombre"
                value={registrationSearch}
                onChange={(event) => {
                  setRegistrationSearch(event.target.value);
                  setRegistrationPage(1);
                }}
              />
              <LegendSelect
                label="Estado"
                value={registrationStatus}
                options={REGISTRATION_STATUS_OPTIONS}
                onChange={(value) => {
                  setRegistrationStatus(value as RegistrationStatus | "ALL");
                  setRegistrationPage(1);
                }}
              />
              <Select
                label="Límite"
                value={String(registrationLimit)}
                onChange={(event) => {
                  setRegistrationLimit(Number(event.target.value));
                  setRegistrationPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </Select>
            </FilterCard>

            <SavedViewsToolbar
              views={views}
              onApply={(saved) => {
                setRegistrationStatus(saved.status);
                setRegistrationSearch(saved.search);
                setRegistrationPage(saved.page);
                setRegistrationLimit(saved.limit);
              }}
              onSave={(name) => {
                saveCurrentView(name, {
                  status: registrationStatus,
                  search: registrationSearch,
                  page: registrationPage,
                  limit: registrationLimit,
                });
                notify("Vista guardada", "success");
              }}
              onDelete={(id) => {
                deleteView(id, {
                  status: registrationStatus,
                  search: registrationSearch,
                  page: registrationPage,
                  limit: registrationLimit,
                });
                notify("Vista eliminada", "success");
              }}
            />

            <DataTableSection
              toolbar={{
                summary: (
                  <>
                    <span>
                      Mostrando {registrationsQuery.data?.items.length ?? 0} de{" "}
                      {registrationsTotal}
                    </span>
                    <span>
                      Página {registrationsQuery.data?.page ?? registrationPage}{" "}
                      de {registrationsTotalPages}
                    </span>
                  </>
                ),
                currentPage: registrationsQuery.data?.page ?? registrationPage,
                totalPages: registrationsTotalPages,
                onPrevious: () =>
                  setRegistrationPage((prev) => Math.max(prev - 1, 1)),
                onNext: () =>
                  setRegistrationPage((prev) =>
                    Math.min(prev + 1, registrationsTotalPages),
                  ),
                previousDisabled: registrationPage <= 1,
                nextDisabled: registrationPage >= registrationsTotalPages,
                actions: (
                  <ExportMenu
                    options={[
                      {
                        key: "csv",
                        label: "Exportar CSV filtrado",
                        onClick: async () => {
                          if (registrationsTotal === 0) return;
                          try {
                            const blob = await adminRegistrationsExportCsv({
                              status:
                                registrationStatus === "ALL"
                                  ? undefined
                                  : registrationStatus,
                              q:
                                debouncedRegistrationSearch.trim() || undefined,
                              maxRows: 10000,
                            });
                            downloadBlob(
                              blob,
                              `registros_filtrados_${new Date().toISOString().slice(0, 10)}.csv`,
                            );
                          } catch (error: any) {
                            notify(
                              getApiErrorMessage(
                                error,
                                "No se pudo exportar el listado",
                              ),
                              "error",
                            );
                          }
                        },
                        disabled: registrationsTotal === 0,
                      },
                      {
                        key: "json",
                        label: "Exportar JSON visible",
                        onClick: () => {
                          downloadJson(
                            (registrationsQuery.data?.items ?? []).map(
                              (item) => ({
                                id: item.id,
                                correo: item.email,
                                nombre: buildUserName(item),
                                telefono: item.telefono ?? null,
                                nacimiento: item.fechaNacimiento ?? null,
                                estado: translateStatus(item.status),
                                area: buildAreaLabel(item),
                                registrado: item.registeredAt ?? null,
                                verificado: item.verifiedAt ?? null,
                                envio: item.sendStatus ?? null,
                                intentosEnvio: item.sendAttempts ?? 0,
                                intentosVerificacion: item.verifyAttempts ?? 0,
                                ultimoError: item.lastError ?? null,
                              }),
                            ),
                            `registros_visibles_${new Date().toISOString().slice(0, 10)}.json`,
                          );
                        },
                        disabled:
                          (registrationsQuery.data?.items.length ?? 0) === 0,
                      },
                    ]}
                  />
                ),
              }}
              columns={registrationColumns}
              items={registrationsQuery.data?.items ?? []}
              getRowKey={(item) => item.id}
              onRowClick={(item) =>
                setSelectedUser(mapRegistrationToSelectedUser(item))
              }
              renderMobileCard={(item) => (
                <div className="flex flex-col gap-3">
                  <div className="font-semibold text-brand-text">
                    {item.email}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Estado:{" "}
                    <span className="inline-flex align-middle">
                      <StatusDot
                        status={item.status}
                        label={translateStatus(item.status)}
                      />
                    </span>
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Nombre: {buildUserName(item)}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Área: {buildAreaLabel(item)}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Teléfono: {item.telefono ?? "-"}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Nacimiento: {formatDate(item.fechaNacimiento)}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Registrado: {formatDate(item.registeredAt)}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Envíos: {translateStatus(item.sendStatus)} (
                    {item.sendAttempts ?? 0})
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Último envío: {formatDate(item.lastSentAt)}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Intentos: {item.verifyAttempts ?? 0}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Error: {item.lastError ?? "-"}
                  </div>
                  <div className="text-sm text-brand-textMuted">
                    Verificado: {formatDate(item.verifiedAt)}
                  </div>
                  <AdminActionList
                    actions={buildRegistrationActions(item, {
                      onApprove: (id) => approveMutation.mutate(id),
                      onDelete: (record) =>
                        setSuspendTarget({
                          id: record.id,
                          email: record.email,
                        }),
                      onDeletePermanent: (record) =>
                        setPermanentDeleteTarget({
                          id: record.id,
                          email: record.email,
                        }),
                      onReject: (record) =>
                        setRejectTarget({ id: record.id, email: record.email }),
                      onRestore: (id) => restoreRegistrationMutation.mutate(id),
                      onResend: (id) => resendMutation.mutate(id),
                      onForceVerify: (id) => forceVerifyMutation.mutate(id),
                    })}
                  />
                </div>
              )}
              tableProps={{
                ariaLabel: "Registros de usuarios pendientes y atendidos",
                maxDesktopHeightPx: 560,
                stickyHeader: true,
                virtualized: true,
                rowHeight: 76,
              }}
            />
          </>
        ) : null}
      </section>

      <TextFieldModal
        open={Boolean(rejectTarget)}
        title="Rechazar registro"
        label="Motivo (opcional)"
        value={rejectReason}
        onChange={setRejectReason}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        onConfirm={triggerReject}
        confirmLabel="Rechazar"
        confirmVariant="danger"
        confirmDisabled={rejectMutation.isPending}
      />

      <ConfirmActionModal
        open={Boolean(suspendTarget)}
        title="Suspender usuario"
        description={
          suspendTarget ? (
            <>
              La cuenta <strong>{suspendTarget.email}</strong> quedará
              suspendida y perderá acceso al sistema.
            </>
          ) : (
            ""
          )
        }
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (!suspendTarget) return;
          suspendMutation.mutate(suspendTarget.id);
          setSuspendTarget(null);
        }}
        confirmLabel="Suspender"
        confirmVariant="outline"
        confirmDisabled={suspendMutation.isPending}
      />

      <ConfirmActionModal
        open={Boolean(restoreDeletedTarget)}
        title="Restaurar usuario"
        description={
          restoreDeletedTarget ? (
            <>
              La cuenta <strong>{restoreDeletedTarget.email}</strong> volverá a
              estado <strong>Aprobado</strong> con permisos por defecto.
            </>
          ) : (
            ""
          )
        }
        onClose={() => setRestoreDeletedTarget(null)}
        onConfirm={restoreDeletedUser}
        confirmLabel="Restaurar"
        confirmVariant="secondary"
        confirmDisabled={isRestoringDeletedUser}
      />

      <ConfirmActionModal
        open={Boolean(permanentDeleteTarget)}
        title="Eliminar definitivamente"
        description={
          permanentDeleteTarget ? (
            <>
              Se eliminará definitivamente la cuenta{" "}
              <strong>{permanentDeleteTarget.email}</strong>. Esta acción no se
              puede deshacer.
            </>
          ) : (
            ""
          )
        }
        onClose={() => setPermanentDeleteTarget(null)}
        onConfirm={permanentlyDeleteSelectedUser}
        confirmLabel="Eliminar definitivamente"
        confirmVariant="danger"
        confirmDisabled={
          isPermanentlyDeletingUser || deletePermanentMutation.isPending
        }
      />
    </PageContainer>
  );
}
