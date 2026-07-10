import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { searchQuery } from "../api/endpoints/search";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ToastProvider";
import { AccessDenied } from "../components/AccessDenied";
import { EmptyState } from "../components/EmptyState";
import { Pill } from "../components/ui/Badge";
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from "../components/ui/ResponsiveTable";
import { PageContainer } from "../components/layout/PageContainer";
import { PageHeader } from "../components/layout/PageHeader";
import { ResultsToolbar } from "../components/layout/ResultsToolbar";
import { SectionCard } from "../components/layout/SectionCard";
import { ResponsiveActions } from "../components/layout/ResponsiveActions";
import { NoticeBanner } from "../components/ui/NoticeBanner";
import type { SearchItem } from "../types/search";
import { getSearchRelevance, translateSearchEngine } from "../utils/labels";
import { queryKeys } from "../app/queryKeys";
import { useCatalogQueries } from "../hooks/useCatalogQueries";

// Advanced search page combining free-text query and catalog filters with paginated results.
type SearchFilters = {
  q: string;
  categoryId: string;
  documentTypeCode: string;
  areaCode: string;
  page: number;
  limit: number;
};

const INITIAL_FILTERS: SearchFilters = {
  q: "",
  categoryId: "",
  documentTypeCode: "",
  areaCode: "",
  page: 1,
  limit: 20,
};

