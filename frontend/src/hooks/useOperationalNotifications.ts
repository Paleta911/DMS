import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminRegistrationsList } from "../api/endpoints/adminRegistrations";
import {
  adminPermissionRequestsList,
  permissionRequestsMine,
} from "../api/endpoints/permissionRequests";
import { usersMe } from "../api/endpoints/users";
import type { AuthUser } from "../types/auth";
import { queryKeys } from "../app/queryKeys";

// Hook that aggregates actionable notifications from multiple operational sources.
// Combines user tasks, registration backlog, and permission-request queues.
export type OperationalNotification = {
  id: string;
  signature: string;
  title: string;
  description: string;
  href: string;
  tone: "info" | "success" | "warning";
  createdAt: string;
};

function storageKey(email?: string | null) {
  // Per-user key prevents notification read-state leakage across accounts.
  return email
    ? `operational-notifications:${email}`
    : "operational-notifications";
}

function loadSeen(email?: string | null) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) {
      return new Set<string>();
    }
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

function persistSeen(
  email: string | null | undefined,
  signatures: Set<string>,
) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    storageKey(email),
    JSON.stringify([...signatures]),
  );
}

function createNotification(
  signature: string,
  title: string,
  description: string,
  href: string,
  tone: OperationalNotification["tone"],
  createdAt: string,
): OperationalNotification {
  return {
    id: signature,
    signature,
    title,
    description,
    href,
    tone,
    createdAt,
  };
}

function formatRequestType(type?: string) {
  return type === "AREAS" ? "áreas" : "permisos";
}

