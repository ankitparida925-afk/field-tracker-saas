/**
 * POST /api/auth/register/org
 * ────────────────────────────
 * Registers a new organization. Hashes the password with bcrypt.
 * Validates: required fields, password complexity, unique email.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { seedStore, orgEmailExists, employeeEmailExists, addOrg, getAllOrgs } from '@/lib/store';

function validatePassword(pass: string): string | null {
  if (pass.length < 8)                        return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pass))                    return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pass))                    return 'Password must contain at least one number.';
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await seedStore();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, email, password, phone, industry, subscriptionPlan } = body;

  // Required field check
  if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Password complexity
  const passError = validatePassword(password);
  if (passError) {
    return NextResponse.json({ error: passError }, { status: 422 });
  }

  // Unique email check
  if (orgEmailExists(cleanEmail) || employeeEmailExists(cleanEmail)) {
    return NextResponse.json({ error: 'Email address is already registered.' }, { status: 409 });
  }

  const orgId       = `org-${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 12);

  const plan = (subscriptionPlan as any) || 'FREE_TRIAL';
  let limit = 5;
  if (plan === 'BASIC') limit = 15;
  else if (plan === 'PREMIUM') limit = 50;
  else if (plan === 'ENTERPRISE') limit = 100;

  addOrg({
    id:           orgId,
    name:         name.trim(),
    adminEmail:   cleanEmail,
    passwordHash,
    phone:        phone.trim(),
    industry:     industry?.trim() || 'Other',
    createdAt:    new Date(),
    subscriptionPlan: plan,
    employeeLimit: limit,
    status: 'ACTIVE',
  });

  // Return lightweight org list for client sync
  const publicOrgs = getAllOrgs().map(o => ({
    id:    o.id,
    name:  o.name,
    industry: o.industry,
  }));

  return NextResponse.json({ orgId, organizations: publicOrgs }, { status: 201 });
}

/**
 * GET /api/auth/register/org
 * ──────────────────────────
 * Returns the public list of organizations (name + id only) for the
 * Staff Sign Up dropdown. No sensitive data exposed.
 */
export async function GET(): Promise<NextResponse> {
  await seedStore();

  const publicOrgs = getAllOrgs().map(o => ({
    id:       o.id,
    name:     o.name,
    industry: o.industry,
  }));

  return NextResponse.json({ organizations: publicOrgs });
}
