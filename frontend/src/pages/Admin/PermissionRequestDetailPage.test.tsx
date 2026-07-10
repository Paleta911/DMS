import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../types/auth";
import { renderWithProviders } from "../../test/test-utils";
import { queryClient } from "../../app/queryClient";
import PermissionRequestDetailPage from "./PermissionRequestDetailPage";

// Mantiene controlado el estado de router, auth y endpoints por escenario.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  navigate: vi.fn(),
  router: {
    useParams: vi.fn(),
  },
  api: {
    adminPermissionRequestGet: vi.fn(),
    adminPermissionRequestApprove: vi.fn(),
    adminPermissionRequestApprovePartial: vi.fn(),
    adminPermissionRequestReject: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => mocks.router.useParams(),
  };
});

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

vi.mock("../../api/endpoints/permissionRequests", () => mocks.api);

describe("PermissionRequestDetailPage", () => {
  beforeEach(() => {
    // Evita fuga de cache/notificaciones entre pruebas de detalle.
    queryClient.clear();
    mocks.notify.mockReset();
    mocks.navigate.mockReset();
    mocks.router.useParams.mockReset();
    Object.values(mocks.api).forEach((fn) => fn.mockReset());

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: "admin@local.com",
      role: "admin",
      isSuperAdmin: true,
    };
    mocks.router.useParams.mockReturnValue({ id: "15" });
    mocks.api.adminPermissionRequestGet.mockResolvedValue({
      id: 15,
      status: "PENDING",
      requestType: "AREAS",
      requestedAreaCodes: JSON.stringify(["RC", "FA"]),
      requestedPermissions: JSON.stringify([]),
      comment: "Necesito acceso por actividades cruzadas",
      reviewReason: null,
      createdAt: "2026-03-09T12:00:00.000Z",
      user: { id: 9, email: "sus@bsm.com.mx" },
    });
    mocks.api.adminPermissionRequestApprove.mockResolvedValue({});
    mocks.api.adminPermissionRequestApprovePartial.mockResolvedValue({});
    mocks.api.adminPermissionRequestReject.mockResolvedValue({});
  });

  it("muestra acceso denegado si el usuario no es admin", () => {
    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 3,
      email: "user@bsm.com.mx",
      role: "user",
    };

    renderWithProviders(<PermissionRequestDetailPage />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("permite aprobar parcialmente una solicitud de áreas", async () => {
    // Asegura que se envian solo los permisos seleccionados por el admin.
    renderWithProviders(<PermissionRequestDetailPage />);

    expect(await screen.findByText("Solicitud pendiente")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aprobar parcial" }));
    fireEvent.click(screen.getByLabelText("RC"));
    fireEvent.change(
      screen.getByLabelText("Nota de aprobación parcial (opcional)"),
      {
        target: { value: "Se autoriza solo el área principal" },
      },
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirmar aprobación parcial",
      }),
    );

    await waitFor(() => {
      expect(
        mocks.api.adminPermissionRequestApprovePartial,
      ).toHaveBeenCalledWith(15, {
        areaCodes: ["RC"],
        note: "Se autoriza solo el área principal",
      });
      expect(mocks.notify).toHaveBeenCalledWith(
        "Aprobación parcial aplicada",
        "success",
      );
    });
  });

  it("permite rechazar una solicitud con motivo", async () => {
    renderWithProviders(<PermissionRequestDetailPage />);

    expect(await screen.findByText("Solicitud pendiente")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    fireEvent.change(screen.getByLabelText("Motivo de rechazo (opcional)"), {
      target: { value: "Falta validación interna" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Rechazar",
      }),
    );

    await waitFor(() => {
      expect(mocks.api.adminPermissionRequestReject).toHaveBeenCalledWith(
        15,
        "Falta validación interna",
      );
      expect(mocks.notify).toHaveBeenCalledWith(
        "Solicitud rechazada",
        "success",
      );
    });
  });
});
