/**
 * Register Routes — FieldTracker Express Backend
 *
 * POST   /api/auth/register/org        — Register a new organization
 * GET    /api/auth/register/org        — List public organizations (for staff signup dropdown)
 * POST   /api/auth/register/staff      — Register a new employee (admin only)
 * DELETE /api/auth/register/staff/:id  — Delete an employee (admin only)
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware';
import Organization from '../models/Organization';
import Employee     from '../models/Employee';

const router = Router();

const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
];

const COLOR_POOL = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

function validatePassword(pass: string): string | null {
  if (pass.length < 8)     return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register/org — Create a new organization
// ─────────────────────────────────────────────────────────────────────────────
router.post('/org', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone, industry, subscriptionPlan } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const passError = validatePassword(String(password));
  if (passError) {
    res.status(422).json({ error: passError });
    return;
  }

  try {
    // Unique email check across orgs
    const existingOrg = await Organization.findOne({ adminEmail: cleanEmail });
    const existingEmp = await Employee.findOne({ email: cleanEmail });

    if (existingOrg || existingEmp) {
      res.status(409).json({ error: 'Email address is already registered.' });
      return;
    }

    const plan  = subscriptionPlan || 'FREE_TRIAL';
    let   limit = 5;
    if (plan === 'BASIC')       limit = 15;
    else if (plan === 'PREMIUM')     limit = 50;
    else if (plan === 'ENTERPRISE')  limit = 100;

    const orgId       = `org-${Date.now()}`;
    const passwordHash = await bcrypt.hash(String(password), 12);

    await Organization.create({
      id:               orgId,
      companyName:      name.trim(),
      adminEmail:       cleanEmail,
      passwordHash,
      phone:            phone.trim(),
      industry:         industry?.trim() || 'Other',
      subscriptionPlan: plan,
      employeeLimit:    limit,
      status:           'ACTIVE',
    });

    // Return lightweight org list for client sync
    const allOrgs = await Organization.find({}, 'id companyName industry');
    const publicOrgs = allOrgs.map(o => ({ id: o.id, name: o.companyName, industry: o.industry }));

    res.status(201).json({ orgId, organizations: publicOrgs });
  } catch (err) {
    console.error('Register org error:', err);
    res.status(500).json({ error: 'Failed to register organization.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/register/org — List public organizations (for staff signup dropdown)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/org', async (_req: Request, res: Response): Promise<void> => {
  try {
    const allOrgs = await Organization.find({}, 'id companyName industry');
    const publicOrgs = allOrgs.map(o => ({ id: o.id, name: o.companyName, industry: o.industry }));
    res.json({ organizations: publicOrgs });
  } catch (err) {
    console.error('Get orgs error:', err);
    res.status(500).json({ error: 'Failed to retrieve organizations.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register/staff — Create a new employee (admin required)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/staff', verifyToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, email, department, phone, organizationId, employeeCode, assignedManagerId, isManager } = req.body;

  if (!name?.trim() || !email?.trim() || !phone?.trim() || !organizationId) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    // Org must exist
    const org = await Organization.findOne({ id: organizationId });
    if (!org) {
      res.status(404).json({ error: 'Organization not found.' });
      return;
    }

    // Unique email check
    const existingEmp = await Employee.findOne({ email: cleanEmail });
    const existingOrg = await Organization.findOne({ adminEmail: cleanEmail });
    if (existingEmp || existingOrg) {
      res.status(409).json({ error: 'Email address is already registered.' });
      return;
    }

    const empId = `emp-${Date.now()}`;
    const idx   = Math.floor(Math.random() * COLOR_POOL.length);

    // Random complex temp password (never used — OTP flow supersedes it)
    const randomPass   = Math.random().toString(36).slice(-12) + 'A1!';
    const passwordHash = await bcrypt.hash(randomPass, 12);

    const otpCode  = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`
========================================================================
📧 [SIMULATED SMTP EMAIL DISPATCH]
To: ${cleanEmail}
Subject: [FieldTracker] Your Secure One-Time Passcode (OTP)
------------------------------------------------------------------------
Hello ${name.trim()},

Your One-Time Passcode for first login: ${otpCode}
This OTP expires in 10 minutes.
========================================================================
    `);

    await Employee.create({
      id:             empId,
      name:           name.trim(),
      email:          cleanEmail,
      passwordHash,
      role:           isManager
        ? 'Field Operations Manager'
        : `${(department || 'Field').trim()} Representative`,
      department:     (department || 'Field').trim(),
      phone:          phone.trim(),
      organizationId,
      avatar:         AVATAR_POOL[idx % AVATAR_POOL.length],
      color:          COLOR_POOL[idx],
      employeeCode:   employeeCode || `EMP-${Math.floor(Math.random() * 9000) + 1000}`,
      assignedManagerId: assignedManagerId || undefined,
      isManager:      !!isManager,
      isActive:       true,
      otpCode,
      otpExpiry,
      needsPasswordSetup: true,
    });

    res.status(201).json({ employeeId: empId, otpCode });
  } catch (err) {
    console.error('Register staff error:', err);
    res.status(500).json({ error: 'Failed to register employee.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/register/staff/:id — Delete an employee (admin required)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/staff/:id', verifyToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: 'Employee ID is required.' });
    return;
  }

  try {
    const emp = await Employee.findOne({ id });
    if (!emp) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    await Employee.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Failed to delete employee.' });
  }
});

export default router;
