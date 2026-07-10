import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

// Centralized cache invalidation helpers to keep mutation side effects consistent across screens.
export function invalidateCatalogQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.catalogs.categories }),
    client.invalidateQueries({ queryKey: queryKeys.catalogs.documentTypes }),
    client.invalidateQueries({ queryKey: queryKeys.catalogs.areaCodes }),
  ]);
}

export function invalidateDocumentListQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.documents.all }),
    client.invalidateQueries({ queryKey: queryKeys.documents.search }),
  ]);
}

export function invalidateDocumentScopeQueries(
  client: QueryClient,
  documentId: number,
) {
  // Invalidate both detail scope and parent lists/search where the same document may appear.
  return Promise.all([
    client.invalidateQueries({
      queryKey: queryKeys.documents.detail(documentId),
    }),
    client.invalidateQueries({
      queryKey: queryKeys.documents.workflow(documentId),
    }),
    client.invalidateQueries({
      queryKey: queryKeys.documents.versions(documentId),
    }),
    ...[
      client.invalidateQueries({ queryKey: queryKeys.documents.all }),
      client.invalidateQueries({ queryKey: queryKeys.documents.search }),
    ],
  ]);
}

export function invalidateWorkflowQueries(
  client: QueryClient,
  documentId: number,
) {
  return Promise.all([
    client.invalidateQueries({
      queryKey: queryKeys.documents.workflow(documentId),
    }),
    client.invalidateQueries({ queryKey: queryKeys.documents.all }),
    client.invalidateQueries({ queryKey: queryKeys.documents.search }),
  ]);
}

export function invalidateAdminPermissionRequests(
  client: QueryClient,
  requestId?: number | string,
) {
  // Optionally invalidate detail cache when a specific request has been mutated.
  const tasks: Promise<unknown>[] = [
    client.invalidateQueries({ queryKey: queryKeys.permissions.adminAll }),
  ];
  if (requestId !== undefined) {
    tasks.push(
      client.invalidateQueries({
        queryKey: queryKeys.permissions.adminDetail(requestId),
      }),
    );
  }
  return Promise.all(tasks);
}

export function invalidateMyPermissionRequests(client: QueryClient) {
  return client.invalidateQueries({ queryKey: queryKeys.permissions.mineAll });
}

export function invalidateAdminRegistrations(client: QueryClient) {
  return client.invalidateQueries({ queryKey: queryKeys.registrations.all });
}

export function invalidateUserDetail(
  client: QueryClient,
  userId: number | null | undefined,
) {
  return client.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
}
