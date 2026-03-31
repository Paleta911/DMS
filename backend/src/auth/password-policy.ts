export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/;

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir mayúscula, minúscula y número';
