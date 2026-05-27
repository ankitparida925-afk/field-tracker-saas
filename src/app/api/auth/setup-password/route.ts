/**
 * POST /api/auth/setup-password
 * ──────────────────────────────
 * Allows employees to establish their secure standard password on first login.
 * Hashes the new password with bcrypt, marks needsPasswordSetup as false,
 * and invalidates the temporary OTP codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getEmployeeById, seedStore } from '@/lib/store';

function validatePassword(pass: string): string | null {
  if (pass.length < 8)     return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await seedStore();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { employeeId, password } = body;

  if (!employeeId || !password) {
    return NextResponse.json({ error: 'Employee ID and password are required.' }, { status: 400 });
  }

  const employee = getEmployeeById(employeeId);
  if (!employee) {
    return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
  }

  if (!employee.needsPasswordSetup) {
    return NextResponse.json({ error: 'Password has already been established for this account.' }, { status: 400 });
  }

  // Validate password strength
  const passError = validatePassword(password);
  if (passError) {
    return NextResponse.json({ error: passError }, { status: 422 });
  }

  // Hash new password and update database
  const passwordHash = await bcrypt.hash(password, 12);
  employee.passwordHash = passwordHash;
  employee.needsPasswordSetup = false;
  
  // Invalidate OTP
  employee.otpCode = undefined;
  employee.otpExpiry = undefined;

  return NextResponse.json({ success: true }, { status: 200 });
}
