// Account form validation schemas: password policy, person name normalization, age/phone constraints
// Enforces Spanish naming conventions (lowercase connectors), sanitizes input patterns
import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  USER_REQUESTED_AREA_MAX_LENGTH,
} from "../../constants/fieldLimits";

// Password must have 8+ chars with mixed case and digits (no spaces)
export const passwordPolicyMessage =
  "Debe tener mínimo 8 caracteres e incluir mayúscula, minúscula y número";
export const adultAgeMessage = "Debes tener al menos 18 años";
export const maxAgeMessage = "No se permiten mayores de 85 años";
// Allow accented Spanish characters, space-separated words only
export const personNamePattern =
  /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+(?: [A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+)*$/;
export const phoneOnlyPattern = new RegExp(`^\\d{0,${USER_PHONE_MAX_LENGTH}}$`);
export const phoneOnlyMessage = `Solo se permiten hasta ${USER_PHONE_MAX_LENGTH} números`;
const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/;
// Spanish language connectors that should remain lowercase in names
const lowercaseConnectors = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "e",
  "da",
  "das",
  "di",
  "do",
  "dos",
  "van",
  "von",
]);

// Input sanitizer: remove non-letter/accent chars, collapse whitespace, trim
export const sanitizePersonNameInput = (value: string) =>
  value
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÜüÑñ ]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ +/g, "")
    .slice(0, USER_NAME_MAX_LENGTH);

const normalizePersonNameWord = (word: string, index: number) => {
  if (!word) {
    return "";
  }
  const lowercasedWord = word.toLocaleLowerCase("es-MX");
  if (index > 0 && lowercaseConnectors.has(lowercasedWord)) {
    return lowercasedWord;
  }
  return `${lowercasedWord[0]?.toLocaleUpperCase("es-MX") ?? ""}${lowercasedWord.slice(1)}`;
};

export const normalizePersonName = (value: string | undefined) =>
  sanitizePersonNameInput(value ?? "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(normalizePersonNameWord)
    .join(" ");

export const sanitizePhoneOnly = (value: string) =>
  value.replace(/\D/g, "").slice(0, USER_PHONE_MAX_LENGTH);

export const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const shiftYears = (baseDate: Date, years: number) => {
  const date = new Date(baseDate);
  date.setFullYear(date.getFullYear() - years);
  return date;
};

export const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

export const getBirthDateBounds = (today = new Date()) => ({
  maxBirthDate: toDateInputValue(shiftYears(today, 18)),
  minBirthDate: toDateInputValue(shiftYears(today, 85)),
});

const buildNameSchema = (requiredMessage: string) =>
  z
    .string()
    .refine((value) => normalizePersonName(value).length >= 2, requiredMessage)
    .refine(
      (value) => normalizePersonName(value).length <= USER_NAME_MAX_LENGTH,
      `Máximo ${USER_NAME_MAX_LENGTH} caracteres`,
    )
    .refine(
      (value) => personNamePattern.test(normalizePersonName(value)),
      "Solo se permiten letras y espacios",
    );

const optionalNameSchema = z
  .string()
  .optional()
  .refine((value) => {
    const normalizedValue = normalizePersonName(value);
    return (
      !normalizedValue ||
      (normalizedValue.length <= USER_NAME_MAX_LENGTH &&
        personNamePattern.test(normalizedValue))
    );
  }, `Solo se permiten letras y espacios. Máximo ${USER_NAME_MAX_LENGTH} caracteres`);

const buildBaseAccountSchema = () =>
  z
    .object({
      nombre: buildNameSchema("Nombre requerido"),
      primerApellido: buildNameSchema("Primer apellido requerido"),
      segundoApellido: optionalNameSchema,
      areaCode: z.string().optional(),
      useCustomArea: z.boolean(),
      requestedAreaNombre: z
        .string()
        .max(
          USER_REQUESTED_AREA_MAX_LENGTH,
          `Máximo ${USER_REQUESTED_AREA_MAX_LENGTH} caracteres`,
        )
        .optional(),
      telefono: z
        .string()
        .optional()
        .refine(
          (value) => !value || phoneOnlyPattern.test(value),
          phoneOnlyMessage,
        ),
      fechaNacimiento: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const areaCode = data.areaCode?.trim() ?? "";
      const requestedAreaNombre = data.requestedAreaNombre?.trim() ?? "";

      if (!data.useCustomArea && !areaCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["areaCode"],
          message: "Área requerida",
        });
      }

      if (data.useCustomArea && requestedAreaNombre.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedAreaNombre"],
          message: "Escribe tu área",
        });
      }

      if (!data.fechaNacimiento) {
        return;
      }

      const birthDate = parseDateOnly(data.fechaNacimiento);
      const { maxBirthDate, minBirthDate } = getBirthDateBounds();
      const maxBirthDateValue = parseDateOnly(maxBirthDate);
      const minBirthDateValue = parseDateOnly(minBirthDate);

      if (!birthDate || !maxBirthDateValue || !minBirthDateValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fechaNacimiento"],
          message: "Fecha de nacimiento inválida",
        });
        return;
      }

      if (birthDate > maxBirthDateValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fechaNacimiento"],
          message: adultAgeMessage,
        });
        return;
      }

      if (birthDate < minBirthDateValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fechaNacimiento"],
          message: maxAgeMessage,
        });
      }
    });

export const registerSchema = buildBaseAccountSchema()
  .extend({
    email: z
      .string()
      .max(USER_EMAIL_MAX_LENGTH, `Máximo ${USER_EMAIL_MAX_LENGTH} caracteres`)
      .email("Correo inválido"),
    password: z
      .string()
      .min(8, passwordPolicyMessage)
      .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)
      .regex(passwordPolicy, passwordPolicyMessage),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const profileSchemaShape = buildBaseAccountSchema().extend({
  currentPassword: z
    .string()
    .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)
    .optional(),
  password: z
    .string()
    .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)
    .refine(
      (value) => !value || (value.length >= 8 && passwordPolicy.test(value)),
      passwordPolicyMessage,
    )
    .optional(),
  confirmPassword: z
    .string()
    .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)
    .optional(),
});

export const profileSchema = profileSchemaShape.superRefine((data, ctx) => {
  const currentPassword = data.currentPassword;
  const password = data.password;
  const confirmPassword = data.confirmPassword;
  const wantsPasswordChange = Boolean(
    currentPassword || password || confirmPassword,
  );

  if (!wantsPasswordChange) {
    return;
  }

  if (!currentPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentPassword"],
      message: "Escribe tu contraseña actual",
    });
  }

  if (!password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "Escribe tu nueva contraseña",
    });
  }

  if (!confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Confirma tu nueva contraseña",
    });
  }

  if (password && confirmPassword && password !== confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Las contraseñas no coinciden",
    });
  }
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
