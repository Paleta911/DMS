import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../types/auth";
import { renderWithProviders } from "../../test/test-utils";
import { queryClient } from "../../app/queryClient";
import TypesAreasPage from "./TypesAreasPage";

// Agrupa mocks de catálogos para validar flujos CRUD de ambos tabs.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    adminDocumentTypesList: vi.fn(),
    documentTypesCreate: vi.fn(),
    documentTypesUpdate: vi.fn(),
    documentTypesDelete: vi.fn(),
    documentTypesHardDelete: vi.fn(),
    adminAreaCodesList: vi.fn(),
    areaCodesCreate: vi.fn(),
    areaCodesUpdate: vi.fn(),
    areaCodesDelete: vi.fn(),
    areaCodesHardDelete: vi.fn(),
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

vi.mock("../../api/endpoints/types", () => mocks.api);

describe("TypesAreasPage", () => {
  beforeEach(() => {
    // Reinicia cache y estado global para mantener determinismo.
    queryClient.clear();
    window.localStorage.clear();
    mocks.notify.mockReset();
    Object.values(mocks.api).forEach((fn) => fn.mockReset());

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: "admin@local.com",
      role: "admin",
      isSuperAdmin: true,
    };

    mocks.api.adminDocumentTypesList.mockResolvedValue({
      items: [
        { id: 1, code: "PRO", nombreLargo: "Procedimiento", activo: true },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
    mocks.api.adminAreaCodesList.mockResolvedValue({
      items: [{ id: 1, code: "RC", nombre: "Recursos Humanos", activo: true }],
      total: 1,
      page: 1,
      limit: 10,
    });
    mocks.api.documentTypesCreate.mockResolvedValue({
      id: 2,
      code: "INS",
      nombreLargo: "Instructivo",
    });
    mocks.api.documentTypesUpdate.mockResolvedValue({
      id: 1,
      code: "PRO",
      nombreLargo: "Procedimiento SIG",
      activo: true,
    });
    mocks.api.documentTypesDelete.mockResolvedValue({ success: true });
    mocks.api.documentTypesHardDelete.mockResolvedValue({ success: true });
    mocks.api.areaCodesCreate.mockResolvedValue({
      id: 2,
      code: "FA",
      nombre: "Finanzas",
    });
    mocks.api.areaCodesUpdate.mockResolvedValue({
      id: 1,
      code: "RC",
      nombre: "Recursos y Calidad",
      activo: true,
    });
    mocks.api.areaCodesDelete.mockResolvedValue({ success: true });
    mocks.api.areaCodesHardDelete.mockResolvedValue({ success: true });
  });

  it("muestra acceso denegado si el usuario no es admin", () => {
    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 8,
      email: "user@bsm.com.mx",
      role: "user",
    };

    renderWithProviders(<TypesAreasPage />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("crea un tipo y actualiza código y nombre en ambas tablas", async () => {
    renderWithProviders(<TypesAreasPage />);

    expect(await screen.findByText("Procedimiento")).toBeInTheDocument();

    const codeInputs = screen.getAllByLabelText("Código");
    fireEvent.change(codeInputs[0], { target: { value: "ins" } });
    fireEvent.change(screen.getByLabelText("Nombre largo"), {
      target: { value: "Instructivo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear tipo" }));

    await waitFor(() => {
      expect(mocks.api.documentTypesCreate).toHaveBeenCalledWith({
        code: "INS",
        nombreLargo: "Instructivo",
      });
      expect(mocks.notify).toHaveBeenCalledWith("Tipo creado", "success");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const editTypeDialog = screen.getByRole("dialog", {
      name: "Editar tipo de documento",
    });
    fireEvent.change(within(editTypeDialog).getByLabelText("Código"), {
      target: { value: "sig" },
    });
    fireEvent.change(within(editTypeDialog).getByLabelText("Nombre largo"), {
      target: { value: "Procedimiento SIG" },
    });
    fireEvent.click(
      within(editTypeDialog).getByRole("button", { name: "Guardar" }),
    );

    await waitFor(() => {
      expect(mocks.api.documentTypesUpdate).toHaveBeenCalledWith(1, {
        code: "SIG",
        nombreLargo: "Procedimiento SIG",
      });
      expect(mocks.notify).toHaveBeenCalledWith("Tipo actualizado", "success");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    const editAreaDialog = screen.getByRole("dialog", { name: "Editar área" });
    fireEvent.change(within(editAreaDialog).getByLabelText("Código"), {
      target: { value: "rc" },
    });
    fireEvent.change(within(editAreaDialog).getByLabelText("Nombre"), {
      target: { value: "Recursos y Calidad" },
    });
    fireEvent.click(
      within(editAreaDialog).getByRole("button", { name: "Guardar" }),
    );

    await waitFor(() => {
      expect(mocks.api.areaCodesUpdate).toHaveBeenCalledWith(1, {
        code: "RC",
        nombre: "Recursos y Calidad",
      });
      expect(mocks.notify).toHaveBeenCalledWith("Área actualizada", "success");
    });
  });

  it("desactiva un tipo y un área", async () => {
    renderWithProviders(<TypesAreasPage />);

    expect(await screen.findByText("Procedimiento")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]);
    const disableTypeDialog = screen.getByRole("dialog", {
      name: "Desactivar tipo de documento",
    });
    fireEvent.click(
      within(disableTypeDialog).getByRole("button", { name: "Desactivar" }),
    );

    await waitFor(() => {
      expect(mocks.api.documentTypesDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith("Tipo desactivado", "success");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[1]);
    const disableAreaDialog = screen.getByRole("dialog", {
      name: "Desactivar área",
    });
    fireEvent.click(
      within(disableAreaDialog).getByRole("button", { name: "Desactivar" }),
    );

    await waitFor(() => {
      expect(mocks.api.areaCodesDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith("Área desactivada", "success");
    });
  });

  it("elimina definitivamente un tipo y un área", async () => {
    renderWithProviders(<TypesAreasPage />);

    expect(await screen.findByText("Procedimiento")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    const deleteTypeDialog = screen.getByRole("dialog", {
      name: "Eliminar tipo de documento",
    });
    expect(deleteTypeDialog).toHaveTextContent(
      "Se eliminará definitivamente el tipo PRO. Los documentos que lo usen quedarán sin tipo asignado.",
    );
    fireEvent.click(
      within(deleteTypeDialog).getByRole("button", { name: "Eliminar" }),
    );

    await waitFor(() => {
      expect(mocks.api.documentTypesHardDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith("Tipo eliminado", "success");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar" })[1]);
    const deleteAreaDialog = screen.getByRole("dialog", {
      name: "Eliminar área",
    });
    expect(deleteAreaDialog).toHaveTextContent(
      "Se eliminará definitivamente el área RC. Los documentos y usuarios que la tengan asignada perderán esa relación.",
    );
    fireEvent.click(
      within(deleteAreaDialog).getByRole("button", { name: "Eliminar" }),
    );

    await waitFor(() => {
      expect(mocks.api.areaCodesHardDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith("Área eliminada", "success");
    });
  });

  it("recupera filtros guardados por usuario en ambas tablas", async () => {
    window.localStorage.setItem(
      "admin-types-areas-filters:admin@local.com",
      JSON.stringify({
        lastUsed: {
          typeSearch: "PRO",
          typeStatus: "inactive",
          typePage: 2,
          typeLimit: 20,
          areaSearch: "RC",
          areaStatus: "all",
          areaPage: 3,
          areaLimit: 5,
        },
        views: [],
      }),
    );

    renderWithProviders(<TypesAreasPage />);

    await waitFor(() => {
      expect(mocks.api.adminDocumentTypesList).toHaveBeenCalledWith({
        q: "PRO",
        includeInactive: false,
        status: "inactive",
        page: 2,
        limit: 20,
      });
      expect(mocks.api.adminAreaCodesList).toHaveBeenCalledWith({
        q: "RC",
        includeInactive: true,
        status: "all",
        page: 3,
        limit: 5,
      });
    });

    expect(screen.getAllByDisplayValue("PRO")[0]).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("RC")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Estado")[0]).toHaveValue("inactive");
    expect(screen.getAllByLabelText("Estado")[1]).toHaveValue("all");
    expect(screen.getAllByLabelText("Límite")[0]).toHaveValue("20");
    expect(screen.getAllByLabelText("Límite")[1]).toHaveValue("5");
  });
});
