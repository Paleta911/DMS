import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../auth/AuthContext";
import { usersMe, usersUpdateMe } from "../api/endpoints/users";
import { queryKeys } from "../app/queryKeys";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { PageContainer } from "../components/layout/PageContainer";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionCard } from "../components/layout/SectionCard";
import { Spinner } from "../components/ui/Spinner";
import { FadeInSection } from "../components/ui/Motion";
import { useToast } from "../components/ToastProvider";
import { useAreaCodesQuery } from "../hooks/useCatalogQueries";
import { translateStatus } from "../utils/labels";
import { getApiErrorMessage } from "../utils/apiError";
import {
  getBirthDateBounds,
  normalizePersonName,
  passwordPolicyMessage,
  profileSchema,
  sanitizePersonNameInput,
  sanitizePhoneOnly,
  type ProfileFormValues,
} from "../features/account/accountForm";
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  USER_REQUESTED_AREA_MAX_LENGTH,
} from "../constants/fieldLimits";
import type { UserProfile } from "../types/users";

const permissionLabels: Record<string, string> = {
  canAccess: "Acceso al sistema",
  canRead: "Ver documentos",
  canUpload: "Subir documentos",
  canUploadNewVersion: "Subir nueva versión",
  canReview: "Revisar documentos",
  canApprove: "Aprobar documentos",
  canDelete: "Eliminar documentos",
};

