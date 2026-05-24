/**
 * Next.js Edge Middleware — FieldTracker Innovations+ Security Layer
 *
 * Runs on every request to protected routes BEFORE the page renders.
 * Uses the Edge-compatible `jose` library (no Node.js crypto module).
 *
 * Protected routes:
 *  /admin/*   → requires valid JWT with role: 'admin'
 *  /employee/* → requires valid JWT with role: 'employee'
 *
 * Token source: Authorization header Bearer token
 * (sent by AppState.tsx on every page load from sessionStorage)
 *
 * On failure: redirects to /signin?reason=expired|unauthorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/jwt';

// Routes that require authentication
const PROTECTED_ROUTES: Record<string, 'admin' | 'employee'> = {
  '/admin':    'admin',
  '/employee': 'employee',
};

// Routes that are always public
const PUBLIC_ROUTES = ['/', '/signin', '/signup', '/api/auth'];

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Allow public routes and static assets through without any checks
  if (
    PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Determine required role for this path
  let requiredRole: 'admin' | 'employee' | null = null;
  for (const [route, role] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      requiredRole = role;
      break;
    }
  }

  // Unprotected route — allow through
  if (!requiredRole) return NextResponse.next();

  // ── Extract token from Authorization header ───────────────────────────────
  // The client sends: Authorization: Bearer <accessToken>
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Also check a custom header set by client-side navigation
  const clientToken = req.headers.get('x-access-token') ?? token;

  let payload: any = null;

  // 1. Try to verify the access token
  if (clientToken) {
    try {
      payload = await verifyAccessToken(clientToken);
    } catch {
      // Access token expired or invalid, fall back to refresh token
    }
  }

  // 2. Try to verify the refresh token cookie
  if (!payload) {
    const refreshToken = req.cookies.get('fti_refresh_token')?.value;
    if (refreshToken) {
      try {
        payload = await verifyRefreshToken(refreshToken);
      } catch {
        // Refresh token expired or invalid
      }
    }
  }

  // ── Verify the payload exists ─────────────────────────────────────────────
  if (!payload) {
    return redirectToSignIn(req, 'expired');
  }

  // Role-based access check
  if (payload.role !== requiredRole) {
    return redirectToSignIn(req, 'unauthorized');
  }

  // Inject identity headers for downstream use (API routes, server components)
  const res = NextResponse.next();
  res.headers.set('x-user-id',         payload.userId);
  res.headers.set('x-user-role',        payload.role);
  res.headers.set('x-organization-id',  payload.organizationId);
  if (payload.employeeId) {
    res.headers.set('x-employee-id', payload.employeeId);
  }

  // Add security headers to every response
  addSecurityHeaders(res);

  return res;
}

function redirectToSignIn(req: NextRequest, reason: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/signin';
  url.searchParams.set('reason', reason);
  url.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function addSecurityHeaders(res: NextResponse): void {
  res.headers.set('X-Frame-Options',           'DENY');
  res.headers.set('X-Content-Type-Options',    'nosniff');
  res.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy',        'geolocation=(self), camera=(self), microphone=(self)');
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      // Allow all tile providers + avatars + placeholders
      "img-src * data: blob:",
      // Allow all map tile + API connections
      "connect-src *",
      "frame-ancestors 'none'",
    ].join('; ')
  );
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/employee/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
