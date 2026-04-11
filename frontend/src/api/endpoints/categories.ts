import { http } from '../http';
import type { Category } from '../../types/documents';

export async function categoriesList() {
  const { data } = await http.get<Category[]>('/categories');
  return data;
}

export async function categoriesCreate(nombre: string) {
  const { data } = await http.post<Category>('/categories', { nombre });
  return data;
}

export async function categoriesUpdate(
  id: number,
  payload: { nombre?: string; activo?: boolean },
) {
  const { data } = await http.patch<Category>(`/categories/${id}`, {
    nombre: payload.nombre,
    activo: payload.activo,
  });
  return data;
}

export async function categoriesDelete(id: number) {
  const { data } = await http.delete(`/categories/${id}`);
  return data;
}

export async function categoriesHardDelete(id: number) {
  const { data } = await http.delete(`/categories/${id}/permanent`);
  return data;
}

export async function adminCategoriesList(params?: {
  q?: string;
  includeInactive?: boolean;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
}) {
  const { data } = await http.get('/categories', { params });
  return data as { items: Category[]; total: number; page: number; limit: number };
}
