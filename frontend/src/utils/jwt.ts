// JWT utility: safely decodes JWT token payload without verification
// Used for client-side token inspection (user info, expiration); full validation happens on backend
export type JwtPayload = {
  sub?: number;
  email?: string;
  role?: string;
  exp?: number;
};

// Decode JWT by parsing base64 payload (middle segment); handles URL-safe base64
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    // Replace URL-safe base64 chars with standard base64
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
