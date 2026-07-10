import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { authRegister } from "../api/endpoints/auth";
import { PublicPageFrame } from "../components/layout/PublicPageFrame";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useToast } from "../components/ToastProvider";
import { bsmLogoUrl } from "../utils/brand";
import { getApiErrorMessage } from "../utils/apiError";
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_REQUESTED_AREA_MAX_LENGTH,
} from "../constants/fieldLimits";
import { usePublicAreaCodesQuery } from "../hooks/useCatalogQueries";
import { setPendingVerificationEmail } from "../auth/storage";
import {
  PageTransition,
  buildStaggerContainer,
  buildStaggerItem,
  FORM_TRANSITION,
} from "../components/ui/Motion";
import {
  getBirthDateBounds,
  normalizePersonName,
  passwordPolicyMessage,
  registerSchema,
  sanitizePersonNameInput,
  sanitizePhoneOnly,
  type RegisterFormValues,
} from "../features/account/accountForm";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const reduceMotion = useReducedMotion();
  const [emailWarning, setEmailWarning] = useState("");
  const [pendingCustomAreaNotice, setPendingCustomAreaNotice] = useState<{
    areaName: string;
  } | null>(null);
  const formVariants = buildStaggerContainer(0.05, 0.05);
  const itemVariants = buildStaggerItem(8);
  const { maxBirthDate, minBirthDate } = getBirthDateBounds();
  const areasQuery = usePublicAreaCodesQuery();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: "",
      primerApellido: "",
      segundoApellido: "",
      email: "",
      areaCode: "",
      useCustomArea: false,
      requestedAreaNombre: "",
      telefono: "",
      fechaNacimiento: "",
      password: "",
      confirmPassword: "",
    },
  });

  const nombreValue = watch("nombre");
  const primerApellidoValue = watch("primerApellido");
  const segundoApellidoValue = watch("segundoApellido");
  const useCustomArea = watch("useCustomArea");
  const telefonoValue = watch("telefono");

  const acknowledgeCustomAreaNotice = () => {
    // For custom areas, we show a post-submit notice before redirecting to verification.
    setPendingCustomAreaNotice(null);
    notify("Registro creado. Revisa tu correo para verificar.", "success");
    navigate("/verify-email");
  };

  const bindPersonNameField = (
    field: "nombre" | "primerApellido" | "segundoApellido",
    value: string | undefined,
  ) => {
    // Shared normalization logic keeps person-name fields consistent across input/paste/blur.
    const fieldRegistration = register(field);
    return {
      ...fieldRegistration,
      value: value ?? "",
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = sanitizePersonNameInput(event.target.value);
        setValue(field, sanitizedValue as RegisterFormValues[typeof field], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData("text");
        const normalizedValue = normalizePersonName(
          sanitizePersonNameInput(pastedText),
        );
        setValue(field, normalizedValue as RegisterFormValues[typeof field], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        fieldRegistration.onBlur(event);
        const normalizedValue = normalizePersonName(event.target.value);
        setValue(field, normalizedValue as RegisterFormValues[typeof field], {
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      const nombre = normalizePersonName(values.nombre);
      const primerApellido = normalizePersonName(values.primerApellido);
      const segundoApellido =
        normalizePersonName(values.segundoApellido) || undefined;
      const requestedAreaNombre =
        values.requestedAreaNombre?.trim() || undefined;
      const payload = {
        nombre,
        primerApellido,
        segundoApellido,
        email: values.email,
        areaCode: values.useCustomArea
          ? undefined
          : values.areaCode || undefined,
        requestedAreaNombre: values.useCustomArea
          ? requestedAreaNombre
          : undefined,
        telefono: values.telefono || undefined,
        fechaNacimiento: values.fechaNacimiento || undefined,
        password: values.password,
        confirmPassword: values.confirmPassword,
      };
      await authRegister(payload);
      // Preserve email to streamline verify-email screen prefill.
      setPendingVerificationEmail(values.email);
      if (values.useCustomArea && requestedAreaNombre) {
        setPendingCustomAreaNotice({
          areaName: requestedAreaNombre,
        });
        return;
      }
      notify("Registro creado. Revisa tu correo para verificar.", "success");
      navigate("/verify-email");
    } catch (error: any) {
      const message = getApiErrorMessage(error, "Error al registrar");
      if (
        message === "Este correo ya está vinculado a una cuenta" ||
        message === "Tu correo ya está vinculado a una cuenta" ||
        message === "El email ya existe"
      ) {
        setEmailWarning("Este correo ya está vinculado a una cuenta");
        return;
      }
      notify(getApiErrorMessage(error, "Error al registrar"), "error");
    }
  });

  return (
    <PageTransition>
      <PublicPageFrame>
        <motion.div
          className="w-full max-w-lg rounded-xl border border-brand-border bg-brand-surface/90 p-6 shadow-soft sm:p-8"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FORM_TRANSITION}
        >
          <div className="flex flex-col items-center text-center">
            {bsmLogoUrl ? (
              <img
                src={bsmLogoUrl}
                alt="BSM"
                className="h-14 w-14 object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary text-lg font-bold text-white">
                BSM
              </div>
            )}
            <div className="mt-4 font-display text-2xl text-brand-primary">
              Crear cuenta
            </div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Completa tus datos para solicitar acceso.
            </p>
          </div>
          <motion.form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={onSubmit}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={formVariants}
          >
            <motion.div variants={itemVariants}>
              <Input
                label="Nombre(s)"
                error={errors.nombre?.message}
                autoComplete="given-name"
                maxLength={USER_NAME_MAX_LENGTH}
                {...bindPersonNameField("nombre", nombreValue)}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Primer apellido"
                error={errors.primerApellido?.message}
                autoComplete="family-name"
                maxLength={USER_NAME_MAX_LENGTH}
                {...bindPersonNameField("primerApellido", primerApellidoValue)}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
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
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Teléfono/extensión"
                error={errors.telefono?.message}
                {...bindPhoneField(telefonoValue)}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Correo"
                type="email"
                error={errors.email?.message}
                warning={!errors.email?.message ? emailWarning : undefined}
                maxLength={USER_EMAIL_MAX_LENGTH}
                {...register("email", {
                  onChange: () => setEmailWarning(""),
                })}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
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
            </motion.div>
            <motion.div variants={itemVariants} className="sm:col-span-2">
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
            </motion.div>
            {useCustomArea ? (
              <motion.div variants={itemVariants} className="sm:col-span-2">
                <Input
                  label="Escribe tu área"
                  error={errors.requestedAreaNombre?.message}
                  maxLength={USER_REQUESTED_AREA_MAX_LENGTH}
                  {...register("requestedAreaNombre")}
                />
              </motion.div>
            ) : null}
            <motion.div variants={itemVariants}>
              <Input
                label="Fecha de nacimiento"
                type="date"
                error={errors.fechaNacimiento?.message}
                min={minBirthDate}
                max={maxBirthDate}
                {...register("fechaNacimiento")}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Contraseña"
                type="password"
                error={errors.password?.message}
                hint={passwordPolicyMessage}
                maxLength={PASSWORD_MAX_LENGTH}
                {...register("password")}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Confirmar contraseña"
                type="password"
                error={errors.confirmPassword?.message}
                maxLength={PASSWORD_MAX_LENGTH}
                {...register("confirmPassword")}
              />
            </motion.div>
            <motion.div variants={itemVariants} className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Crear cuenta"}
              </Button>
            </motion.div>
          </motion.form>
          <div className="mt-4 text-center text-sm text-brand-textMuted">
            ¿Ya tienes cuenta?{" "}
            <Link
              className="font-semibold text-brand-primary hover:underline"
              to="/login"
            >
              Inicia sesión
            </Link>
          </div>
        </motion.div>
        <Modal
          open={Boolean(pendingCustomAreaNotice)}
          title="Área enviada para revisión"
          onClose={acknowledgeCustomAreaNotice}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-brand-text">
              Seleccionaste que tu área no está en la lista. Notificaremos al
              administrador para revisar y agregar el área{" "}
              <span className="font-semibold text-ink">
                {pendingCustomAreaNotice?.areaName ?? "-"}
              </span>
              .
            </p>
            <p className="text-sm leading-6 text-brand-textMuted">
              Tu cuenta seguirá el flujo normal de verificación por correo
              mientras el administrador revisa esta solicitud.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={acknowledgeCustomAreaNotice}>
                OK
              </Button>
            </div>
          </div>
        </Modal>
      </PublicPageFrame>
    </PageTransition>
  );
}
