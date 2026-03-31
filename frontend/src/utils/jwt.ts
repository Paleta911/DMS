export type JwtPayload = {
  sub?: number;
  email?: string;
  role?: string;
  exp?: number;
};

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
