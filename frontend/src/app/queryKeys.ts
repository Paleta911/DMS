// Canonical react-query keys used across modules to keep cache invalidation consistent.
export const queryKeys = {
  health: ["health"] as const,
  // Catalogos maestros usados por selects y formularios.
  catalogs: {
    categories: ["categories"] as const,
    documentTypes: ["document-types"] as const,
    areaCodes: ["area-codes"] as const,
    areaCodesList: (params: unknown) => ["area-codes", params] as const,
  },
  documents: {
    all: ["documents"] as const,
    // list y searchList separan cache de tabla general vs busqueda avanzada.
    list: (params: unknown) => ["documents", params] as const,
    visibility: ["documents-visibility"] as const,
    search: ["documents-search"] as const,
    searchList: (filters: unknown, page: number, limit: number) =>
      ["documents-search", filters, page, limit] as const,
    detail: (documentId: number) => ["document", documentId] as const,
    workflow: (documentId: number) => ["workflow", documentId] as const,
    versions: (documentId: number) => ["versions", documentId] as const,
  },
  search: {
    all: ["search"] as const,
    list: (filters: unknown) => ["search", filters] as const,
  },
  users: {
    me: ["me"] as const,
    all: ["user"] as const,
    detail: (userId: number | null | undefined) => ["user", userId] as const,
    search: ["users-search"] as const,
    searchList: (params: unknown) => ["users-search", params] as const,
  },
  permissions: {
    mineAll: ["permission-requests", "mine"] as const,
    mine: (params: unknown) => ["permission-requests", "mine", params] as const,
    adminAll: ["admin-permission-requests"] as const,
    adminList: (params: unknown) =>
      ["admin-permission-requests", params] as const,
    adminDetail: (requestId: number | string) =>
      ["admin-permission-request", requestId] as const,
  },
  registrations: {
    all: ["admin-registrations"] as const,
    list: (params: unknown) => ["admin-registrations", params] as const,
  },
  analytics: {
    summary: ["admin-analytics", "summary"] as const,
  },
  // Namespace admin para evitar colision con llaves de catalogos de usuario final.
  adminCatalogs: {
    categories: (params: unknown) => ["admin-categories", params] as const,
    documentTypes: (params: unknown) =>
      ["admin-document-types", params] as const,
    areaCodes: (params: unknown) => ["admin-area-codes", params] as const,
  },
  audit: {
    all: ["audit"] as const,
    list: (filters: unknown) => ["audit", filters] as const,
  },
} as const;
