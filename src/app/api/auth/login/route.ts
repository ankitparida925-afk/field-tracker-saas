/**
 * POST /api/auth/login
 * ────────────────────
 * Validates credentials, issues JWT access + refresh tokens.
 * Refresh token is set as an httpOnly Secure SameSite=Strict cookie.
 * Access token is returned in the JSON body.
 *
 * Security:
 *  • Rate-limited: 5 attempts / IP / minute
 *  • Generic 401 on failure (no email enumeration)
 *  • bcrypt password comparison (constant-time)
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import {
  seedStore,
  getOrgByEmail,
  getEmployeeByEmail,
  getOrgById,
  getSuperAdminByEmail,
  checkRateLimit,
} from '@/lib/store';

export async function POST(req: NextRequest): Promise<NextResponse> {
  await seedStore();

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1';
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait before trying again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let email: string, password: string;
  try {
    const body = await req.json();
    email    = (body.email    ?? '').trim().toLowerCase();
    password = (body.password ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // ── Check Super Admin credentials ─────────────────────────────────────────
  const superAdmin = getSuperAdminByEmail(email);
  if (superAdmin) {
    const passwordMatch = await bcrypt.compare(password, superAdmin.passwordHash);
    if (passwordMatch) {
      const tokenPayload = {
        userId:         superAdmin.id,
        email:          superAdmin.email,
        role:           'superadmin' as const,
        organizationId: 'platform',
      };

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(tokenPayload),
        signRefreshToken(tokenPayload),
      ]);

      const res = NextResponse.json({
        accessToken,
        user: {
          id:               tokenPayload.userId,
          name:             superAdmin.name,
          email:            superAdmin.email,
          role:             'superadmin',
          organizationId:   'platform',
          organizationName: 'FieldTracker Platform',
        },
      });

      res.cookies.set('fti_refresh_token', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path:     '/',
        maxAge:   60 * 60 * 24 * 7, // 7 days
      });

      return res;
    }
  }

  // ── Check Organization Admin credentials ──────────────────────────────────
  const org = getOrgByEmail(email);
  if (org) {
    const passwordMatch = await bcrypt.compare(password, org.passwordHash);
    if (passwordMatch) {
      // Security Check: Is the tenant suspended?
      if (org.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'Your organization has been suspended by the platform Super Admin. Please contact billing/support.' },
          { status: 403 }
        );
      }

      const tokenPayload = {
        userId:         `admin-${org.id}`,
        email:          org.adminEmail,
        role:           'admin' as const,
        organizationId: org.id,
      };

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(tokenPayload),
        signRefreshToken(tokenPayload),
      ]);

      const res = NextResponse.json({
        accessToken,
        user: {
          id:               tokenPayload.userId,
          name:             `${org.name} Admin`,
          email:            org.adminEmail,
          role:             'admin',
          organizationId:   org.id,
          organizationName: org.name,
        },
      });

      // httpOnly cookie — inaccessible to JS, sent automatically on future requests
      res.cookies.set('fti_refresh_token', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path:     '/',
        maxAge:   60 * 60 * 24 * 7, // 7 days
      });

      return res;
    }
  }

  // ── Check Employee credentials ────────────────────────────────────────────
  const employee = getEmployeeByEmail(email);
  if (employee) {
    const isOtpMatch = !!(employee.otpCode && password === employee.otpCode && employee.otpExpiry && Date.now() < employee.otpExpiry);
    const passwordMatch = await bcrypt.compare(password, employee.passwordHash);
    if (passwordMatch || isOtpMatch) {
      const employeeOrg = getOrgById(employee.organizationId);

      // Security Check: Is the tenant suspended?
      if (employeeOrg && employeeOrg.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'Your organization has been suspended by the platform Super Admin. Access is temporarily revoked.' },
          { status: 403 }
        );
      }

      const tokenPayload = {
        userId:         `user-${employee.id}`,
        email:          employee.email,
        role:           'employee' as const,
        organizationId: employee.organizationId,
        employeeId:     employee.id,
      };

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(tokenPayload),
        signRefreshToken(tokenPayload),
      ]);

      const res = NextResponse.json({
        accessToken,
        user: {
          id:               tokenPayload.userId,
          name:             employee.name,
          email:            employee.email,
          role:             'employee',
          employeeId:       employee.id,
          organizationId:   employee.organizationId,
          organizationName: employeeOrg?.name ?? 'FieldTracker Innovations+',
        },
      });

      res.cookies.set('fti_refresh_token', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path:     '/',
        maxAge:   60 * 60 * 24 * 7,
      });

      return res;
    }
  }

  // ── Generic failure (prevents email enumeration) ──────────────────────────
  return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
}
