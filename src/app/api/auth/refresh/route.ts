/**
 * POST /api/auth/refresh
 * ──────────────────────
 * Reads the httpOnly refreshToken cookie, verifies it,
 * issues a new access token, and rotates the refresh token
 * (prevents replay attacks on stolen cookies).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} from '@/lib/jwt';
import { seedStore, isTokenRevoked, revokeToken } from '@/lib/store';

export async function POST(req: NextRequest): Promise<NextResponse> {
  await seedStore();

  const refreshToken = req.cookies.get('fti_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token.' }, { status: 401 });
  }

  // Check revocation blacklist
  if (isTokenRevoked(refreshToken)) {
    return NextResponse.json({ error: 'Token has been revoked.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired refresh token.' }, { status: 401 });
  }

  // Revoke the old refresh token (rotation)
  revokeToken(refreshToken);

  const tokenPayload = {
    userId:         payload.userId,
    email:          payload.email,
    role:           payload.role,
    organizationId: payload.organizationId,
    employeeId:     payload.employeeId,
  };

  const [newAccessToken, newRefreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken(tokenPayload),
  ]);

  const res = NextResponse.json({ accessToken: newAccessToken });

  // Set the new rotated refresh token
  res.cookies.set('fti_refresh_token', newRefreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   60 * 60 * 24 * 7,
  });

  return res;
}
