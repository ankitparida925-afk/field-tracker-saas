/**
 * POST /api/auth/logout
 * ─────────────────────
 * Revokes the refresh token and clears the httpOnly cookie.
 * The client is responsible for clearing the access token from sessionStorage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revokeToken } from '@/lib/store';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get('fti_refresh_token')?.value;

  if (refreshToken) {
    revokeToken(refreshToken); // Blacklist it
  }

  const res = NextResponse.json({ success: true });

  // Clear the cookie
  res.cookies.set('fti_refresh_token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   0, // Expire immediately
  });

  return res;
}
