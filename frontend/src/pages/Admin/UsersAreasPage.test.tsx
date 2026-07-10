import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../types/auth";
import { renderWithProviders } from "../../test/test-utils";
import UsersAreasPage from "./UsersAreasPage";

// Mocks compartidos para controlar busqueda, asignacion y catálogos de áreas.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  selectedUser: {
    id: 17,
    email: "sus@bsm.com.mx",
    nombre: "Sus",
    primerApellido: "Pérez",
    segundoApellido: "López",
    role: "user",
    status: "APPROVED",
    canAccess: true,
  },
  api: {
    usersGet: vi.fn(),
    usersSetAreas: vi.fn(),
    areaCodesListPaged: vi.fn(),
    adminRegistrationsList: vi.fn(),
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

vi.mock("../../api/endpoints/users", () => ({
  usersGet: mocks.api.usersGet,
  usersSetAreas: mocks.api.usersSetAreas,
}));

vi.mock("../../api/endpoints/types", () => ({
  areaCodesListPaged: mocks.api.areaCodesListPaged,
}));

vi.mock("../../api/endpoints/adminRegistrations", () => ({
  adminRegistrationsList: mocks.api.adminRegistrationsList,
  adminRegistrationApprove: vi.fn(),
  adminRegistrationDelete: vi.fn(),
  adminRegistrationDeletePermanent: vi.fn(),
  adminRegistrationReject: vi.fn(),
  adminRegistrationRestore: vi.fn(),
  adminRegistrationResend: vi.fn(),
  adminRegistrationForceVerify: vi.fn(),
  adminRegistrationsExportCsv: vi.fn(),
}));

vi.mock("../../components/users/UserSearchInput", () => ({
  UserSearchInput: ({
    onSelect,
    searchValue,
  }: {
    onSelect: (user: typeof mocks.selectedUser) => void;
    searchValue?: string;
  }) => (
    <div>
      <div data-testid="user-search-value">{searchValue ?? ""}</div>
      <button type="button" onClick={() => onSelect(mocks.selectedUser)}>
        Seleccionar usuario
      </button>
    </div>
  ),
}));

describe("UsersAreasPage", () => {
  beforeEach(() => {
    // Reinicio completo para evitar dependencia entre escenarios de asignación.
    window.localStorage.clear();
    mocks.notify.mockReset();
    mocks.api.usersGet.mockReset();
    mocks.api.usersSetAreas.mockReset();
    mocks.api.areaCodesListPaged.mockReset();
    mocks.api.adminRegistrationsList.mockReset();

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: "admin@local.com",
      role: "admin",
      isSuperAdmin: true,
    };

    mocks.api.areaCodesListPaged.mockResolvedValue({
      items: [
        { id: 1, code: "FA", nombre: "Finanzas" },
        { id: 2, code: "RC", nombre: "Recursos Humanos" },
      ],
      total: 2,
      page: 1,
      limit: 12,
    });
    mocks.api.usersGet.mockResolvedValue({
      id: 17,
      email: "sus@bsm.com.mx",
      role: "user",
      allowedAreaCodes: ["FA"],
    });
    mocks.api.usersSetAreas.mockResolvedValue({});
    mocks.api.adminRegistrationsList.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it("muestra una guía inicial antes de seleccionar un usuario", () => {
    renderWithProviders(<UsersAreasPage />);

    expect(screen.getByText("Selecciona un usuario")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Busca un correo o nombre y elige un usuario para revisar su cuenta, sus registros y sus áreas actuales.",
      ),
    ).toBeInTheDocument();
  });

  it("muestra cambios pendientes y guarda áreas actualizadas", async () => {
    renderWithProviders(<UsersAreasPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar usuario" }),
    );

    expect(
      await screen.findByText("Correo: sus@bsm.com.mx"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Desasignar" }));
    fireEvent.click(screen.getAllByRole("checkbox")[1]);

    expect(screen.getByText("Cambios pendientes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mocks.api.usersSetAreas).toHaveBeenCalledWith(17, ["RC"]);
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith(
        "Áreas actualizadas",
        "success",
      );
    });
  });

  it("recupera filtros guardados por usuario en usuarios y áreas", async () => {
    window.localStorage.setItem(
      "admin-users-directory-filters:admin@local.com",
      JSON.stringify({
        lastUsed: {
          search: "sus@bsm.com.mx",
          status: "APPROVED",
          role: "user",
          areaState: "with_area",
        },
        views: [],
      }),
    );
    window.localStorage.setItem(
      "admin-users-area-filters:admin@local.com",
      JSON.stringify({
        lastUsed: {
          areaSearch: "FA",
          areaPage: 2,
          areaLimit: 24,
        },
        views: [],
      }),
    );

    renderWithProviders(<UsersAreasPage />);

    expect(screen.getByTestId("user-search-value")).toHaveTextContent(
      "sus@bsm.com.mx",
    );
    expect(screen.getByLabelText("Rol")).toHaveValue("user");
    expect(screen.getByText("Aprobado")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar usuario" }),
    );

    expect(await screen.findByDisplayValue("FA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("24")).toBeInTheDocument();
  });
});