export default function SearchPage() {
  const { notify } = useToast();
  const [draftFilters, setDraftFilters] =
    useState<SearchFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<SearchFilters>(INITIAL_FILTERS);

  const { categoriesQuery, typesQuery, areasQuery } = useCatalogQueries();
  const hasAppliedFilters = Boolean(
    appliedFilters.q.trim() ||
    appliedFilters.categoryId ||
    appliedFilters.documentTypeCode ||
    appliedFilters.areaCode,
  );

  const searchQueryResult = useQuery({
    queryKey: queryKeys.search.list(appliedFilters),
    queryFn: () =>
      searchQuery({
        q: appliedFilters.q || undefined,
        categoryId: appliedFilters.categoryId || undefined,
        documentTypeCode: appliedFilters.documentTypeCode || undefined,
        areaCode: appliedFilters.areaCode || undefined,
        page: appliedFilters.page,
        limit: appliedFilters.limit,
      }),
    // Query only runs once user applies at least one filter or text term.
    enabled: hasAppliedFilters,
    placeholderData: (previousData) => previousData,
  });

  const total =
    typeof searchQueryResult.data?.total === "number"
      ? searchQueryResult.data.total
      : (searchQueryResult.data?.total?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / appliedFilters.limit));

  const maxScoreInPage = useMemo(() => {
    const scores = (searchQueryResult.data?.items ?? [])
      .map((item) => item.score)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    return scores.length > 0 ? Math.max(...scores) : null;
  }, [searchQueryResult.data?.items]);

  const columns: ResponsiveColumn<SearchItem>[] = [
    {
      header: "Código",
      cell: (item) => (
        <span className="block max-w-[140px] truncate text-xs font-semibold">
          {item.codigo ?? "-"}
        </span>
      ),
    },
    {
      header: "Documento",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="max-w-[220px] truncate font-semibold text-ink">
            {item.nombre}
          </span>
          <span className="text-xs text-brand-textMuted">
            {item.latestComentario ?? "Sin comentario"}
          </span>
        </div>
      ),
    },
    { header: "Tipo", cell: (item) => item.documentTypeCode ?? "-" },
    { header: "Área", cell: (item) => item.areaCode ?? "-" },
    { header: "Categoría", cell: (item) => item.categoryNombre ?? "-" },
    {
      header: "Coincidencia",
      cell: (item) => {
        const relevance = getSearchRelevance(item.score, maxScoreInPage);
        if (relevance.value === null) return "-";
        return <Pill tone={relevance.tone}>{relevance.label}</Pill>;
      },
    },
    {
      header: "",
      cell: (item) => (
        <Link to={`/documents/${item.documentId}`}>
          <Button variant="outline">Ver</Button>
        </Link>
      ),
    },
  ];

  const handleSearch = () => {
    // Prevent empty searches to avoid noisy full-table scans and unclear UX.
    if (
      !draftFilters.q &&
      !draftFilters.categoryId &&
      !draftFilters.documentTypeCode &&
      !draftFilters.areaCode
    ) {
      notify("Ingresa al menos un filtro o texto", "info");
      return;
    }
    setAppliedFilters((prev) => ({
      ...prev,
      ...draftFilters,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  if ((searchQueryResult.error as any)?.response?.status === 403) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <section className="flex flex-col gap-6">
        <PageHeader
          title="Buscar"
          subtitle="Consulta avanzada con filtros por categoría, tipo y área."
        />

        <SectionCard>
          <NoticeBanner title="Consulta avanzada">
            Usa esta pantalla cuando necesites buscar por contenido o combinar
            varios filtros a la vez.
          </NoticeBanner>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Consulta"
              placeholder="Código, nombre, comentario"
              value={draftFilters.q}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, q: event.target.value }))
              }
            />
            <Select
              label="Categoría"
              value={draftFilters.categoryId}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">Todas</option>
              {categoriesQuery.data?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </Select>
            <Select
              label="Tipo"
              value={draftFilters.documentTypeCode}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  documentTypeCode: event.target.value,
                }))
              }
            >
              <option value="">Todos</option>
              {typesQuery.data?.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.code}
                </option>
              ))}
            </Select>
            <Select
              label="Área"
              value={draftFilters.areaCode}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  areaCode: event.target.value,
                }))
              }
            >
              <option value="">Todas</option>
              {areasQuery.data?.map((area) => (
                <option key={area.id} value={area.code}>
                  {area.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-4">
            <ResponsiveActions>
              <Button variant="secondary" onClick={handleSearch}>
                Buscar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </ResponsiveActions>
          </div>
        </SectionCard>

        {!hasAppliedFilters ? (
          <NoticeBanner title="Configura una búsqueda">
            Ingresa texto, selecciona filtros o combina ambos y después pulsa
            Buscar.
          </NoticeBanner>
        ) : searchQueryResult.isLoading ? (
          <NoticeBanner title="Buscando">
            <span className="inline-flex items-center gap-2">
              <Spinner /> Procesando la consulta y calculando coincidencias.
            </span>
          </NoticeBanner>
        ) : searchQueryResult.isError ? (
          <NoticeBanner
            variant="error"
            title="No se pudo completar la búsqueda"
          >
            Ajusta los filtros o vuelve a intentar en unos segundos.
          </NoticeBanner>
        ) : total === 0 ? (
          <EmptyState
            title="Sin resultados"
            subtitle="Prueba con otro filtro o texto."
          />
        ) : (
          <SectionCard>
            <ResultsToolbar
              summary={
                <>
                  <span>
                    Mostrando {searchQueryResult.data?.items?.length ?? 0} de{" "}
                    {total}
                  </span>
                  <span>
                    Página {appliedFilters.page} de {totalPages}
                  </span>
                  <span>Motor:</span>
                  <Pill
                    tone={
                      searchQueryResult.data?.engine === "elastic"
                        ? "APPROVED"
                        : "IN_REVIEW"
                    }
                  >
                    {translateSearchEngine(searchQueryResult.data?.engine)}
                  </Pill>
                </>
              }
              currentPage={appliedFilters.page}
              totalPages={totalPages}
              onPrevious={() =>
                setAppliedFilters((prev) => ({
                  ...prev,
                  page: Math.max(prev.page - 1, 1),
                }))
              }
              onNext={() =>
                setAppliedFilters((prev) => ({
                  ...prev,
                  page: Math.min(prev.page + 1, totalPages),
                }))
              }
              previousDisabled={appliedFilters.page <= 1}
              nextDisabled={appliedFilters.page >= totalPages}
            />
            <div className="mt-4">
              <ResponsiveTable
                columns={columns}
                items={searchQueryResult.data?.items ?? []}
                getRowKey={(item) => item.documentId}
                ariaLabel="Resultados de búsqueda"
                caption="Resultados de búsqueda documental"
                renderMobileCard={(item) => (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                          {item.codigo ?? "Sin código"}
                        </div>
                        <div className="truncate font-semibold text-ink">
                          {item.nombre}
                        </div>
                        <div className="truncate text-xs text-brand-textMuted">
                          {item.latestComentario ?? "Sin comentario"}
                        </div>
                      </div>
                      <Pill
                        tone={
                          searchQueryResult.data?.engine === "elastic"
                            ? "APPROVED"
                            : "IN_REVIEW"
                        }
                      >
                        {(() => {
                          const relevance = getSearchRelevance(
                            item.score,
                            maxScoreInPage,
                          );
                          return relevance.value === null
                            ? "-"
                            : relevance.label;
                        })()}
                      </Pill>
                    </div>
                    <div className="grid gap-2 text-xs text-brand-textMuted sm:grid-cols-2">
                      <div>
                        <span className="text-brand-textMuted">Tipo:</span>{" "}
                        {item.documentTypeCode ?? "-"}
                      </div>
                      <div>
                        <span className="text-brand-textMuted">Área:</span>{" "}
                        {item.areaCode ?? "-"}
                      </div>
                      <div>
                        <span className="text-brand-textMuted">Categoría:</span>{" "}
                        {item.categoryNombre ?? "-"}
                      </div>
                    </div>
                    <ResponsiveActions>
                      <Link
                        to={`/documents/${item.documentId}`}
                        className="w-full sm:w-auto"
                      >
                        <Button variant="outline" className="w-full sm:w-auto">
                          Ver
                        </Button>
                      </Link>
                    </ResponsiveActions>
                  </div>
                )}
              />
            </div>
          </SectionCard>
        )}
      </section>
    </PageContainer>
  );
}
