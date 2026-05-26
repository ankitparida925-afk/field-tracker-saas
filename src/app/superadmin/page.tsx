'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/context/AppState';
import { getAccessToken } from '@/lib/session';
import {
  Activity,
  Building2,
  Users,
  Radio,
  DollarSign,
  TrendingUp,
  Sliders,
  Bell,
  LogOut,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Lock,
  Globe,
  Grid,
  Info,
  Calendar,
  X,
  Smartphone,
  PieChart,
  Eye,
  RefreshCw,
  Trash2,
  AlertCircle
} from 'lucide-react';

// Load client-only SuperAdminMap dynamically
const SuperAdminMap = dynamic(
  () => import('@/components/SuperAdminMap'),
  { ssr: false }
);

interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalEmployees: number;
  activeEmployees: number;
  activeTrackingSessions: number;
  estimatedMRR: number;
  dailyActiveUsers: number;
  subscriptionStats: {
    FREE_TRIAL: number;
    BASIC: number;
    PREMIUM: number;
    ENTERPRISE: number;
  };
}

export default function SuperAdminDashboard() {
  const { currentUser, logout, activeTracking, employees, historyPaths } = useAppState();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'organizations' | 'map' | 'notifications' | 'billing'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED'>('all');
  const [mapOrgFilter, setMapOrgFilter] = useState('all');

  // Modal forms states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);

  // New Organization fields
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPassword, setNewOrgPassword] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgIndustry, setNewOrgIndustry] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'FREE_TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('FREE_TRIAL');
  const [newOrgLimit, setNewOrgLimit] = useState(15);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  // Edit Organization fields
  const [editPlan, setEditPlan] = useState<'FREE_TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('FREE_TRIAL');
  const [editLimit, setEditLimit] = useState(15);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Announcement fields
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState<'info' | 'warning' | 'alert' | 'maintenance'>('info');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Enforce Super Admin role verification
  useEffect(() => {
    if (mounted) {
      if (!currentUser) {
        router.replace('/signin');
      } else if (currentUser.role !== 'superadmin') {
        router.replace('/employee');
      }
    }
  }, [mounted, currentUser, router]);

  // Fetch Super Admin Stats & Organizations
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      const res = await fetch('/api/superadmin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setOrganizations(data.organizations);
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error('Failed to fetch Super Admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && currentUser && currentUser.role === 'superadmin') {
      fetchData();
    }
  }, [mounted, currentUser]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!newOrgName || !newOrgEmail || !newOrgPassword || !newOrgPhone || !newOrgIndustry) {
      setFormError('Please fill out all fields.');
      return;
    }

    try {
      const token = getAccessToken();
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'createOrg',
          name: newOrgName,
          adminEmail: newOrgEmail,
          password: newOrgPassword,
          phone: newOrgPhone,
          industry: newOrgIndustry,
          subscriptionPlan: newOrgPlan,
          employeeLimit: newOrgLimit
        })
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || 'Failed to create organization.');
        return;
      }

      setFormSuccess(true);
      // Reset form fields
      setNewOrgName('');
      setNewOrgEmail('');
      setNewOrgPassword('');
      setNewOrgPhone('');
      setNewOrgIndustry('');
      setNewOrgPlan('FREE_TRIAL');
      setNewOrgLimit(15);
      
      // Reload stats/list
      fetchData();
      setTimeout(() => setShowCreateModal(false), 1500);
    } catch {
      setFormError('Network error while creating organization.');
    }
  };

  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    try {
      const token = getAccessToken();
      const res = await fetch('/api/superadmin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedOrg.id,
          name: editName,
          industry: editIndustry,
          phone: editPhone,
          subscriptionPlan: editPlan,
          employeeLimit: editLimit,
          status: editStatus
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update organization.');
      }
    } catch {
      alert('Network error while updating organization.');
    }
  };

  const handleDeleteOrg = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete ${name}? This will permanently wipe all organizational records and employees.`)) {
      return;
    }

    try {
      const token = getAccessToken();
      const res = await fetch(`/api/superadmin?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete organization.');
      }
    } catch {
      alert('Network error while deleting organization.');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceMessage) {
      alert('Please fill out the announcement fields.');
      return;
    }

    try {
      const token = getAccessToken();
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'announcement',
          title: announceTitle,
          message: announceMessage,
          type: announceType
        })
      });

      if (res.ok) {
        setAnnounceTitle('');
        setAnnounceMessage('');
        alert('Global announcement broadcasted successfully!');
        fetchData();
      } else {
        alert('Failed to dispatch announcement.');
      }
    } catch {
      alert('Network error.');
    }
  };

  const handleToggleStatus = async (org: any) => {
    const nextStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const token = getAccessToken();
      const res = await fetch('/api/superadmin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: org.id,
          status: nextStatus
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (org: any) => {
    setSelectedOrg(org);
    setEditName(org.name);
    setEditIndustry(org.industry);
    setEditPhone(org.phone);
    setEditPlan(org.subscriptionPlan);
    setEditLimit(org.employeeLimit);
    setEditStatus(org.status);
    setShowEditModal(true);
  };

  // Filter organizations list
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          org.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          org.industry.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (orgFilter === 'all') return matchesSearch;
    return matchesSearch && org.status === orgFilter;
  });

  if (!mounted || !currentUser || currentUser.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-extrabold tracking-widest uppercase">Authenticating Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/20">
            <Sliders size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight">FieldTracker Super Admin</h1>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">SaaS Platform Headquarters</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin text-indigo-600' : ''} />
          </button>
          
          <div className="h-8 w-px bg-slate-200" />
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 leading-none">{currentUser.name}</p>
              <span className="text-[9px] bg-slate-100 text-indigo-600 font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block">Platform Owner</span>
            </div>
            <button
              onClick={() => { logout(); router.replace('/signin'); }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl transition flex items-center justify-center cursor-pointer shadow-sm border border-rose-100/50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="flex-grow flex flex-col md:flex-row min-h-[calc(100vh-60px)]">
        
        {/* SIDE BAR NAVIGATION */}
        <aside className="w-full md:w-60 bg-white border-r border-slate-200/80 px-4 py-6 flex flex-col gap-1.5 flex-shrink-0">
          <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider px-3 mb-2">Primary Console</p>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Grid size={15} /> Dashboard & Metrics
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === 'organizations' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Building2 size={15} /> Organization Registry
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === 'map' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Globe size={15} /> Global Telemetry Map
          </button>

          <div className="h-px bg-slate-200/80 my-4" />
          <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider px-3 mb-2">Platform Control</p>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Bell size={15} /> System Announcements
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <DollarSign size={15} /> Subscription & Billing
          </button>
        </aside>

        {/* MAIN BODY WINDOW */}
        <main className="flex-grow p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
          
          {loading && !stats ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <span className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Syncing SaaS Core...</p>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD & METRICS */}
              {activeTab === 'dashboard' && stats && (
                <div className="space-y-6">
                  
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Organizations</p>
                        <div className="bg-blue-50 p-2 rounded-xl text-blue-600 border border-blue-100">
                          <Building2 size={16} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalOrganizations}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <TrendingUp size={8} /> {stats.activeOrganizations} Active
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Across 5 different industries</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Platform Employees</p>
                        <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 border border-indigo-100">
                          <Users size={16} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalEmployees}</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-1.5 py-0.5 rounded">
                          {stats.activeEmployees} Active
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Telemetry and state isolated</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Active GPS Sessions</p>
                        <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                          <Radio size={16} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 leading-none">{stats.activeTrackingSessions}</span>
                        <span className="text-[10px] text-emerald-500 animate-pulse font-extrabold flex items-center gap-1">
                          ● Online
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Realtime telemetry ticking</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Monthly recurring rev</p>
                        <div className="bg-amber-50 p-2 rounded-xl text-amber-600 border border-amber-100">
                          <DollarSign size={16} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 leading-none">${stats.estimatedMRR.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold">/mo projected</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Based on subscription plans</p>
                    </div>

                  </div>

                  {/* Secondary stats & charts overview */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Visual CSS-based Subscription plans breakdown */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Subscription Tier Breakdown</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Distribution of active platform clients</p>
                      </div>

                      {/* SVG styled Chart representing Plan allocations */}
                      <div className="relative pt-4 flex flex-col gap-3">
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-black text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-slate-900" /> Enterprise Plan ($249/mo)
                            </span>
                            <span>{stats.subscriptionStats.ENTERPRISE} Orgs</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${(stats.subscriptionStats.ENTERPRISE / Math.max(stats.totalOrganizations, 1)) * 100}%` }} 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-black text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-indigo-600" /> Premium Plan ($99/mo)
                            </span>
                            <span>{stats.subscriptionStats.PREMIUM} Orgs</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${(stats.subscriptionStats.PREMIUM / Math.max(stats.totalOrganizations, 1)) * 100}%` }} 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-black text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-blue-500" /> Basic Plan ($49/mo)
                            </span>
                            <span>{stats.subscriptionStats.BASIC} Orgs</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-50 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${(stats.subscriptionStats.BASIC / Math.max(stats.totalOrganizations, 1)) * 100}%` }} 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-black text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-amber-500" /> Free Trial (0/mo)
                            </span>
                            <span>{stats.subscriptionStats.FREE_TRIAL} Orgs</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${(stats.subscriptionStats.FREE_TRIAL / Math.max(stats.totalOrganizations, 1)) * 100}%` }} 
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Platform System Load Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Platform Core Telemetry</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Global Server Status</p>
                      </div>

                      <div className="py-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs text-slate-500 font-bold">Daily Active Users</span>
                          <span className="text-xs text-slate-800 font-black">{stats.dailyActiveUsers}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs text-slate-500 font-bold">GPS Sync Buffer</span>
                          <span className="text-xs text-emerald-600 font-extrabold">0 ms delay (Optimal)</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs text-slate-500 font-bold">Platform Status</span>
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-black uppercase">Online</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex items-start gap-2.5">
                        <Info size={14} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Enterprise multi-tenant isolation is fully active. All database queries automatically scope telemetry by tenant <code>organizationId</code>.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Recent Activity and System Bulletins */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Platform Announcements display */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Active Bulletins & Announcements</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Dispatched platform notifications</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('notifications')}
                          className="text-[10px] text-indigo-600 font-black hover:underline cursor-pointer"
                        >
                          Dispatch Announcement +
                        </button>
                      </div>

                      <div className="space-y-3">
                        {announcements.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No platform announcements currently broadcasted.</p>
                        ) : (
                          announcements.map((ann, i) => (
                            <div 
                              key={ann.id || i}
                              className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                                ann.type === 'maintenance' ? 'bg-amber-50 border-amber-200/50 text-amber-800' :
                                ann.type === 'warning' ? 'bg-rose-50 border-rose-200/50 text-rose-800' :
                                ann.type === 'alert' ? 'bg-red-50 border-red-200/50 text-red-800' :
                                'bg-blue-50 border-blue-200/50 text-blue-800'
                              }`}
                            >
                              <div className="mt-0.5">
                                {ann.type === 'maintenance' ? <AlertTriangle size={15} /> :
                                 ann.type === 'warning' ? <AlertCircle size={15} /> :
                                 ann.type === 'alert' ? <Lock size={15} /> :
                                 <Info size={15} />}
                              </div>
                              <div className="flex-grow space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black">{ann.title}</h4>
                                  <span className="text-[9px] opacity-75 font-bold">{new Date(ann.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[11px] opacity-90 leading-normal">{ann.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Platform System logs */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global Telemetry Log</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Live platform activity monitor</p>
                      </div>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        <div className="flex items-start gap-2 text-[11px] border-l border-indigo-200 pl-3 relative">
                          <span className="absolute left-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white" />
                          <div>
                            <p className="font-extrabold text-slate-800">New employee sync logs received</p>
                            <p className="text-slate-400 mt-0.5">Rahul Sharma (org-fti) checked-in at HQ Office</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-[11px] border-l border-indigo-200 pl-3 relative">
                          <span className="absolute left-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                          <div>
                            <p className="font-extrabold text-slate-800">Subscription check succeeded</p>
                            <p className="text-slate-400 mt-0.5">Apex Logistics subscription verified for 50 limits</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-[11px] border-l border-indigo-200 pl-3 relative">
                          <span className="absolute left-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
                          <div>
                            <p className="font-extrabold text-slate-800">Tenant suspension lockdown active</p>
                            <p className="text-slate-400 mt-0.5">MedVitals Org (org-med) blocked from authentication</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: ORGANIZATIONS REGISTRY */}
              {activeTab === 'organizations' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="relative w-full sm:w-72">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search Organizations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-4 py-2 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-700"
                      />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-1.5">
                        <Filter size={13} className="text-slate-400" />
                        <select
                          value={orgFilter}
                          onChange={e => setOrgFilter(e.target.value as any)}
                          className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none font-bold text-slate-600 focus:border-indigo-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </div>

                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/10 transition cursor-pointer active:scale-95 ml-auto sm:ml-0"
                      >
                        <Plus size={14} /> Register Org
                      </button>
                    </div>
                  </div>

                  {/* Organizations High Density Data Table */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
                            <th className="px-5 py-3">Company Details</th>
                            <th className="px-5 py-3">Industry</th>
                            <th className="px-5 py-3">Subscription</th>
                            <th className="px-5 py-3">Employees / Limit</th>
                            <th className="px-5 py-3">Created Date</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {filteredOrgs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-8 text-center text-slate-400 italic">No organizations found matching the criteria.</td>
                            </tr>
                          ) : (
                            filteredOrgs.map(org => (
                              <tr key={org.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-5 py-4">
                                  <div className="space-y-0.5">
                                    <p className="font-extrabold text-slate-900">{org.name}</p>
                                    <p className="text-[10px] text-slate-400 leading-none">{org.adminEmail}</p>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-slate-500 font-semibold">{org.industry}</td>
                                <td className="px-5 py-4">
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                                    org.subscriptionPlan === 'ENTERPRISE' ? 'bg-slate-900 text-white' :
                                    org.subscriptionPlan === 'PREMIUM' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                    org.subscriptionPlan === 'BASIC' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
                                    {org.subscriptionPlan}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-800 font-black">{org.activeEmployees}</span>
                                    <span className="text-slate-300 font-normal">/</span>
                                    <span className="text-slate-400 font-semibold">{org.employeeLimit} max</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-slate-400 font-semibold">{new Date(org.createdAt).toLocaleDateString()}</td>
                                <td className="px-5 py-4">
                                  <button
                                    onClick={() => handleToggleStatus(org)}
                                    className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border ${
                                      org.status === 'ACTIVE'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-200/50 hover:bg-rose-100'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                    {org.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                                  </button>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditModal(org)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      title="Edit Details & Plan"
                                    >
                                      <Sliders size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOrg(org.id, org.name)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Delete Organization"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GLOBAL TELEMETRY MAP */}
              {activeTab === 'map' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global Telemetry Dashboard</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Cross-organization live tracking console</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter size={13} className="text-slate-400" />
                      <select
                        value={mapOrgFilter}
                        onChange={e => setMapOrgFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none font-bold text-slate-600 focus:border-indigo-500"
                      >
                        <option value="all">All Organizations</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="h-[500px]">
                    <SuperAdminMap 
                      organizations={organizations}
                      activeTracking={activeTracking}
                      employees={employees}
                      selectedOrgFilter={mapOrgFilter}
                      historyPaths={historyPaths}
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: SYSTEM ANNOUNCEMENTS */}
              {activeTab === 'notifications' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Announcement Creation Panel */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Dispatch New Announcement</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Publish global banners to all tenants</p>
                    </div>

                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Announcement Title</label>
                        <input 
                          type="text"
                          placeholder="System Maintenance, Upgrade, etc."
                          value={announceTitle}
                          onChange={e => setAnnounceTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Severity Bulletin Type</label>
                        <select
                          value={announceType}
                          onChange={e => setAnnounceType(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none font-bold text-slate-600 focus:border-indigo-500"
                        >
                          <option value="info">💡 Information bulletin</option>
                          <option value="maintenance">🔧 Platform Maintenance</option>
                          <option value="warning">⚠️ High Warning Alert</option>
                          <option value="alert">🔒 Security lockout warning</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Broadcast Message</label>
                        <textarea
                          placeholder="Write the platform-wide announcement message details..."
                          rows={4}
                          value={announceMessage}
                          onChange={e => setAnnounceMessage(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-600"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer active:scale-95 transition"
                      >
                        <Bell size={13} /> Dispatch Broadcast Banner
                      </button>

                    </form>
                  </div>

                  {/* Announcement List details */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Active Bulletins Registry</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">All platform-wide announcements</p>
                    </div>

                    <div className="space-y-3">
                      {announcements.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No announcements found.</p>
                      ) : (
                        announcements.map((ann, i) => (
                          <div 
                            key={ann.id || i}
                            className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition ${
                              ann.type === 'maintenance' ? 'bg-amber-50 border-amber-200/50 text-amber-800' :
                              ann.type === 'warning' ? 'bg-rose-50 border-rose-200/50 text-rose-800' :
                              ann.type === 'alert' ? 'bg-red-50 border-red-200/50 text-red-800' :
                              'bg-blue-50 border-blue-200/50 text-blue-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {ann.type === 'maintenance' ? <AlertTriangle size={15} /> :
                                 ann.type === 'warning' ? <AlertCircle size={15} /> :
                                 ann.type === 'alert' ? <Lock size={15} /> :
                                 <Info size={15} />}
                              </div>
                              <div>
                                <h4 className="text-xs font-black">{ann.title}</h4>
                                <p className="text-[11px] opacity-90 mt-1 leading-relaxed">{ann.message}</p>
                                <span className="text-[9px] opacity-75 font-bold uppercase mt-2 inline-block">Dispatched on {new Date(ann.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: BILLING & SUBSCRIPTIONS */}
              {activeTab === 'billing' && stats && (
                <div className="space-y-6">
                  
                  {/* Financial projections details */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">SaaS Financial Projections</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Monthly Recurring Revenue Growth</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Basic Tier Projected</p>
                        <h4 className="text-xl font-black text-slate-800 mt-2">${(stats.subscriptionStats.BASIC * 49).toLocaleString()} <span className="text-xs text-slate-400 font-normal">/mo</span></h4>
                        <p className="text-[10px] text-slate-400 mt-1">{stats.subscriptionStats.BASIC} active orgs at $49/mo</p>
                      </div>

                      <div className="bg-indigo-50/30 border border-indigo-200/30 rounded-2xl p-5">
                        <p className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wider">Premium Tier Projected</p>
                        <h4 className="text-xl font-black text-indigo-900 mt-2">${(stats.subscriptionStats.PREMIUM * 99).toLocaleString()} <span className="text-xs text-slate-400 font-normal">/mo</span></h4>
                        <p className="text-[10px] text-indigo-400 mt-1">{stats.subscriptionStats.PREMIUM} active orgs at $99/mo</p>
                      </div>

                      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg shadow-slate-900/10">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Enterprise Tier Projected</p>
                        <h4 className="text-xl font-black text-white mt-2">${(stats.subscriptionStats.ENTERPRISE * 249).toLocaleString()} <span className="text-xs text-slate-400 font-normal">/mo</span></h4>
                        <p className="text-[10px] text-slate-400 mt-1">{stats.subscriptionStats.ENTERPRISE} active orgs at $249/mo</p>
                      </div>

                    </div>
                  </div>

                  {/* Billing history table */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Platform Invoices</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Direct credit transactions and billing logs</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs font-bold">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-widest text-[9px]">
                            <th className="px-4 py-2">Invoice ID</th>
                            <th className="px-4 py-2">Company</th>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Tier</th>
                            <th className="px-4 py-2">Amount</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {organizations.map((org, index) => (
                            <tr key={org.id}>
                              <td className="px-4 py-3 text-slate-400">#FTI-2026-{200 + index}</td>
                              <td className="px-4 py-3 text-slate-800">{org.name}</td>
                              <td className="px-4 py-3 text-slate-500">May 15, 2026</td>
                              <td className="px-4 py-3 text-[10px] font-black">{org.subscriptionPlan}</td>
                              <td className="px-4 py-3 text-slate-850">
                                {org.subscriptionPlan === 'ENTERPRISE' ? '$249.00' :
                                 org.subscriptionPlan === 'PREMIUM' ? '$99.00' :
                                 org.subscriptionPlan === 'BASIC' ? '$49.00' : '$0.00'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase ${
                                  org.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                  {org.status === 'ACTIVE' ? 'Paid' : 'Unpaid'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </>
          )}

        </main>
      </div>

      {/* MODAL 1: REGISTER NEW ORGANIZATION */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
              <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <Building2 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Register Organization Tenant</h2>
                <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mt-0.5 leading-none">Setup fully isolated client workspace</p>
              </div>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200/50 text-rose-600 text-xs p-3 rounded-xl flex items-start gap-2.5 mb-4 font-bold">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200/50 text-emerald-600 text-xs p-3 rounded-xl flex items-center gap-2.5 mb-4 font-bold">
                <CheckCircle size={15} />
                <span>Organization workspace created successfully! Seeding databases...</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4 text-xs font-bold text-slate-700">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Company Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Apex Logistics"
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Industry Segment</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Freight & Shipping"
                    value={newOrgIndustry}
                    onChange={e => setNewOrgIndustry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Admin Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="admin@company.com"
                    value={newOrgEmail}
                    onChange={e => setNewOrgEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Temp Access Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newOrgPassword}
                    onChange={e => setNewOrgPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Corporate Phone Number</label>
                <input 
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={newOrgPhone}
                  onChange={e => setNewOrgPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Subscription Plan</label>
                  <select
                    value={newOrgPlan}
                    onChange={e => setNewOrgPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none font-bold text-slate-600 focus:border-indigo-500"
                  >
                    <option value="FREE_TRIAL">Free Trial Tier</option>
                    <option value="BASIC">Basic Plan ($49/mo)</option>
                    <option value="PREMIUM">Premium Plan ($99/mo)</option>
                    <option value="ENTERPRISE">Enterprise Plan ($249/mo)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Max Employee Limit</label>
                  <input 
                    type="number"
                    min={1}
                    required
                    value={newOrgLimit}
                    onChange={e => setNewOrgLimit(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer active:scale-95 transition"
              >
                <CheckCircle size={14} /> Establish Organizational Tenant
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PLAN & DETAILS */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
              <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <Sliders size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Manage Tenant subscription</h2>
                <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mt-0.5 leading-none">Modify {selectedOrg.name} plan & limits</p>
              </div>
            </div>

            <form onSubmit={handleEditOrg} className="space-y-4 text-xs font-bold text-slate-700">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Company Name</label>
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Industry Segment</label>
                  <input 
                    type="text"
                    required
                    value={editIndustry}
                    onChange={e => setEditIndustry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Corporate Phone Number</label>
                <input 
                  type="text"
                  required
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1 col-span-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Subscription Plan</label>
                  <select
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none font-bold text-slate-650 focus:border-indigo-500"
                  >
                    <option value="FREE_TRIAL">Free Trial Tier</option>
                    <option value="BASIC">Basic Plan ($49/mo)</option>
                    <option value="PREMIUM">Premium Plan ($99/mo)</option>
                    <option value="ENTERPRISE">Enterprise Plan ($249/mo)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Employee Limit</label>
                  <input 
                    type="number"
                    min={1}
                    value={editLimit}
                    onChange={e => setEditLimit(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Lock status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none font-bold text-slate-650 focus:border-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer active:scale-95 transition"
              >
                <CheckCircle size={14} /> Update Tenant Settings
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