function toDateInput(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function buildProfileDefaults(profile: UserProfile): ProfileFormValues {
  const allowedAreaCodes = profile.allowedAreaCodes ?? [];
  const hasPendingManualAreaRequest =
    Boolean(profile.requestedAreaNombre) && allowedAreaCodes.length === 0;

  // Defaults preserve pending manual area requests when no area has been assigned yet.

  return {
    nombre: profile.nombre ?? "",
    primerApellido: profile.primerApellido ?? "",
    segundoApellido: profile.segundoApellido ?? "",
    telefono: profile.telefono ?? "",
    fechaNacimiento: toDateInput(profile.fechaNacimiento),
    useCustomArea: hasPendingManualAreaRequest,
    areaCode: hasPendingManualAreaRequest ? "" : (allowedAreaCodes[0] ?? ""),
    requestedAreaNombre: hasPendingManualAreaRequest
      ? (profile.requestedAreaNombre ?? "")
      : "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  };
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const areasQuery = useAreaCodesQuery();
  const profileQuery = useQuery({
    queryKey: queryKeys.users.me,
    queryFn: usersMe,
  });
  const profile: UserProfile | null = (profileQuery.data ??
    user ??
    null) as UserProfile | null;
  const tasks = profileQuery.data?.tasks;
  const permissions = profile?.permissions ?? null;
  const allowedAreaCodes = profile?.allowedAreaCodes ?? [];
  const hasPendingManualAreaRequest =
    Boolean(profile?.requestedAreaNombre) && allowedAreaCodes.length === 0;
  const { minBirthDate, maxBirthDate } = getBirthDateBounds();

  const areaLabel = useMemo(() => {
    if (hasPendingManualAreaRequest || allowedAreaCodes.length === 0) {
      return "Sin área asignada";
    }

    const areaNameByCode = new Map(
      (areasQuery.data ?? []).map((area) => [area.code, area.nombre]),
    );
    return allowedAreaCodes
      .map((code) => areaNameByCode.get(code) ?? code)
      .join(", ");
  }, [allowedAreaCodes, areasQuery.data, hasPendingManualAreaRequest]);

  const multipleAreasAssigned = allowedAreaCodes.length > 1;
  const initialAreaCode = hasPendingManualAreaRequest
    ? ""
    : (allowedAreaCodes[0] ?? "");
  const initialRequestedAreaNombre = hasPendingManualAreaRequest
    ? (profile?.requestedAreaNombre?.trim() ?? "")
    : "";

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre: "",
      primerApellido: "",
      segundoApellido: "",
      telefono: "",
      fechaNacimiento: "",
      useCustomArea: false,
      areaCode: "",
      requestedAreaNombre: "",
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!profile) {
      return;
    }
    reset(buildProfileDefaults(profile));
  }, [profile, reset]);

  const nombreValue = watch("nombre");
  const primerApellidoValue = watch("primerApellido");
  const segundoApellidoValue = watch("segundoApellido");
  const telefonoValue = watch("telefono");
  const useCustomArea = watch("useCustomArea");

  const bindPersonNameField = (
    field: "nombre" | "primerApellido" | "segundoApellido",
    value: string | undefined,
  ) => {
    const fieldRegistration = register(field);
    return {
      ...fieldRegistration,
      value: value ?? "",
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = sanitizePersonNameInput(event.target.value);
        setValue(field, sanitizedValue as ProfileFormValues[typeof field], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const normalizedValue = normalizePersonName(
          event.clipboardData.getData("text"),
        );
        setValue(field, normalizedValue as ProfileFormValues[typeof field], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        fieldRegistration.onBlur(event);
        const normalizedValue = normalizePersonName(event.target.value);
        setValue(field, normalizedValue as ProfileFormValues[typeof field], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
    };
  };

  const bindPhoneField = (value: string | undefined) => {
    const fieldRegistration = register("telefono");
    return {
      ...fieldRegistration,
      value: value ?? "",
      inputMode: "numeric" as const,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue("telefono", sanitizePhoneOnly(event.target.value), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        setValue(
          "telefono",
          sanitizePhoneOnly(event.clipboardData.getData("text")),
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          },
        );
      },
    };
  };

  const mutation = useMutation({
    mutationFn: usersUpdateMe,
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(queryKeys.users.me, updatedProfile);
      await refreshUser();
      reset(buildProfileDefaults(updatedProfile));
      notify(
        updatedProfile.requestedAreaNombre &&
          (updatedProfile.allowedAreaCodes?.length ?? 0) === 0
          ? "Perfil actualizado. El administrador asignará tu área en un lapso de 24 horas."
          : "Perfil actualizado",
        "success",
      );
    },
    onError: (error) => {
      notify(
        getApiErrorMessage(error, "No se pudo actualizar tu perfil"),
        "error",
      );
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!profile) {
      return;
    }

    const normalizedRequestedAreaNombre =
      values.requestedAreaNombre?.trim() ?? "";
    const currentAreaCode = values.areaCode?.trim() ?? "";
    const areaChanged = values.useCustomArea
      ? !hasPendingManualAreaRequest ||
        normalizedRequestedAreaNombre !== initialRequestedAreaNombre
      : hasPendingManualAreaRequest || currentAreaCode !== initialAreaCode;
    const wantsPasswordChange = Boolean(
      values.currentPassword || values.password || values.confirmPassword,
    );

    // Only send area/password fields when they truly changed to avoid accidental updates.
    const payload = {
      nombre: normalizePersonName(values.nombre),
      primerApellido: normalizePersonName(values.primerApellido),
      segundoApellido: normalizePersonName(values.segundoApellido) || null,
      telefono: values.telefono || null,
      fechaNacimiento: values.fechaNacimiento || null,
      ...(areaChanged
        ? values.useCustomArea
          ? { requestedAreaNombre: normalizedRequestedAreaNombre || null }
          : { areaCode: currentAreaCode }
        : {}),
      ...(wantsPasswordChange
        ? {
            currentPassword: values.currentPassword,
            password: values.password,
            confirmPassword: values.confirmPassword,
          }
        : {}),
    };

    await mutation.mutateAsync(payload);
  });

  return (
    <PageContainer>
      <FadeInSection>
        <PageHeader
          title="Perfil"
          subtitle="Actualiza tus datos personales y tu área principal."
        />
      </FadeInSection>
      {profileQuery.isLoading ? (
        <FadeInSection delay={0.05}>
          <SectionCard className="flex items-center justify-center p-10">
            <Spinner />
          </SectionCard>
        </FadeInSection>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
          <FadeInSection delay={0.05}>
            <SectionCard>
              <div className="text-sm text-brand-textMuted">
                Datos personales
              </div>
              <div className="mt-2 text-sm text-brand-textMuted">
                Estado:{" "}
                <span className="font-semibold text-brand-text">
                  {translateStatus(profile?.status)}
                </span>
              </div>
              <form
                className="mt-5 grid gap-4 md:grid-cols-2"
                onSubmit={onSubmit}
                autoComplete="off"
              >
                <Input
                  label="Correo"
                  value={profile?.email ?? ""}
                  readOnly
                  maxLength={USER_EMAIL_MAX_LENGTH}
                  hint="No puedes editar tu correo porque es único para tu cuenta."
                  className="cursor-not-allowed bg-brand-bg/60 text-brand-textMuted"
                />
                <div className="md:col-span-2" />
                <Input
                  label="Nombre(s)"
                  error={errors.nombre?.message}
                  autoComplete="given-name"
                  maxLength={USER_NAME_MAX_LENGTH}
                  {...bindPersonNameField("nombre", nombreValue)}
                />
                <Input
                  label="Primer apellido"
                  error={errors.primerApellido?.message}
                  autoComplete="family-name"
                  maxLength={USER_NAME_MAX_LENGTH}
                  {...bindPersonNameField(
                    "primerApellido",
                    primerApellidoValue,
                  )}
                />
                <Input
                  label="Segundo apellido"
                  error={errors.segundoApellido?.message}
                  autoComplete="additional-name"
                  maxLength={USER_NAME_MAX_LENGTH}
                  {...bindPersonNameField(
                    "segundoApellido",
                    segundoApellidoValue,
                  )}
                />
                <Input
                  label="Teléfono/extensión"
                  error={errors.telefono?.message}
                  maxLength={USER_PHONE_MAX_LENGTH}
                  {...bindPhoneField(telefonoValue)}
                />
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  error={errors.fechaNacimiento?.message}
                  min={minBirthDate}
                  max={maxBirthDate}
                  {...register("fechaNacimiento")}
                />
                <div className="rounded-xl border border-brand-border bg-brand-bg/30 px-4 py-3">
                  <div className="text-xs uppercase tracking-widest text-brand-textMuted">
                    Área actual
                  </div>
                  <div className="mt-1 font-semibold text-brand-text">
                    {areaLabel}
                  </div>
                  {hasPendingManualAreaRequest ? (
                    <div className="mt-2 text-xs text-brand-textMuted/80">
                      El administrador asignará tu área en un lapso de 24 horas.
                    </div>
                  ) : null}
                  {multipleAreasAssigned ? (
                    <div className="mt-2 text-xs text-brand-textMuted/80">
                      Tu cuenta tiene varias áreas asignadas. Si guardas un
                      cambio desde aquí, se conservará una sola.
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="Área"
                    error={errors.areaCode?.message}
                    defaultValue=""
                    disabled={areasQuery.isLoading || useCustomArea}
                    {...register("areaCode")}
                  >
                    <option value="">
                      {areasQuery.isLoading
                        ? "Cargando áreas..."
                        : "Selecciona un área"}
                    </option>
                    {(areasQuery.data ?? []).map((area) => (
                      <option key={area.id} value={area.code}>
                        {area.code} - {area.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-3 py-3 text-sm text-brand-text">
                    <input
                      type="checkbox"
                      checked={useCustomArea}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setValue("useCustomArea", checked, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        if (checked) {
                          setValue("areaCode", "", {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          return;
                        }
                        setValue("requestedAreaNombre", "", {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                      className="h-4 w-4 rounded border border-brand-border"
                    />
                    <span>Mi área no está en la lista</span>
                  </label>
                </div>
                {useCustomArea ? (
                  <div className="md:col-span-2">
                    <Input
                      label="Escribe tu área"
                      error={errors.requestedAreaNombre?.message}
                      maxLength={USER_REQUESTED_AREA_MAX_LENGTH}
                      {...register("requestedAreaNombre")}
                    />
                  </div>
                ) : null}
                <div className="md:col-span-2 mt-2 border-t border-brand-border pt-4">
                  <div className="text-sm font-semibold text-brand-text">
                    Cambiar contraseña
                  </div>
                  <div className="mt-1 text-xs text-brand-textMuted">
                    Solo llena estos campos si quieres actualizar tu contraseña.
                  </div>
                </div>
                <Input
                  label="Contraseña actual"
                  type="password"
                  error={errors.currentPassword?.message}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoComplete="off"
                  {...register("currentPassword")}
                />
                <Input
                  label="Nueva contraseña"
                  type="password"
                  error={errors.password?.message}
                  hint={passwordPolicyMessage}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoComplete="new-password"
                  {...register("password")}
                />
                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  error={errors.confirmPassword?.message}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSubmitting || mutation.isPending || !profile}
                    onClick={() => {
                      if (profile) {
                        reset(buildProfileDefaults(profile));
                      }
                    }}
                  >
                    Restablecer
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || mutation.isPending || !profile || !isDirty
                    }
                  >
                    {mutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </SectionCard>
          </FadeInSection>
          <div className="grid gap-6">
            <FadeInSection delay={0.08}>
              <SectionCard>
                <div className="text-sm text-brand-textMuted">
                  Tareas pendientes
                </div>
                <div className="mt-4 grid gap-3 text-sm text-brand-text">
                  <div>
                    Tienes{" "}
                    <span className="font-semibold">
                      {tasks?.pendingReview ?? 0}
                    </span>{" "}
                    documentos pendientes por revisar.
                  </div>
                  <div>
                    Tienes{" "}
                    <span className="font-semibold">
                      {tasks?.pendingApprove ?? 0}
                    </span>{" "}
                    documentos pendientes por aprobar.
                  </div>
                </div>
              </SectionCard>
            </FadeInSection>
            <FadeInSection delay={0.1}>
              <SectionCard>
                <div className="text-sm text-brand-textMuted">Permisos</div>
                <div className="mt-4 grid gap-2">
                  {permissions
                    ? Object.entries(permissionLabels).map(([key, label]) => (
                        <div
                          key={key}
                          className="rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2 text-sm"
                        >
                          <div className="font-semibold text-brand-text">
                            {label}
                          </div>
                          <div
                            className={
                              permissions[key as keyof typeof permissions]
                                ? "text-brand-accent"
                                : "text-ember"
                            }
                          >
                            {permissions[key as keyof typeof permissions]
                              ? "Activo"
                              : "Sin permiso"}
                          </div>
                        </div>
                      ))
                    : null}
                </div>
              </SectionCard>
            </FadeInSection>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
