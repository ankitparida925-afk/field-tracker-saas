/**
 * In-Memory Credential Store — FieldTracker Innovations+ Security Layer
 *
 * Acts as the server-side "database" for this demo application.
 * In production this would be replaced by PostgreSQL / Prisma.
 *
 * Seeded with:
 *  • Default org: FieldTracker Innovations+ (admin@fti.com)
 *  • 4 default employees: Rahul, Sarah, Amit, Carlos
 *
 * All passwords are stored as bcrypt hashes (cost 12).
 */

import bcrypt from 'bcryptjs';

export interface StoredOrg {
  id:               string;
  name:             string;
  adminEmail:       string;
  passwordHash:     string;
  phone:            string;
  industry:         string;
  createdAt:        Date;
  subscriptionPlan: 'FREE_TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  employeeLimit:    number;
  status:           'ACTIVE' | 'SUSPENDED';
}

export interface StoredEmployee {
  id:             string;
  name:           string;
  email:          string;
  passwordHash:   string;
  role:           string;
  department:     string;
  phone:          string;
  organizationId: string;
  avatar:         string;
  color:          string;
}

export interface StoredSuperAdmin {
  id:           string;
  name:         string;
  email:        string;
  passwordHash: string;
  role:         'superadmin';
}

export interface StoredAnnouncement {
  id:        string;
  title:     string;
  message:   string;
  type:      'info' | 'warning' | 'alert' | 'maintenance';
  createdAt: Date;
}

// ── Global singletons — survive HMR and cross-route module isolation ──────────
// Next.js Turbopack instantiates separate module contexts per API route worker.
// Attaching stores to globalThis ensures all routes share the same live data.
declare global {
  var __ftiOrgs: Map<string, StoredOrg> | undefined;
  var __ftiEmployees: Map<string, StoredEmployee> | undefined;
  var __ftiSuperAdmins: Map<string, StoredSuperAdmin> | undefined;
  var __ftiAnnouncements: StoredAnnouncement[] | undefined;
  var __ftiRevoked: Set<string> | undefined;
  var __ftiRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
  var __ftiSeeded: boolean | undefined;
}

const orgs          = (globalThis.__ftiOrgs      ??= new Map<string, StoredOrg>());
const employees     = (globalThis.__ftiEmployees ??= new Map<string, StoredEmployee>());
const superAdmins   = (globalThis.__ftiSuperAdmins ??= new Map<string, StoredSuperAdmin>());
const announcements = (globalThis.__ftiAnnouncements ??= [] as StoredAnnouncement[]);
const revokedTokens = (globalThis.__ftiRevoked   ??= new Set<string>());
const loginAttempts = (globalThis.__ftiRateLimit ??= new Map<string, { count: number; resetAt: number }>());

