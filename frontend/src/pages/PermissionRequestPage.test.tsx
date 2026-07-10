import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../types/auth";
import { renderWithProviders } from "../test/test-utils";
import PermissionRequestPage from "./PermissionRequestPage";

// Covers permission-request UX: super-admin blocking and duplicate/pending state handling.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
  },
  notify: vi.fn(),
  api: {
    permissionRequestsMine: vi.fn(),
    permissionRequestsCreate: vi.fn(),
    areaRequestsCreate: vi.fn(),
    areaCodesListPaged: vi.fn(),
  },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    token: null,
    isAdmin: mocks.auth.user?.role === "admin",
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("../components/ToastProvider", () => ({
  useToast: () => ({
    notify: mocks.notify,
  }),
}));

vi.mock("../api/endpoints/permissionRequests", () => ({
  permissionRequestsMine: mocks.api.permissionRequestsMine,
  permissionRequestsCreate: mocks.api.permissionRequestsCreate,
  areaRequestsCreate: mocks.api.areaRequestsCreate,
}));

vi.mock("../api/endpoints/types", () => ({
  areaCodesListPaged: mocks.api.areaCodesListPaged,
}));

describe("PermissionRequestPage", () => {
  beforeEach(() => {
    mocks.notify.mockReset();
    mocks.api.permissionRequestsMine.mockReset();
    mocks.api.permissionRequestsCreate.mockReset();
    mocks.api.areaRequestsCreate.mockReset();
    mocks.api.areaCodesListPaged.mockReset();

    mocks.auth.user = {
      id: 17,
      email: "sus@bsm.com.mx",
      role: "user",
      isSuperAdmin: false,
      allowedAreaCodes: ["FA"],
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
    };

    mocks.api.permissionRequestsMine.mockResolvedValue({
      items: [
        {
          id: 1,
          requestedPermissions: '["UPLOAD"]',
          status: "PENDING",
          requestType: "PERMISSIONS",
          createdAt: "2026-03-08T00:00:00.000Z",
        },
        {
          id: 2,
          requestedPermissions: "[]",
          requestedAreaCodes: '["RC"]',
          status: "PENDING",
          requestType: "AREAS",
          createdAt: "2026-03-08T00:00:00.000Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
    mocks.api.permissionRequestsCreate.mockResolvedValue({});
    mocks.api.areaRequestsCreate.mockResolvedValue({});
    mocks.api.areaCodesListPaged.mockResolvedValue({
      items: [
        { id: 1, code: "FA", nombre: "Finanzas", activo: true },
        { id: 2, code: "RC", nombre: "Recursos Humanos", activo: true },
        { id: 3, code: "SA", nombre: "Seguridad y Ambiente", activo: true },
      ],
      total: 3,
      page: 1,
      limit: 12,
    });
  });

  it("bloquea la vista si el usuario es super admin", () => {
    mocks.auth.user = {
      ...mocks.auth.user!,
      role: "admin",
      isSuperAdmin: true,
    };

    renderWithProviders(<PermissionRequestPage />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("marca permisos ya activos o pendientes para evitar duplicados", async () => {
    renderWithProviders(<PermissionRequestPage />);

    expect(
      await screen.findByText("Tienes solicitudes pendientes"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 permiso\(s\) siguen en revisión/),
    ).toBeInTheDocument();
    expect(await screen.findByText("Subir documentos")).toBeInTheDocument();

    const grantedPermission = screen
      .getByText("Ver documentos (ya activo)")
      .closest("label");
    expect(grantedPermission).not.toBeNull();
    expect(
      within(grantedPermission as HTMLElement).getByRole("checkbox"),
    ).toBeChecked();
    expect(
      within(grantedPermission as HTMLElement).getByRole("checkbox"),
    ).toBeDisabled();

    const pendingPermission = screen
      .getByText("Subir documentos (pendiente)")
      .closest("label");
    expect(pendingPermission).not.toBeNull();
    expect(
      within(pendingPermission as HTMLElement).getByRole("checkbox"),
    ).toBeChecked();
    expect(
      within(pendingPermission as HTMLElement).getByRole("checkbox"),
    ).toBeDisabled();
  });
});
