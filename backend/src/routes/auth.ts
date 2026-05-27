/**
 * Auth Routes — FieldTracker Express Backend
 *
 * POST /api/auth/login          — Authenticate any user (superadmin / admin / employee)
 * POST /api/auth/logout         — Revoke refresh token & clear cookie
 * POST /api/auth/refresh        — Issue new access token using refresh token
 * POST /api/auth/setup-password — Employee first-login password setup
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import SuperAdmin   from '../models/SuperAdmin';
import Organization from '../models/Organization';
import Employee     from '../models/Employee';
import RevokedToken from '../models/RevokedToken';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass  = String(password).trim();

  try {
    // ── 1. Check Super Admin ──────────────────────────────────────────────────
    const superAdmin = await SuperAdmin.findOne({ email: cleanEmail });
    if (superAdmin) {
      const match = await bcrypt.compare(cleanPass, superAdmin.passwordHash);
      if (match) {
        const tokenPayload = {
          userId:         superAdmin.id,
          email:          superAdmin.email,
          role:           'superadmin' as const,
          organizationId: 'platform',
        };

        const accessToken  = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        // Persist refresh token expiry in DB (7 days)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Set httpOnly cookie
        res.cookie('fti_refresh_token', refreshToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path:     '/',
          maxAge:   7 * 24 * 60 * 60 * 1000,
        });

        res.json({
          accessToken,
          user: {
            id:               superAdmin.id,
            name:             superAdmin.name,
            email:            superAdmin.email,
            role:             'superadmin',
            organizationId:   'platform',
            organizationName: 'FieldTracker Platform',
          },
        });
        return;
      }
    }

    // ── 2. Check Organization Admin ───────────────────────────────────────────
    const org = await Organization.findOne({ adminEmail: cleanEmail });
    if (org) {
      const match = await bcrypt.compare(cleanPass, org.passwordHash);
      if (match) {
        if (org.status === 'SUSPENDED') {
          res.status(403).json({
            error: 'Your organization has been suspended by the platform Super Admin. Please contact billing/support.',
          });
          return;
        }

        const tokenPayload = {
          userId:         `admin-${org.id}`,
          email:          org.adminEmail,
          role:           'admin' as const,
          organizationId: org.id,
        };

        const accessToken  = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        res.cookie('fti_refresh_token', refreshToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path:     '/',
          maxAge:   7 * 24 * 60 * 60 * 1000,
        });

        res.json({
          accessToken,
          user: {
            id:               `admin-${org.id}`,
            name:             `${org.companyName} Admin`,
            email:            org.adminEmail,
            role:             'admin',
            organizationId:   org.id,
            organizationName: org.companyName,
          },
        });
        return;
      }
    }

    // ── 3. Check Employee ─────────────────────────────────────────────────────
    const employee = await Employee.findOne({ email: cleanEmail });
    if (employee) {
      // OTP match check (first-login flow)
      const isOtpMatch =
        !!(
          employee.otpCode &&
          cleanPass === employee.otpCode &&
          employee.otpExpiry &&
          new Date() < employee.otpExpiry
        );

      const passwordMatch = employee.needsPasswordSetup
        ? false
        : await bcrypt.compare(cleanPass, employee.passwordHash);

      if (passwordMatch || isOtpMatch) {
        const employeeOrg = await Organization.findOne({ id: employee.organizationId });

        if (employeeOrg && employeeOrg.status === 'SUSPENDED') {
          res.status(403).json({
            error: 'Your organization has been suspended by the platform Super Admin. Access is temporarily revoked.',
          });
          return;
        }

        const tokenPayload = {
          userId:         `user-${employee.id}`,
          email:          employee.email,
          role:           'employee' as const,
          organizationId: employee.organizationId,
          employeeId:     employee.id,
        };

        const accessToken  = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        res.cookie('fti_refresh_token', refreshToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path:     '/',
          maxAge:   7 * 24 * 60 * 60 * 1000,
        });

        res.json({
          accessToken,
          user: {
            id:                 `user-${employee.id}`,
            name:               employee.name,
            email:              employee.email,
            role:               'employee',
            employeeId:         employee.id,
            organizationId:     employee.organizationId,
            organizationName:   employeeOrg?.companyName ?? 'FieldTracker Innovations+',
            needsPasswordSetup: !!employee.needsPasswordSetup,
          },
        });
        return;
      }
    }

    // ── Generic 401 (prevents email enumeration) ──────────────────────────────
    res.status(401).json({ error: 'Invalid credentials.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.fti_refresh_token;

  if (refreshToken) {
    try {
      // Decode to get expiry without full verification (token might already be expired)
      const decoded = verifyRefreshToken(refreshToken) as any;
      const expiresAt = decoded.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RevokedToken.findOneAndUpdate(
        { token: refreshToken },
        { token: refreshToken, revokedAt: new Date(), expiresAt },
        { upsert: true, new: true }
      );
    } catch {
      // If token is already expired, still store it (TTL will clean it up)
      try {
        await RevokedToken.findOneAndUpdate(
          { token: refreshToken },
          { token: refreshToken, revokedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          { upsert: true }
        );
      } catch { /* silently ignore duplicate key */ }
    }
  }

  // Clear the cookie
  res.cookie('fti_refresh_token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   0,
  });

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.fti_refresh_token;

  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token.' });
    return;
  }

  // Check revocation blacklist
  const revoked = await RevokedToken.findOne({ token: refreshToken });
  if (revoked) {
    res.status(401).json({ error: 'Token has been revoked.' });
    return;
  }

  let payload: any;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
    return;
  }

  // Revoke old token (rotation strategy)
  try {
    await RevokedToken.findOneAndUpdate(
      { token: refreshToken },
      {
        token:     refreshToken,
        revokedAt: new Date(),
        expiresAt: new Date(payload.exp * 1000),
      },
      { upsert: true }
    );
  } catch { /* duplicate key on concurrent requests — safe to ignore */ }

  const tokenPayload = {
    userId:         payload.userId,
    email:          payload.email,
    role:           payload.role,
    organizationId: payload.organizationId,
    employeeId:     payload.employeeId,
  };

  const newAccessToken  = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);

  res.cookie('fti_refresh_token', newRefreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken: newAccessToken });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/setup-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/setup-password', async (req: Request, res: Response): Promise<void> => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    res.status(400).json({ error: 'Employee ID and password are required.' });
    return;
  }

  // Validate password strength
  if (String(password).length < 8) {
    res.status(422).json({ error: 'Password must be at least 8 characters.' });
    return;
  }
  if (!/[A-Z]/.test(String(password))) {
    res.status(422).json({ error: 'Password must contain at least one uppercase letter.' });
    return;
  }
  if (!/[0-9]/.test(String(password))) {
    res.status(422).json({ error: 'Password must contain at least one number.' });
    return;
  }

  try {
    const employee = await Employee.findOne({ id: employeeId });
    if (!employee) {
      res.status(404).json({ error: 'Employee profile not found.' });
      return;
    }

    if (!employee.needsPasswordSetup) {
      res.status(400).json({ error: 'Password has already been established for this account.' });
      return;
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    await Employee.updateOne(
      { id: employeeId },
      {
        $set: {
          passwordHash,
          needsPasswordSetup: false,
          otpCode:            undefined,
          otpExpiry:          undefined,
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Setup-password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

export default router;
