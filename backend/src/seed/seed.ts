import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import SuperAdmin from '../models/SuperAdmin';
import Organization from '../models/Organization';
import Employee from '../models/Employee';
import Announcement from '../models/Announcement';
import Task from '../models/Task';
import TaskActivityLog from '../models/TaskActivityLog';

dotenv.config();

async function seed() {
  try {
    await connectDB();

    console.log('🧹 Clearing existing collections...');
    await SuperAdmin.deleteMany({});
    await Organization.deleteMany({});
    await Employee.deleteMany({});
    await Announcement.deleteMany({});
    await Task.deleteMany({});
    await TaskActivityLog.deleteMany({});

    console.log('🌱 Seeding SuperAdmin...');
    await SuperAdmin.create({
      id: 'super-1',
      name: 'SaaS Owner',
      email: 'superadmin@fieldtracker.com',
      passwordHash: await bcrypt.hash('superadmin123', 12),
      role: 'superadmin'
    });

    console.log('🌱 Seeding Organizations...');
    await Organization.create([
      {
        id: 'org-fti',
        companyName: 'FieldTracker Innovations+',
        adminEmail: 'admin@fti.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        phone: '+1 (555) 900-1200',
        industry: 'Software & Telemetry',
        createdAt: new Date('2026-01-01'),
        subscriptionPlan: 'FREE_TRIAL',
        employeeLimit: 5,
        status: 'ACTIVE'
      },
      {
        id: 'org-apex',
        companyName: 'Apex Logistics Solutions',
        adminEmail: 'admin@apex.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        phone: '+1 (555) 321-4567',
        industry: 'Transport & Shipping',
        createdAt: new Date('2026-03-15'),
        subscriptionPlan: 'PREMIUM',
        employeeLimit: 50,
        status: 'ACTIVE'
      },
      {
        id: 'org-med',
        companyName: 'MedVitals Pharma Distribution',
        adminEmail: 'admin@medvitals.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        phone: '+1 (555) 987-6543',
        industry: 'Healthcare & Pharma',
        createdAt: new Date('2026-04-10'),
        subscriptionPlan: 'BASIC',
        employeeLimit: 15,
        status: 'SUSPENDED'
      }
    ]);

    console.log('🌱 Seeding Employees...');
    const defaults = [
      { id: 'emp-1', name: 'Rahul Sharma', email: 'rahul@fti.com', pass: 'rahul123', dept: 'Sales & Marketing', role: 'Enterprise Sales Lead', phone: '+1 (555) 019-2834', color: '#3b82f6', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', orgId: 'org-fti', code: 'MGR-1001', isManager: true },
      { id: 'emp-2', name: 'Sarah Jenkins', email: 'sarah@fti.com', pass: 'sarah123', dept: 'Pharmaceuticals', role: 'Pharma Field Specialist', phone: '+1 (555) 238-4910', color: '#10b981', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', orgId: 'org-fti', code: 'EMP-2002', isManager: false },
      { id: 'emp-3', name: 'Amit Patel', email: 'amit@fti.com', pass: 'amit123', dept: 'Logistics Operations', role: 'Last-Mile Delivery Lead', phone: '+1 (555) 402-8821', color: '#f59e0b', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', orgId: 'org-fti', code: 'EMP-2003', isManager: false },
      { id: 'emp-4', name: 'Carlos Ruiz', email: 'carlos@fti.com', pass: 'carlos123', dept: 'Maintenance & Service', role: 'HVAC Service Expert', phone: '+1 (555) 781-3342', color: '#8b5cf6', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', orgId: 'org-fti', code: 'EMP-2004', isManager: false },
      { id: 'emp-apex-1', name: 'Danielle Brooks', email: 'danielle@apex.com', pass: 'danielle123', dept: 'Operations', role: 'Freight Driver', phone: '+1 (555) 303-1290', color: '#ec4899', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', orgId: 'org-apex', code: 'EMP-3001', isManager: false },
      { id: 'emp-apex-2', name: 'James Carter', email: 'james@apex.com', pass: 'james123', dept: 'Logistics', role: 'Fleet Supervisor', phone: '+1 (555) 404-9811', color: '#06b6d4', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', orgId: 'org-apex', code: 'MGR-3002', isManager: true }
    ];

    for (const d of defaults) {
      await Employee.create({
        id: d.id,
        name: d.name,
        email: d.email,
        passwordHash: await bcrypt.hash(d.pass, 12),
        role: d.role,
        department: d.dept,
        phone: d.phone,
        organizationId: d.orgId,
        avatar: d.avatar,
        color: d.color,
        employeeCode: d.code,
        isManager: d.isManager,
        isActive: true,
        needsPasswordSetup: false,
        createdAt: new Date()
      });
    }

    console.log('🌱 Seeding Enterprise Tasks...');
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const inFiveDays = new Date(now.getTime() + 5 * 1000 * 60 * 60 * 24);

    const demoTasks = [
      {
        title: 'Pharma Clinic Delivery audit',
        description: 'Audit promo stands and confirm vaccine cooler temperatures at Central Med Clinic.',
        assignedEmployeeId: 'emp-2',
        assignedEmployeeName: 'Sarah Jenkins',
        priority: 'High' as const,
        status: 'Started' as const,
        startDate: oneDayAgo,
        deadline: inTwoHours,
        notes: 'Take picture proof of promo stand placement and cooler thermometer.',
        orgId: 'org-fti',
        location: { lat: 37.7749, lng: -122.4194 }
      },
      {
        title: 'Enterprise Client Onboarding Presentation',
        description: 'Conduct final platform onboarding walkthrough for Apex executives.',
        assignedEmployeeId: 'emp-1',
        assignedEmployeeName: 'Rahul Sharma',
        priority: 'High' as const,
        status: 'Completed' as const,
        startDate: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        deadline: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        notes: 'Onboarding deck is linked in attachments. Ensure all stakeholders get client credentials.',
        orgId: 'org-fti',
        completedAt: now,
        totalDurationMs: 2 * 60 * 60 * 1000,
        location: { lat: 37.7833, lng: -122.4167 }
      },
      {
        title: 'Last-Mile Logistics dispatch audit',
        description: 'Audit vehicle layout and routes optimization check for Amit Patel.',
        assignedEmployeeId: 'emp-3',
        assignedEmployeeName: 'Amit Patel',
        priority: 'Medium' as const,
        status: 'Pending' as const,
        startDate: now,
        deadline: inFiveDays,
        notes: 'Check for driver route compliance.',
        orgId: 'org-fti',
        location: { lat: 37.7699, lng: -122.4468 }
      },
      {
        title: 'HVAC Air Filter Replacement Service',
        description: 'Perform routine replacement of lobby HVAC unit filter at Apex HQ.',
        assignedEmployeeId: 'emp-4',
        assignedEmployeeName: 'Carlos Ruiz',
        priority: 'Low' as const,
        status: 'Pending' as const,
        startDate: now,
        deadline: new Date(now.getTime() - 4 * 60 * 60 * 1000), // Overdue!
        notes: 'Overdue service audit.',
        orgId: 'org-fti',
        location: { lat: 37.7599, lng: -122.4368 }
      }
    ];

    for (const dt of demoTasks) {
      const isPastDeadline = new Date().getTime() > new Date(dt.deadline).getTime();
      const isOverdue = dt.status !== 'Completed' && isPastDeadline;

      const t = await Task.create({
        organizationId: dt.orgId,
        title: dt.title,
        description: dt.description,
        assignedEmployeeId: dt.assignedEmployeeId,
        assignedEmployeeName: dt.assignedEmployeeName,
        priority: dt.priority,
        status: dt.status,
        startDate: dt.startDate,
        deadline: dt.deadline,
        notes: dt.notes,
        location: dt.location,
        completedAt: dt.completedAt,
        totalDurationMs: dt.totalDurationMs || 0,
        isOverdue,
        delayTimeMs: isOverdue ? (new Date().getTime() - new Date(dt.deadline).getTime()) : 0,
        attachments: dt.status === 'Completed' ? [{ fileName: 'onboarding-deck.pdf', fileUrl: 'https://example.com/onboarding-deck.pdf', uploadedAt: oneDayAgo }] : [],
        comments: dt.status === 'Started' ? [{ id: '1', authorName: 'rahul@fti.com', authorId: 'emp-1', text: 'Sarah, please prioritize this by 4 PM.', createdAt: oneDayAgo }] : []
      });

      // Seed Activity Logs
      await TaskActivityLog.create({
        taskId: t._id,
        organizationId: dt.orgId,
        employeeId: 'admin-seed',
        employeeName: 'HQ System',
        action: 'Created',
        details: `Task created and assigned to ${dt.assignedEmployeeName}.`
      });

      if (dt.status === 'Started' || dt.status === 'Completed') {
        await TaskActivityLog.create({
          taskId: t._id,
          organizationId: dt.orgId,
          employeeId: dt.assignedEmployeeId,
          employeeName: dt.assignedEmployeeName,
          action: 'Started',
          details: `${dt.assignedEmployeeName} marked the task as Started.`
        });
      }

      if (dt.status === 'Completed') {
        await TaskActivityLog.create({
          taskId: t._id,
          organizationId: dt.orgId,
          employeeId: dt.assignedEmployeeId,
          employeeName: dt.assignedEmployeeName,
          action: 'Completed',
          details: `${dt.assignedEmployeeName} completed the task successfully.`
        });
      }
    }

    console.log('🌱 Seeding Announcements...');
    await Announcement.create({
      id: 'ann-1',
      title: 'Platform Maintenance Scheduled',
      message: 'System upgrade on Sunday, May 31 at 02:00 UTC. Expect 15 mins of telemetry delays.',
      type: 'maintenance',
      createdAt: new Date()
    });

    console.log('✅ MongoDB Atlas Seed Completed Successfully!');
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

seed();
