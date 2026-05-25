import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyAccessToken } from '@/lib/jwt';
import {
  seedStore,
  getAllOrgs,
  getEmployeesByOrg,
  addOrg,
  updateOrg,
  deleteOrg,
  getAnnouncements,
  addAnnouncement,
  orgEmailExists
} from '@/lib/store';

// Helper to authenticate Super Admin
async function authenticateSuperAdmin(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (payload.role !== 'superadmin') {
      return null;
    }
    return payload;
  } catch (err) {
    console.error('Super Admin auth error:', err);
    return null;
  }
}

// GET /api/superadmin
// Returns statistics and lists of organizations + announcements
export async function GET(req: NextRequest) {
  await seedStore();
  const auth = await authenticateSuperAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
  }

  try {
    const allOrgs = getAllOrgs();
    const announcements = getAnnouncements();

    // Calculate detailed stats
    let totalEmployees = 0;
    let activeEmployees = 0;
    let basicCount = 0;
    let premiumCount = 0;
    let enterpriseCount = 0;
    let freeTrialCount = 0;

    const orgsList = allOrgs.map(org => {
      const orgEmployees = getEmployeesByOrg(org.id);
      const count = orgEmployees.length;
      totalEmployees += count;
      if (org.status === 'ACTIVE') {
        activeEmployees += count;
      }

      if (org.subscriptionPlan === 'BASIC') basicCount++;
      else if (org.subscriptionPlan === 'PREMIUM') premiumCount++;
      else if (org.subscriptionPlan === 'ENTERPRISE') enterpriseCount++;
      else freeTrialCount++;

      return {
        id: org.id,
        name: org.name,
        adminEmail: org.adminEmail,
        phone: org.phone,
        industry: org.industry,
        createdAt: org.createdAt,
        subscriptionPlan: org.subscriptionPlan,
        employeeLimit: org.employeeLimit,
        activeEmployees: count,
        status: org.status
      };
    });

    // Simulated active tracking sessions from global sync store
    let activeSessionsCount = 0;
    if (globalThis.__ftiGlobalAppState?.activeTracking) {
      activeSessionsCount = Object.keys(globalThis.__ftiGlobalAppState.activeTracking).length;
    } else {
      // Seed default active tracking if not initialized
      activeSessionsCount = 3; 
    }

    // Monthly Recurring Revenue estimation
    // Basic = $49/mo, Premium = $99/mo, Enterprise = $249/mo, Trial = $0
    const mrr = (basicCount * 49) + (premiumCount * 99) + (enterpriseCount * 249);

    const stats = {
      totalOrganizations: allOrgs.length,
      activeOrganizations: allOrgs.filter(o => o.status === 'ACTIVE').length,
      suspendedOrganizations: allOrgs.filter(o => o.status === 'SUSPENDED').length,
      totalEmployees,
      activeEmployees,
      activeTrackingSessions: activeSessionsCount,
      estimatedMRR: mrr,
      dailyActiveUsers: Math.round(activeEmployees * 0.8 + allOrgs.length), // simulated
      subscriptionStats: {
        FREE_TRIAL: freeTrialCount,
        BASIC: basicCount,
        PREMIUM: premiumCount,
        ENTERPRISE: enterpriseCount
      }
    };

    return NextResponse.json({ stats, organizations: orgsList, announcements });
  } catch (error) {
    console.error('Super Admin GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 });
  }
}

// POST /api/superadmin
// Handles action: 'createOrg' OR action: 'announcement'
export async function POST(req: NextRequest) {
  await seedStore();
  const auth = await authenticateSuperAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'announcement') {
      const { title, message, type } = body;
      if (!title || !message || !type) {
        return NextResponse.json({ error: 'Title, message, and type are required for announcements.' }, { status: 400 });
      }

      const ann = addAnnouncement({ title, message, type });
      return NextResponse.json({ success: true, announcement: ann });
    }

    // Default action: createOrg
    const { name, adminEmail, password, phone, industry, subscriptionPlan, employeeLimit } = body;
    if (!name || !adminEmail || !password || !phone || !industry || !subscriptionPlan || !employeeLimit) {
      return NextResponse.json({ error: 'Missing required organization fields.' }, { status: 400 });
    }

    // Check email uniqueness
    if (orgEmailExists(adminEmail)) {
      return NextResponse.json({ error: 'An organization with this administrator email already exists.' }, { status: 409 });
    }

    const orgId = `org-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 12);

    addOrg({
      id: orgId,
      name,
      adminEmail,
      passwordHash,
      phone,
      industry,
      createdAt: new Date(),
      subscriptionPlan,
      employeeLimit: parseInt(employeeLimit, 10),
      status: 'ACTIVE'
    });

    return NextResponse.json({ success: true, orgId });
  } catch (error) {
    console.error('Super Admin POST error:', error);
    return NextResponse.json({ error: 'Failed to complete requested action' }, { status: 500 });
  }
}

// PUT /api/superadmin
// Updates organization status, subscription plan, details, or employee limit
export async function PUT(req: NextRequest) {
  await seedStore();
  const auth = await authenticateSuperAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, industry, subscriptionPlan, employeeLimit, status, phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required for updates.' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (industry !== undefined) updates.industry = industry;
    if (subscriptionPlan !== undefined) updates.subscriptionPlan = subscriptionPlan;
    if (employeeLimit !== undefined) updates.employeeLimit = parseInt(employeeLimit, 10);
    if (status !== undefined) updates.status = status;
    if (phone !== undefined) updates.phone = phone;

    const ok = updateOrg(id, updates);
    if (!ok) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Super Admin PUT error:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

// DELETE /api/superadmin
// Deletes organization and its employees entirely
export async function DELETE(req: NextRequest) {
  await seedStore();
  const auth = await authenticateSuperAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required for deletion.' }, { status: 400 });
    }

    const ok = deleteOrg(id);
    if (!ok) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Super Admin DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
