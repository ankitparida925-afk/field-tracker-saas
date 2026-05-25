/**
 * JWT utilities — FieldTracker Innovations+ Security Layer
 * Uses `jose` which is compatible with Next.js Edge middleware runtime.
 *
 * Token strategy:
 *  • Access Token  — HS256, 15 minutes, stored in sessionStorage
 *  • Refresh Token — HS256, 7 days,    stored in httpOnly cookie (set by server)
 */

import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose';

// ── Secret keys ──────────────────────────────────────────────────────────────
// In a real deployment these would come from environment variables:
//   process.env.JWT_ACCESS_SECRET
//   process.env.JWT_REFRESH_SECRET
const ACCESS_SECRET  = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET  ?? 'fti-access-secret-key-32-chars!!'
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? 'fti-refresh-secret-key-32-chars!'
);

export interface TokenPayload extends JWTPayload {
  userId:         string;
  email:          string;
  role:           'superadmin' | 'admin' | 'employee';
  organizationId: string;
  employeeId?:    string;
  tokenType:      'access' | 'refresh';
}

// ── Sign access token (15 min) ────────────────────────────────────────────────
export async function signAccessToken(payload: Omit<TokenPayload, 'tokenType'>): Promise<string> {
  return new SignJWT({ ...payload, tokenType: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setIssuer('fieldtracker-innovations')
    .setAudience('fti-client')
    .sign(ACCESS_SECRET);
}

// ── Sign refresh token (7 days) ───────────────────────────────────────────────
export async function signRefreshToken(payload: Omit<TokenPayload, 'tokenType'>): Promise<string> {
  return new SignJWT({ ...payload, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer('fieldtracker-innovations')
    .setAudience('fti-client')
    .sign(REFRESH_SECRET);
}

// ── Verify access token (used by middleware + API routes) ─────────────────────
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    issuer:   'fieldtracker-innovations',
    audience: 'fti-client',
  });
  return payload as TokenPayload;
}

// ── Verify refresh token (used by /api/auth/refresh only) ────────────────────
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET, {
    issuer:   'fieldtracker-innovations',
    audience: 'fti-client',
  });
  return payload as TokenPayload;
}

// ── Decode without verifying (safe for client-side display only) ──────────────
export function decodeTokenUnsafe(token: string): TokenPayload | null {
  try {
    return decodeJwt(token) as TokenPayload;
  } catch {
    return null;
  }
}

// ── Check if a token is expired (client-side, no secret needed) ──────────────
export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenUnsafe(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

// ── Milliseconds until a token expires ───────────────────────────────────────
export function msUntilExpiry(token: string): number {
  const payload = decodeTokenUnsafe(token);
  if (!payload?.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}
