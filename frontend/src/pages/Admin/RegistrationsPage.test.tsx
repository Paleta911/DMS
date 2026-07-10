import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../types/auth";
import { renderWithProviders } from "../../test/test-utils";
import RegistrationsPage from "./RegistrationsPage";

// Define todas las dependencias del panel para simular flujos complejos de registro.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    adminRegistrationsList: vi.fn(),
    adminRegistrationApprove: vi.fn(),
    adminRegistrationDelete: vi.fn(),
    adminRegistrationDeletePermanent: vi.fn(),
    adminRegistrationReject: vi.fn(),
    adminRegistrationRestore: vi.fn(),
    adminRegistrationResend: vi.fn(),
    adminRegistrationForceVerify: vi.fn(),
    adminRegistrationsExportCsv: vi.fn(),
    areaCodesListPaged: vi.fn(),
    usersGet: vi.fn(),
    usersSetAreas: vi.fn(),
    usersRestoreDeleted: vi.fn(),
    usersDeletePermanent: vi.fn(),
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

vi.mock("../../api/endpoints/adminRegistrations", () => mocks.api);

vi.mock("../../api/endpoints/types", () => ({
  areaCodesListPaged: mocks.api.areaCodesListPaged,
}));

vi.mock("../../api/endpoints/users", () => ({
  usersGet: mocks.api.usersGet,
  usersSetAreas: mocks.api.usersSetAreas,
  usersRestoreDeleted: mocks.api.usersRestoreDeleted,
  usersDeletePermanent: mocks.api.usersDeletePermanent,
}));

vi.mock("../../components/users/UserSearchInput", () => ({
  UserSearchInput: () => <div>Busqueda de usuarios</div>,
}));

describe("RegistrationsPage", () => {
  beforeEach(() => {
    // Limpia estado compartido antes de probar acciones con efectos secundarios.
    mocks.notify.mockReset();
    mocks.api.adminRegistrationsList.mockReset();
    mocks.api.adminRegistrationApprove.mockReset();
    mocks.api.adminRegistrationDelete.mockReset();
    mocks.api.adminRegistrationDeletePermanent.mockReset();
    mocks.api.adminRegistrationReject.mockReset();
    mocks.api.adminRegistrationRestore.mockReset();
    mocks.api.adminRegistrationResend.mockReset();
    mocks.api.adminRegistrationForceVerify.mockReset();
    mocks.api.adminRegistrationsExportCsv.mockReset();
    mocks.api.areaCodesListPaged.mockReset();
    mocks.api.usersGet.mockReset();
    mocks.api.usersSetAreas.mockReset();
    mocks.api.usersRestoreDeleted.mockReset();
    mocks.api.usersDeletePermanent.mockReset();

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: "admin@local.com",
      role: "admin",
      isSuperAdmin: true,
    };

    mocks.api.adminRegistrationsList.mockResolvedValue({
      items: [
        {
          id: 7,
          email: "sus@bsm.com.mx",
          nombre: "Sus",
          primerApellido: "Pérez",
          status: "PENDING_APPROVAL",
          registeredAt: "2026-03-08T00:00:00.000Z",
          sendStatus: "SIMULATED",
          sendAttempts: 1,
          verifyAttempts: 0,
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    mocks.api.adminRegistrationApprove.mockResolvedValue({});
    mocks.api.adminRegistrationDelete.mockResolvedValue({});
    mocks.api.adminRegistrationDeletePermanent.mockResolvedValue({});
    mocks.api.adminRegistrationReject.mockResolvedValue({});
    mocks.api.adminRegistrationRestore.mockResolvedValue({});
    mocks.api.adminRegistrationResend.mockResolvedValue({});
    mocks.api.adminRegistrationForceVerify.mockResolvedValue({});
    mocks.api.adminRegistrationsExportCsv.mockResolvedValue(new Blob());
    mocks.api.areaCodesListPaged.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 12,
    });
    mocks.api.usersGet.mockResolvedValue({
      id: 1,
      email: "admin@local.com",
      role: "admin",
      allowedAreaCodes: [],
      status: "APPROVED",
    });
    mocks.api.usersSetAreas.mockResolvedValue({});
    mocks.api.usersRestoreDeleted.mockResolvedValue({});
    mocks.api.usersDeletePermanent.mockResolvedValue({});
  });

  it("muestra acceso denegado si no es super admin", () => {
    mocks.auth.user = {
      id: 2,
      email: "admin@local.com",
      role: "admin",
      isSuperAdmin: false,
    };

    renderWithProviders(<RegistrationsPage />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("aprueba un registro pendiente", async () => {
    renderWithProviders(<RegistrationsPage />);

    expect(
      (await screen.findAllByText("sus@bsm.com.mx")).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Aprobar" })[0]);

    await waitFor(() => {
      expect(mocks.api.adminRegistrationApprove).toHaveBeenCalledWith(7);
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith("Registro aprobado", "success");
    });
  });

  it("rechaza un registro con motivo opcional", async () => {
    renderWithProviders(<RegistrationsPage />);

    expect(
      (await screen.findAllByText("sus@bsm.com.mx")).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Rechazar" })[0]);

    const input = screen.getByLabelText("Motivo (opcional)");
    fireEvent.change(input, { target: { value: "Documentación incompleta" } });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Rechazar",
      }),
    );

    await waitFor(() => {
      expect(mocks.api.adminRegistrationReject).toHaveBeenCalledWith(
        7,
        "Documentación incompleta",
      );
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith(
        "Registro rechazado",
        "success",
      );
    });
  });

  it("restaura un registro rechazado", async () => {
    mocks.api.adminRegistrationsList.mockResolvedValue({
      items: [
        {
          id: 8,
          email: "rechazado@bsm.com.mx",
          nombre: "Rechazado",
          primerApellido: "Pérez",
          status: "REJECTED",
          registeredAt: "2026-03-08T00:00:00.000Z",
          sendStatus: "SIMULATED",
          sendAttempts: 1,
          verifyAttempts: 0,
          verifiedAt: "2026-03-08T00:10:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });

    renderWithProviders(<RegistrationsPage />);

    expect(
      (await screen.findAllByText("rechazado@bsm.com.mx")).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Restaurar" })[0]);

    await waitFor(() => {
      expect(mocks.api.adminRegistrationRestore).toHaveBeenCalledWith(8);
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith(
        "Registro restaurado",
        "success",
      );
    });
  });

  it("elimina un usuario aprobado con confirmación", async () => {
    mocks.api.adminRegistrationsList.mockResolvedValue({
      items: [
        {
          id: 9,
          email: "aprobado@bsm.com.mx",
          nombre: "Aprobado",
          primerApellido: "López",
          status: "APPROVED",
          registeredAt: "2026-03-08T00:00:00.000Z",
          sendStatus: "SIMULATED",
          sendAttempts: 1,
          verifyAttempts: 0,
          verifiedAt: "2026-03-08T00:10:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });

    renderWithProviders(<RegistrationsPage />);

    expect(
      (await screen.findAllByText("aprobado@bsm.com.mx")).length,
    ).toBeGreaterThan(0);

    const table = screen.getByRole("table", {
      name: "Registros de usuarios pendientes y atendidos",
    });
    fireEvent.click(
      within(table).getAllByRole("button", { name: "Eliminar" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Suspender" }));

    await waitFor(() => {
      expect(mocks.api.adminRegistrationDelete).toHaveBeenCalledWith(9);
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith(
        "Usuario suspendido",
        "success",
      );
    });
  });
});
