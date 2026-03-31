import { http } from '../http';
import type { UserProfile, UserSearchItem } from '../../types/users';

export async function usersGet(id: number) {
  const { data } = await http.get<UserProfile>(`/users/${id}`);
  return data;
}

export async function usersMe() {
  const { data } = await http.get<UserProfile>('/users/me');
  return data;
}

export async function usersSetAreas(id: number, areaCodes: string[]) {
  const { data } = await http.patch(`/users/${id}/areas`, { areaCodes });
  return data as UserProfile;
}

export async function usersSearch(query: string, limit = 10) {
  const { data } = await http.get<UserSearchItem[]>('/users/search', {
    params: { q: query, limit },
  });
  return data;
}
