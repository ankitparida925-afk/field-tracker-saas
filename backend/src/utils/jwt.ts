import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET         = process.env.JWT_SECRET         || 'fieldtracker-saas-super-secret-jwt-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fieldtracker-saas-refresh-secret-2026';

export interface TokenPayload {
  userId:         string;
  email:          string;
  role:           'superadmin' | 'admin' | 'employee';
  organizationId: string;
  employeeId?:    string;
  tokenType:      'access' | 'refresh';
  [key: string]:  any;
}

/**
 * Signs a short-lived access token (15 minutes).
 */
export function signAccessToken(payload: Omit<TokenPayload, 'tokenType'>): string {
  return jwt.sign(
    { ...payload, tokenType: 'access' },
    JWT_SECRET,
    {
      expiresIn:  '15m',
      issuer:     'fieldtracker-innovations',
      audience:   'fti-client',
    }
  );
}

/**
 * Signs a long-lived refresh token (7 days).
 */
export function signRefreshToken(payload: Omit<TokenPayload, 'tokenType'>): string {
  return jwt.sign(
    { ...payload, tokenType: 'refresh' },
    JWT_REFRESH_SECRET,
    {
      expiresIn:  '7d',
      issuer:     'fieldtracker-innovations',
      audience:   'fti-client',
    }
  );
}

/**
 * Verifies an access token. Throws JwtVerificationError if invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer:   'fieldtracker-innovations',
    audience: 'fti-client',
  }) as TokenPayload;
}

/**
 * Verifies a refresh token. Throws JwtVerificationError if invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer:   'fieldtracker-innovations',
    audience: 'fti-client',
  }) as TokenPayload;
}
