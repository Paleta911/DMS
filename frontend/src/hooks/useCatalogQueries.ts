import { useQuery } from '@tanstack/react-query';
import { categoriesList } from '../api/endpoints/categories';
import { areaCodesList, documentTypesList, publicAreaCodesList } from '../api/endpoints/types';
import { queryKeys } from '../app/queryKeys';

const catalogQueryOptions = {
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
  placeholderData: <T,>(previousData: T | undefined) => previousData,
} as const;

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.catalogs.categories,
    queryFn: categoriesList,
    ...catalogQueryOptions,
  });
}

export function useDocumentTypesQuery() {
  return useQuery({
    queryKey: queryKeys.catalogs.documentTypes,
    queryFn: documentTypesList,
    ...catalogQueryOptions,
  });
}

export function useAreaCodesQuery() {
  return useQuery({
    queryKey: queryKeys.catalogs.areaCodes,
    queryFn: areaCodesList,
    ...catalogQueryOptions,
  });
}

export function usePublicAreaCodesQuery() {
  return useQuery({
    queryKey: [...queryKeys.catalogs.areaCodes, 'public'],
    queryFn: publicAreaCodesList,
    ...catalogQueryOptions,
  });
}

export function useCatalogQueries() {
  return {
    categoriesQuery: useCategoriesQuery(),
    typesQuery: useDocumentTypesQuery(),
    areasQuery: useAreaCodesQuery(),
  };
}
