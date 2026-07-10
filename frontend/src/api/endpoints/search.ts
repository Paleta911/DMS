// Document search API: unified search with engine selection (elastic/fallback); reindex and diagnostics
import { http } from "../http";
import type { SearchResponse } from "../../types/search";

// Search documents by query and filters; backend auto-selects elastic vs fallback engine based on health
export async function searchQuery(params: {
  q?: string;
  categoryId?: string;
  documentTypeCode?: string;
  areaCode?: string;
  status?: "DRAFT" | "IN_REVIEW" | "APPROVED" | "OBSOLETE";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get<SearchResponse>("/search", { params });
  return data;
}

// Trigger full reindex of search engine (admin only, expensive operation)
export async function searchReindex() {
  const { data } = await http.post("/search/reindex");
  return data;
}

// Get search engine health: active engine mode, document count, last reindex time
export async function searchIndexStatus() {
  const { data } = await http.get("/search/status");
  return data as {
    engine: "elastic" | "fallback";
    indexName: string;
    docsCount: number | null;
    lastReindexAt?: string | null;
  };
}
