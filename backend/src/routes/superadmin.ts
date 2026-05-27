import { Router, Request, Response } from 'express';
import { verifyToken, requireSuperAdmin } from '../middleware/authMiddleware';
import Organization from '../models/Organization';
import Employee from '../models/Employee';
import Announcement from '../models/Announcement';
import bcrypt from 'bcryptjs';

const router = Router();

// GET /api/superadmin
// Returns statistics and lists of organizations + announcements
router.get('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const allOrgs = await Organization.find({});
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });

    let totalEmployees = 0;
    let activeEmployees = 0;
    let basicCount = 0;
    let premiumCount = 0;
    let enterpriseCount = 0;
    let freeTrialCount = 0;

    const orgsList = [];

    for (const org of allOrgs) {
      const count = await Employee.countDocuments({ organizationId: org.id });
      totalEmployees += count;
      if (org.status === 'ACTIVE') {
        activeEmployees += count;
      }

      if (org.subscriptionPlan === 'BASIC') basicCount++;
      else if (org.subscriptionPlan === 'PREMIUM') premiumCount++;
      else if (org.subscriptionPlan === 'ENTERPRISE') enterpriseCount++;
      else freeTrialCount++;

      orgsList.push({
        id: org.id,
        name: org.companyName,
        adminEmail: org.adminEmail,
        phone: org.phone,
        industry: org.industry,
        createdAt: org.createdAt,
        subscriptionPlan: org.subscriptionPlan,
        employeeLimit: org.employeeLimit,
        activeEmployees: count,
        status: org.status
      });
    }

    // Monthly Recurring Revenue estimation
    const mrr = (basicCount * 49) + (premiumCount * 99) + (enterpriseCount * 249);

    const stats = {
      totalOrganizations: allOrgs.length,
      activeOrganizations: allOrgs.filter(o => o.status === 'ACTIVE').length,
      suspendedOrganizations: allOrgs.filter(o => o.status === 'SUSPENDED').length,
      totalEmployees,
      activeEmployees,
      activeTrackingSessions: 3, // Default active tracking simulation
      estimatedMRR: mrr,
      dailyActiveUsers: Math.round(activeEmployees * 0.8 + allOrgs.length),
      subscriptionStats: {
        FREE_TRIAL: freeTrialCount,
        BASIC: basicCount,
        PREMIUM: premiumCount,
        ENTERPRISE: enterpriseCount
      }
    };

    res.json({ stats, organizations: orgsList, announcements });
  } catch (error) {
    console.error('Super Admin GET error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// POST /api/superadmin
// Handles action: 'createOrg' OR action: 'announcement'
router.post('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { action } = req.body;

    if (action === 'announcement') {
      const { title, message, type } = req.body;
      if (!title || !message || !type) {
        res.status(400).json({ error: 'Title, message, and type are required for announcements.' });
        return;
      }

      const ann = await Announcement.create({
        id: `ann-${Date.now()}`,
        title,
        message,
        type,
        createdAt: new Date()
      });
      res.json({ success: true, announcement: ann });
      return;
    }

    // Default action: createOrg
    const { name, adminEmail, password, phone, industry, subscriptionPlan, employeeLimit } = req.body;
    if (!name || !adminEmail || !password || !phone || !industry || !subscriptionPlan || !employeeLimit) {
      res.status(400).json({ error: 'Missing required organization fields.' });
      return;
    }

    // Check email uniqueness
    const existingOrg = await Organization.findOne({ adminEmail: adminEmail.trim().toLowerCase() });
    const existingEmp = await Employee.findOne({ email: adminEmail.trim().toLowerCase() });
    if (existingOrg || existingEmp) {
      res.status(409).json({ error: 'An organization or employee with this email already exists.' });
      return;
    }

    const orgId = `org-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 12);

    await Organization.create({
      id: orgId,
      companyName: name,
      adminEmail: adminEmail.trim().toLowerCase(),
      passwordHash,
      phone,
      industry,
      createdAt: new Date(),
      subscriptionPlan,
      employeeLimit: parseInt(employeeLimit, 10),
      status: 'ACTIVE'
    });

    res.json({ success: true, orgId });
  } catch (error) {
    console.error('Super Admin POST error:', error);
    res.status(500).json({ error: 'Failed to complete requested action' });
  }
});

// PUT /api/superadmin
// Updates organization status, subscription plan, details, or employee limit
router.put('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, industry, subscriptionPlan, employeeLimit, status, phone } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Organization ID is required for updates.' });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.companyName = name;
    if (industry !== undefined) updates.industry = industry;
    if (subscriptionPlan !== undefined) updates.subscriptionPlan = subscriptionPlan;
    if (employeeLimit !== undefined) updates.employeeLimit = parseInt(employeeLimit, 10);
    if (status !== undefined) updates.status = status;
    if (phone !== undefined) updates.phone = phone;

    const org = await Organization.findOneAndUpdate({ id }, { $set: updates }, { new: true });
    if (!org) {
      res.status(404).json({ error: 'Organization not found.' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Super Admin PUT error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// DELETE /api/superadmin
// Deletes organization and its employees entirely
router.delete('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.query.id as string;

    if (!id) {
      res.status(400).json({ error: 'Organization ID is required for deletion.' });
      return;
    }

    const org = await Organization.findOne({ id });
    if (!org) {
      res.status(404).json({ error: 'Organization not found.' });
      return;
    }

    // Delete all employees associated with the organization
    await Employee.deleteMany({ organizationId: id });
    await Organization.deleteOne({ id });

    res.json({ success: true });
  } catch (error) {
    console.error('Super Admin DELETE error:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// DELETE /api/superadmin/announcements/:id
router.delete('/announcements/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await Announcement.deleteOne({ id });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Announcement not found.' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Super Admin Delete Announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
