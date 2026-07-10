// Password security requirements: 8+ chars with mixed case (lower + upper) and digits, no spaces
export const PASSWORD_MIN_LENGTH = 8;

// Regex enforces at least 1 lowercase, 1 uppercase, 1 digit; no whitespace allowed
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/;

// User-facing error message in Spanish for policy violations
export const PASSWORD_POLICY_MESSAGE =
  'Debe tener mínimo 8 caracteres e incluir mayúscula, minúscula y número';
