import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../types/auth";
import { renderWithProviders } from "../../test/test-utils";
import { queryClient } from "../../app/queryClient";
import CategoriesPage from "./CategoriesPage";

// Centraliza dependencias externas para controlar cada escenario de admin.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    adminCategoriesList: vi.fn(),
    categoriesCreate: vi.fn(),
    categoriesUpdate: vi.fn(),
    categoriesDelete: vi.fn(),
    categoriesHardDelete: vi.fn(),
  },
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    token: null,
    isAdmin: mocks.auth.isAdmin,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("../../components/ToastProvider", () => ({
  useToast: () => ({
    notify: mocks.notify,
  }),
}));

vi.mock("../../api/endpoints/categories", () => mocks.api);

describe("CategoriesPage", () => {
  beforeEach(() => {
    // Reinicia estado compartido para evitar efectos entre pruebas.
    queryClient.clear();
    window.localStorage.clear();
    mocks.notify.mockReset();
    mocks.api.adminCategoriesList.mockReset();
    mocks.api.categoriesCreate.mockReset();
    mocks.api.categoriesUpdate.mockReset();
    mocks.api.categoriesDelete.mockReset();
    mocks.api.categoriesHardDelete.mockReset();

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: "admin@local.com",
      role: "admin",
      isSuperAdmin: true,
    };

    mocks.api.adminCategoriesList.mockResolvedValue({
      items: [
        { id: 1, nombre: "Calidad", activo: true },
        { id: 2, nombre: "Producción", activo: true },
      ],
      total: 2,
      page: 1,
      limit: 12,
    });
    mocks.api.categoriesCreate.mockResolvedValue({ id: 3, nombre: "Nueva" });
    mocks.api.categoriesUpdate.mockResolvedValue({
      id: 1,
      nombre: "Calidad SIG",
      activo: true,
    });
    mocks.api.categoriesDelete.mockResolvedValue({ success: true });
    mocks.api.categoriesHardDelete.mockResolvedValue({ success: true });
  });

  it("muestra acceso denegado si el usuario no es admin", () => {
    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 8,
      email: "user@bsm.com.mx",
      role: "user",
    };

    renderWithProviders(<CategoriesPage />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("crea una categoría nueva", async () => {
    renderWithProviders(<CategoriesPage />);

    // Verifica el flujo principal de alta con refresco de la tabla.
    await waitFor(() =>
      expect(mocks.api.adminCategoriesList).toHaveBeenCalled(),
    );
    expect((await screen.findAllByText("Calidad")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Nueva categoría"), {
      target: { value: "Nueva" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      expect(mocks.api.categoriesCreate).toHaveBeenCalledWith("Nueva");
      expect(mocks.notify).toHaveBeenCalledWith("Categoría creada", "success");
    });
  });

  it("edita, desactiva y elimina categorías existentes", async () => {
    renderWithProviders(<CategoriesPage />);

    await waitFor(() =>
      expect(mocks.api.adminCategoriesList).toHaveBeenCalled(),
    );
    expect((await screen.findAllByText("Calidad")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const editDialog = screen.getByRole("dialog", { name: "Editar categoría" });
    fireEvent.change(within(editDialog).getByLabelText("Nombre"), {
      target: { value: "Calidad SIG" },
    });
    fireEvent.click(
      within(editDialog).getByRole("button", { name: "Guardar" }),
    );

    await waitFor(() => {
      expect(mocks.api.categoriesUpdate).toHaveBeenCalledWith(1, {
        nombre: "Calidad SIG",
      });
      expect(mocks.notify).toHaveBeenCalledWith(
        "Categoría actualizada",
        "success",
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]);
    const deleteDialog = screen.getByRole("dialog", {
      name: "Desactivar categoría",
    });
    fireEvent.click(
      within(deleteDialog).getByRole("button", { name: "Desactivar" }),
    );

    await waitFor(() => {
      expect(mocks.api.categoriesDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith(
        "Categoría desactivada",
        "success",
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    const hardDeleteDialog = screen.getByRole("dialog", {
      name: "Eliminar categoría",
    });
    expect(hardDeleteDialog).toHaveTextContent(
      "Se eliminará definitivamente la categoría Calidad. Los documentos que la usen quedarán sin categoría asignada.",
    );
    fireEvent.click(
      within(hardDeleteDialog).getByRole("button", { name: "Eliminar" }),
    );

    await waitFor(() => {
      expect(mocks.api.categoriesHardDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith(
        "Categoría eliminada",
        "success",
      );
    });
  });

  it("recupera filtros guardados por usuario", async () => {
    window.localStorage.setItem(
      "admin-categories-filters:admin@local.com",
      JSON.stringify({
        lastUsed: {
          search: "Producción",
          statusFilter: "inactive",
          page: 2,
          limit: 24,
        },
        views: [],
      }),
    );

    renderWithProviders(<CategoriesPage />);

    await waitFor(() => {
      expect(mocks.api.adminCategoriesList).toHaveBeenCalledWith({
        q: "Producción",
        includeInactive: false,
        status: "inactive",
        page: 2,
        limit: 24,
      });
    });

    expect(screen.getByDisplayValue("Producción")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado")).toHaveValue("inactive");
    expect(screen.getByLabelText("Límite")).toHaveValue("24");
  });
});