// ── Seed default data ─────────────────────────────────────────────────────────
export async function seedStore(): Promise<void> {
  if (globalThis.__ftiSeeded && superAdmins.size > 0) return;
  globalThis.__ftiSeeded = true;

  // Default Super Admin
  superAdmins.set('super-1', {
    id:           'super-1',
    name:         'SaaS Owner',
    email:        'superadmin@fieldtracker.com',
    passwordHash: await bcrypt.hash('superadmin123', 12),
    role:         'superadmin',
  });

  // Default orgs
  orgs.set('org-fti', {
    id:               'org-fti',
    name:             'FieldTracker Innovations+',
    adminEmail:       'admin@fti.com',
    passwordHash:     await bcrypt.hash('admin123', 12),
    phone:            '+1 (555) 900-1200',
    industry:         'Software & Telemetry',
    createdAt:        new Date('2026-01-01'),
    subscriptionPlan: 'ENTERPRISE',
    employeeLimit:    100,
    status:           'ACTIVE',
  });

  orgs.set('org-apex', {
    id:               'org-apex',
    name:             'Apex Logistics Solutions',
    adminEmail:       'admin@apex.com',
    passwordHash:     await bcrypt.hash('admin123', 12),
    phone:            '+1 (555) 321-4567',
    industry:         'Transport & Shipping',
    createdAt:        new Date('2026-03-15'),
    subscriptionPlan: 'PREMIUM',
    employeeLimit:    50,
    status:           'ACTIVE',
  });

  orgs.set('org-med', {
    id:               'org-med',
    name:             'MedVitals Pharma Distribution',
    adminEmail:       'admin@medvitals.com',
    passwordHash:     await bcrypt.hash('admin123', 12),
    phone:            '+1 (555) 987-6543',
    industry:         'Healthcare & Pharma',
    createdAt:        new Date('2026-04-10'),
    subscriptionPlan: 'BASIC',
    employeeLimit:    15,
    status:           'SUSPENDED', // demo suspension
  });

  // Default employees
  const defaults = [
    { id: 'emp-1', name: 'Rahul Sharma',  email: 'rahul@fti.com',  pass: 'rahul123',  dept: 'Sales & Marketing',       role: 'Enterprise Sales Lead', phone: '+1 (555) 019-2834', color: '#3b82f6', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', orgId: 'org-fti' },
    { id: 'emp-2', name: 'Sarah Jenkins', email: 'sarah@fti.com',  pass: 'sarah123',  dept: 'Pharmaceuticals',          role: 'Pharma Field Specialist', phone: '+1 (555) 238-4910', color: '#10b981', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', orgId: 'org-fti' },
    { id: 'emp-3', name: 'Amit Patel',    email: 'amit@fti.com',   pass: 'amit123',   dept: 'Logistics Operations',     role: 'Last-Mile Delivery Lead', phone: '+1 (555) 402-8821', color: '#f59e0b', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', orgId: 'org-fti' },
    { id: 'emp-4', name: 'Carlos Ruiz',   email: 'carlos@fti.com', pass: 'carlos123', dept: 'Maintenance & Service',    role: 'HVAC Service Expert',     phone: '+1 (555) 781-3342', color: '#8b5cf6', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', orgId: 'org-fti' },
    
    // Apex employees
    { id: 'emp-apex-1', name: 'Danielle Brooks', email: 'danielle@apex.com', pass: 'danielle123', dept: 'Operations', role: 'Freight Driver', phone: '+1 (555) 303-1290', color: '#ec4899', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', orgId: 'org-apex' },
    { id: 'emp-apex-2', name: 'James Carter',    email: 'james@apex.com',    pass: 'james123',    dept: 'Logistics',  role: 'Fleet Supervisor', phone: '+1 (555) 404-9811', color: '#06b6d4', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', orgId: 'org-apex' }
  ];

  for (const d of defaults) {
    employees.set(d.id, {
      id:             d.id,
      name:           d.name,
      email:          d.email,
      passwordHash:   await bcrypt.hash(d.pass, 12),
      role:           d.role,
      department:     d.dept,
      phone:          d.phone,
      organizationId: d.orgId,
      avatar:         d.avatar,
      color:          d.color,
    });
  }

  // Seed default platform announcements
  announcements.push({
    id: 'ann-1',
    title: 'Platform Maintenance Scheduled',
    message: 'System upgrade on Sunday, May 31 at 02:00 UTC. Expect 15 mins of intermittent telemetry delays.',
    type: 'maintenance',
    createdAt: new Date('2026-05-24'),
  });
}

// ── Super Admin helpers ────────────────────────────────────────────────────────
export function getSuperAdminByEmail(email: string): StoredSuperAdmin | undefined {
  for (const superUser of superAdmins.values()) {
    if (superUser.email.toLowerCase() === email.toLowerCase()) return superUser;
  }
  return undefined;
}

// ── Org helpers ───────────────────────────────────────────────────────────────
export function getOrgByEmail(email: string): StoredOrg | undefined {
  for (const org of orgs.values()) {
    if (org.adminEmail.toLowerCase() === email.toLowerCase()) return org;
  }
  return undefined;
}

export function getOrgById(id: string): StoredOrg | undefined {
  return orgs.get(id);
}

export function getAllOrgs(): StoredOrg[] {
  return [...orgs.values()];
}

export function addOrg(org: StoredOrg): void {
  orgs.set(org.id, org);
}

export function updateOrg(id: string, updates: Partial<Omit<StoredOrg, 'id' | 'createdAt'>>): boolean {
  const org = orgs.get(id);
  if (!org) return false;
  orgs.set(id, { ...org, ...updates });
  return true;
}

export function deleteOrg(id: string): boolean {
  // Also delete employees of this org
  const orgEmployees = getEmployeesByOrg(id);
  orgEmployees.forEach(emp => employees.delete(emp.id));
  return orgs.delete(id);
}

export function setOrgStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): boolean {
  const org = orgs.get(id);
  if (!org) return false;
  org.status = status;
  return true;
}

export function orgEmailExists(email: string): boolean {
  return !!getOrgByEmail(email);
}

// ── Announcement Helpers ──────────────────────────────────────────────────────
export function getAnnouncements(): StoredAnnouncement[] {
  return announcements;
}

export function addAnnouncement(ann: Omit<StoredAnnouncement, 'id' | 'createdAt'>): StoredAnnouncement {
  const newAnn: StoredAnnouncement = {
    ...ann,
    id: `ann-${Date.now()}`,
    createdAt: new Date()
  };
  announcements.push(newAnn);
  return newAnn;
}

// ── Employee helpers ──────────────────────────────────────────────────────────
export function getEmployeeByEmail(email: string): StoredEmployee | undefined {
  for (const emp of employees.values()) {
    if (emp.email.toLowerCase() === email.toLowerCase()) return emp;
  }
  return undefined;
}

export function getEmployeeById(id: string): StoredEmployee | undefined {
  return employees.get(id);
}

export function getEmployeesByOrg(orgId: string): StoredEmployee[] {
  return [...employees.values()].filter(e => e.organizationId === orgId);
}

export function addEmployee(emp: StoredEmployee): void {
  employees.set(emp.id, emp);
}

export function employeeEmailExists(email: string): boolean {
  return !!getEmployeeByEmail(email);
}

// ── Token revocation ──────────────────────────────────────────────────────────
export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const WINDOW_MS = 60_000; // 1 minute
  const MAX_ATTEMPTS = 5;

  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  entry.count++;

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
