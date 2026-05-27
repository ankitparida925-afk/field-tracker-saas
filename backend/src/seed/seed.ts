import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import SuperAdmin from '../models/SuperAdmin';
import Organization from '../models/Organization';
import Employee from '../models/Employee';
import Announcement from '../models/Announcement';

dotenv.config();

async function seed() {
  try {
    await connectDB();

    console.log('🧹 Clearing existing collections...');
    await SuperAdmin.deleteMany({});
    await Organization.deleteMany({});
    await Employee.deleteMany({});
    await Announcement.deleteMany({});

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
