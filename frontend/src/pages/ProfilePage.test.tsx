import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../types/auth";
import type { UserProfile } from "../types/users";
import { queryClient } from "../app/queryClient";
import { renderWithProviders } from "../test/test-utils";
import ProfilePage from "./ProfilePage";

// Profile page tests validate readonly identity fields and area/profile update payload behavior.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    refreshUser: vi.fn(),
  },
  notify: vi.fn(),
  api: {
    usersMe: vi.fn(),
    usersUpdateMe: vi.fn(),
  },
  areas: {
    useAreaCodesQuery: vi.fn(),
  },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    token: "token",
    refreshToken: "refresh",
    isAdmin: mocks.auth.user?.role === "admin",
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: mocks.auth.refreshUser,
  }),
}));

vi.mock("../components/ToastProvider", () => ({
  useToast: () => ({
    notify: mocks.notify,
  }),
}));

vi.mock("../api/endpoints/users", () => mocks.api);
vi.mock("../hooks/useCatalogQueries", () => mocks.areas);

const baseProfile: UserProfile = {
  id: 10,
  email: "ana@bsm.com.mx",
  role: "user",
  status: "APPROVED",
  nombre: "Ana",
  primerApellido: "Lopez",
  segundoApellido: "Garcia",
  telefono: "2713882691",
  fechaNacimiento: "1995-02-01",
  allowedAreaCodes: ["FA"],
  requestedAreaNombre: null,
  permissions: {
    canAccess: true,
    canRead: true,
    canUpload: true,
    canUploadNewVersion: false,
    canReview: false,
    canApprove: false,
    canDelete: false,
  },
  tasks: {
    pendingReview: 1,
    pendingApprove: 2,
  },
};

describe("ProfilePage", () => {
  beforeEach(() => {
    queryClient.clear();
    mocks.notify.mockReset();
    mocks.auth.refreshUser.mockReset();
    mocks.api.usersMe.mockReset();
    mocks.api.usersUpdateMe.mockReset();
    mocks.areas.useAreaCodesQuery.mockReset();

    mocks.auth.user = baseProfile as AuthUser;
    mocks.api.usersMe.mockResolvedValue(baseProfile);
    mocks.api.usersUpdateMe.mockResolvedValue(baseProfile);
    mocks.areas.useAreaCodesQuery.mockReturnValue({
      data: [
        { id: 1, code: "FA", nombre: "Fabrica" },
        { id: 2, code: "RH", nombre: "Recursos Humanos" },
      ],
      isLoading: false,
    });
  });

  it("muestra correo no editable y aviso de area pendiente cuando aplica", async () => {
    mocks.api.usersMe.mockResolvedValue({
      ...baseProfile,
      allowedAreaCodes: [],
      requestedAreaNombre: "Laboratorio",
    });

    renderWithProviders(<ProfilePage />);

    const emailInput = await screen.findByLabelText("Correo");
    expect(emailInput).toHaveValue("ana@bsm.com.mx");
    expect(emailInput).toHaveAttribute("readonly");
    expect(
      screen.getByText(
        "No puedes editar tu correo porque es único para tu cuenta.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin área asignada")).toBeInTheDocument();
    expect(
      screen.getByText(
        "El administrador asignará tu área en un lapso de 24 horas.",
      ),
    ).toBeInTheDocument();
  });

  it("actualiza datos y área seleccionada de la lista", async () => {
    mocks.api.usersUpdateMe.mockResolvedValue({
      ...baseProfile,
      nombre: "Ana Maria",
      allowedAreaCodes: ["RH"],
    });

    renderWithProviders(<ProfilePage />);

    await screen.findByDisplayValue("Ana");
    fireEvent.change(screen.getByLabelText("Nombre(s)"), {
      target: { value: "Ana Maria" },
    });
    fireEvent.change(screen.getByLabelText("Área"), {
      target: { value: "RH" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mocks.api.usersUpdateMe).toHaveBeenCalled();
      expect(mocks.api.usersUpdateMe.mock.calls[0][0]).toEqual({
        nombre: "Ana Maria",
        primerApellido: "Lopez",
        segundoApellido: "Garcia",
        telefono: "2713882691",
        fechaNacimiento: "1995-02-01",
        areaCode: "RH",
      });
    });
    expect(mocks.auth.refreshUser).toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledWith("Perfil actualizado", "success");
  });

  it("envia solicitud de area manual y muestra aviso de 24 horas", async () => {
    mocks.api.usersUpdateMe.mockResolvedValue({
      ...baseProfile,
      allowedAreaCodes: [],
      requestedAreaNombre: "Laboratorio",
    });

    renderWithProviders(<ProfilePage />);

    await screen.findByDisplayValue("Ana");
    fireEvent.click(screen.getByLabelText("Mi área no está en la lista"));
    fireEvent.change(screen.getByLabelText("Escribe tu área"), {
      target: { value: "Laboratorio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mocks.api.usersUpdateMe).toHaveBeenCalled();
      expect(mocks.api.usersUpdateMe.mock.calls[0][0]).toEqual({
        nombre: "Ana",
        primerApellido: "Lopez",
        segundoApellido: "Garcia",
        telefono: "2713882691",
        fechaNacimiento: "1995-02-01",
        requestedAreaNombre: "Laboratorio",
      });
    });
    expect(mocks.notify).toHaveBeenCalledWith(
      "Perfil actualizado. El administrador asignará tu área en un lapso de 24 horas.",
      "success",
    );
  });
});