export function useOperationalNotifications(
  user: AuthUser | null,
  isAdmin: boolean,
) {
  const [seen, setSeen] = useState<Set<string>>(() =>
    loadSeen(user?.email ?? null),
  );

  useEffect(() => {
    setSeen(loadSeen(user?.email ?? null));
  }, [user?.email]);

  const refetchInterval = () =>
    // Poll only while tab is visible to reduce unnecessary background traffic.
    typeof document !== "undefined" && document.visibilityState === "visible"
      ? 60000
      : false;

  const meQuery = useQuery({
    queryKey: queryKeys.users.me,
    queryFn: usersMe,
    enabled: Boolean(user),
    staleTime: 30000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

  const myRequestsQuery = useQuery({
    queryKey: queryKeys.permissions.mine({
      page: 1,
      limit: 5,
      scope: "notifications",
    }),
    queryFn: () => permissionRequestsMine({ page: 1, limit: 5 }),
    enabled: Boolean(user) && !user?.isSuperAdmin,
    staleTime: 30000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

  const registrationsQuery = useQuery({
    queryKey: queryKeys.registrations.list({
      status: "PENDING_APPROVAL",
      page: 1,
      limit: 5,
      scope: "notifications",
    }),
    queryFn: () =>
      adminRegistrationsList({
        status: "PENDING_APPROVAL",
        page: 1,
        limit: 5,
      }),
    enabled: Boolean(user?.isSuperAdmin),
    staleTime: 30000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

  const customAreaRegistrationsQuery = useQuery({
    queryKey: queryKeys.registrations.list({
      page: 1,
      limit: 25,
      scope: "notifications-custom-area",
    }),
    queryFn: () =>
      adminRegistrationsList({
        page: 1,
        limit: 25,
      }),
    enabled: Boolean(user?.isSuperAdmin),
    staleTime: 30000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

  const adminRequestsQuery = useQuery({
    queryKey: queryKeys.permissions.adminList({
      status: "PENDING",
      page: 1,
      limit: 5,
      scope: "notifications",
    }),
    queryFn: () =>
      adminPermissionRequestsList({
        status: "PENDING",
        page: 1,
        limit: 5,
      }),
    enabled: isAdmin,
    staleTime: 30000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

  const notifications = useMemo(() => {
    // Build deterministic signatures so read/unread state survives reloads.
    const results: OperationalNotification[] = [];
    const now = new Date().toISOString();
    const me = meQuery.data;

    if ((me?.tasks?.pendingReview ?? 0) > 0) {
      const count = me?.tasks?.pendingReview ?? 0;
      results.push(
        createNotification(
          `tasks:review:${count}`,
          "Tienes documentos por revisar",
          `${count} documento(s) requieren tu revisión.`,
          "/documents",
          "warning",
          now,
        ),
      );
    }

    if ((me?.tasks?.pendingApprove ?? 0) > 0) {
      const count = me?.tasks?.pendingApprove ?? 0;
      results.push(
        createNotification(
          `tasks:approve:${count}`,
          "Tienes documentos por aprobar",
          `${count} documento(s) esperan tu aprobación final.`,
          "/documents",
          "warning",
          now,
        ),
      );
    }

    // Convert processed personal requests into success/warning notifications.
    for (const item of myRequestsQuery.data?.items ?? []) {
      if (item.status === "PENDING") {
        continue;
      }
      const stamp = item.reviewedAt ?? item.updatedAt ?? item.createdAt ?? now;
      results.push(
        createNotification(
          `my-request:${item.id}:${item.status}:${stamp}`,
          item.status === "APPROVED"
            ? "Tu solicitud fue aprobada"
            : "Tu solicitud fue rechazada",
          `La solicitud de ${formatRequestType(item.requestType)} #${item.id} ya fue atendida.`,
          "/permissions/request",
          item.status === "APPROVED" ? "success" : "warning",
          stamp,
        ),
      );
    }

    if ((registrationsQuery.data?.total ?? 0) > 0) {
      const total = registrationsQuery.data?.total ?? 0;
      results.push(
        createNotification(
          `admin-registrations:${total}`,
          "Hay registros pendientes de aprobación",
          `${total} registro(s) esperan validación de super admin.`,
          "/admin/users",
          "info",
          now,
        ),
      );
    }

    // Highlight registrations that requested a custom (non-catalog) area.
    for (const item of customAreaRegistrationsQuery.data?.items ?? []) {
      if (!item.requestedAreaNombre || item.status === "REJECTED") {
        continue;
      }
      results.push(
        createNotification(
          `admin-registration-custom-area:${item.id}:${item.requestedAreaNombre}`,
          "Usuario solicitó un área no listada",
          `${item.email} indicó el área "${item.requestedAreaNombre}".`,
          "/admin/users",
          "info",
          item.registeredAt ?? now,
        ),
      );
    }

    if ((adminRequestsQuery.data?.total ?? 0) > 0) {
      const total = adminRequestsQuery.data?.total ?? 0;
      results.push(
        createNotification(
          `admin-permission-requests:${total}`,
          "Hay solicitudes pendientes",
          `${total} solicitud(es) de permisos o áreas siguen pendientes.`,
          "/admin/permission-requests",
          "info",
          now,
        ),
      );
    }

    return results.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }, [
    adminRequestsQuery.data?.total,
    customAreaRegistrationsQuery.data?.items,
    meQuery.data,
    myRequestsQuery.data?.items,
    registrationsQuery.data?.total,
  ]);

  const unreadCount = notifications.filter(
    (notification) => !seen.has(notification.signature),
  ).length;

  const markAsRead = (signature: string) => {
    setSeen((current) => {
      const next = new Set(current);
      next.add(signature);
      persistSeen(user?.email ?? null, next);
      return next;
    });
  };

  const markAllAsRead = () => {
    const next = new Set([
      ...seen,
      ...notifications.map((item) => item.signature),
    ]);
    persistSeen(user?.email ?? null, next);
    setSeen(next);
  };

  return {
    notifications,
    unreadCount,
    isLoading:
      meQuery.isLoading ||
      myRequestsQuery.isLoading ||
      registrationsQuery.isLoading ||
      customAreaRegistrationsQuery.isLoading ||
      adminRequestsQuery.isLoading,
    isUnread: (signature: string) => !seen.has(signature),
    markAsRead,
    markAllAsRead,
  };
}
