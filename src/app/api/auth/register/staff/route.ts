/**
 * POST /api/auth/register/staff
 * ──────────────────────────────
 * Registers a new field operative. Hashes the password with bcrypt.
 * Validates: required fields, password complexity, org exists, unique email.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  seedStore,
  orgEmailExists,
  employeeEmailExists,
  addEmployee,
  getOrgById,
} from '@/lib/store';

function validatePassword(pass: string): string | null {
  if (pass.length < 8)     return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
  return null;
}

const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
];

const COLOR_POOL = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export async function POST(req: NextRequest): Promise<NextResponse> {
  await seedStore();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, email, password, department, phone, organizationId } = body;

  if (!name?.trim() || !email?.trim() || !password || !phone?.trim() || !organizationId) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Password complexity
  const passError = validatePassword(password);
  if (passError) {
    return NextResponse.json({ error: passError }, { status: 422 });
  }

  // Org must exist
  if (!getOrgById(organizationId)) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
  }

  // Unique email check
  if (employeeEmailExists(cleanEmail) || orgEmailExists(cleanEmail)) {
    return NextResponse.json({ error: 'Email address is already registered.' }, { status: 409 });
  }

  const empId       = `emp-${Date.now()}`;
  const idx         = Math.floor(Math.random() * COLOR_POOL.length);
  const passwordHash = await bcrypt.hash(password, 12);

  addEmployee({
    id:             empId,
    name:           name.trim(),
    email:          cleanEmail,
    passwordHash,
    role:           `${(department || 'Field').trim()} Representative`,
    department:     (department || 'Field').trim(),
    phone:          phone.trim(),
    organizationId,
    avatar:         AVATAR_POOL[idx % AVATAR_POOL.length],
    color:          COLOR_POOL[idx],
  });

  return NextResponse.json({ employeeId: empId }, { status: 201 });
}
