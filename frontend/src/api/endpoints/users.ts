// Users API endpoints: profile management, area assignment, search for autocomplete/assignment pickers
import { http } from "../http";
import type { UserProfile, UserSearchItem } from "../../types/users";

export type UserSearchFilters = {
  status?: string;
  role?: string;
  areaState?: string;
};

// Profile update payload: name, contact info, password change, area request
export type UpdateMePayload = {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  areaCode?: string;
  requestedAreaNombre?: string | null;
  currentPassword?: string;
  password?: string;
  confirmPassword?: string;
};

// Get user by ID
export async function usersGet(id: number) {
  const { data } = await http.get<UserProfile>(`/users/${id}`);
  return data;
}

// Get current authenticated user's profile
export async function usersMe() {
  const { data } = await http.get<UserProfile>("/users/me");
  return data;
}

// Update current user profile (name, password, area request)
export async function usersUpdateMe(payload: UpdateMePayload) {
  const { data } = await http.patch<UserProfile>("/users/me", payload);
  return data;
}

// Assign areas to user (admin only)
export async function usersSetAreas(id: number, areaCodes: string[]) {
  const { data } = await http.patch(`/users/${id}/areas`, { areaCodes });
  return data as UserProfile;
}

// Restore soft-deleted user account
export async function usersRestoreDeleted(id: number) {
  const { data } = await http.post(`/users/${id}/restore`);
  return data as UserProfile;
}

// Permanently delete user account (admin only)
export async function usersDeletePermanent(id: number) {
  const { data } = await http.delete(`/users/${id}/permanent`);
  return data as { success: true };
}

export async function usersSearch(
  query: string,
  limit?: number,
  recent = false,
  filters?: UserSearchFilters,
) {
  // Shared search endpoint powers assignment/autocomplete pickers.
  const { data } = await http.get<UserSearchItem[]>("/users/search", {
    params: { q: query, limit, recent, ...filters },
  });
  return data;
}
