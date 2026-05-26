'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../../context/AppState';
import {
  Activity,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Globe,
  Shield,
  Users,
  BarChart3,
  LogIn,
  UserPlus
} from 'lucide-react';

export default function OrganizationSignUpPage() {
  const { registerOrganization, currentUser } = useAppState();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPassword, setOrgPassword] = useState('');
  const [orgConfirmPass, setOrgConfirmPass] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('Software & Telemetry');
  const [orgPlan, setOrgPlan] = useState<'FREE_TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('FREE_TRIAL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    if (mounted && currentUser) {
      if (currentUser.role === 'admin') router.replace('/admin');
      else router.replace('/employee');
    }
  }, [mounted, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgEmail || !orgPassword || !orgPhone) {
      setError('Please fill in all required fields.'); return;
    }
    if (orgPassword.length < 8 || !/[A-Z]/.test(orgPassword) || !/[0-9]/.test(orgPassword)) {
      setError('Password must be at least 8 characters and contain at least one uppercase letter and one number.'); return;
    }
    if (orgPassword !== orgConfirmPass) {
      setError('Passwords do not match.'); return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await registerOrganization(orgName.trim(), orgEmail.trim().toLowerCase(), orgPassword, orgPhone.trim(), orgIndustry, orgPlan);
      if (result.success) {
        setSuccess(`"${orgName}" workspace created! You can now sign in as Admin.`);
        setTimeout(() => router.push('/signin'), 2500);
      } else {
        setError(result.error || 'That email address is already registered.');
      }
    } catch {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    { icon: Shield,    text: 'Instant admin dashboard with live GPS map' },
    { icon: Users,     text: 'Manage unlimited field operatives' },
    { icon: BarChart3, text: 'Attendance logs, visits & CSV exports' },
    { icon: Globe,     text: 'Geofence zones, alerts & breach monitoring' },
  ];

  const industries = [
    'Software & Telemetry', 'Logistics & Delivery', 'Healthcare & Pharma',
    'Utility & Maintenance', 'Retail & FMCG', 'Construction & Real Estate', 'Other'
  ];

  return (
    <div className="min-h-screen w-full bg-[#0f0a06] flex relative overflow-hidden">

      {/* ── BACKGROUND ───────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-amber-600/7 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-orange-600/7 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.012]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* ── LEFT PANEL (decorative) ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-600/15 border border-amber-500/30 p-2 rounded-xl">
            <Activity size={18} className="text-amber-400" />
          </div>
          <span className="text-sm font-black text-white">FieldTracker Innovations+</span>
          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase">FieldTracker</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/8 border border-amber-500/15 px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              <Building2 size={11} /> Organization Registration
            </div>
            <h2 className="text-3xl xl:text-4xl font-black leading-tight text-white">
              Deploy Your<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Operations Hub
              </span>
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
              Register your company to get an instant, fully-isolated admin workspace — maps, geofences, live tracking, and analytics all ready in seconds.
            </p>
          </div>

          {/* Perks */}
          <div className="space-y-3">
            {perks.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-amber-500/8 border border-amber-500/15 p-2 rounded-lg flex-shrink-0">
                    <Icon size={14} className="text-amber-400" />
                  </div>
                  <p className="text-sm text-stone-400">{p.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer quote */}
        <p className="text-[10px] text-stone-600 font-semibold tracking-wider">
          Secured by FTI Shield GPS Anti-Spoofing Protocols · v3.0.0
        </p>
      </div>

      {/* ── RIGHT PANEL (form) ────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 overflow-y-auto min-h-screen py-10">
        <div className="w-full max-w-md space-y-5">

          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-300 transition font-semibold">
            <ChevronLeft size={13} /> Back to Home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="bg-amber-600/15 border border-amber-500/30 p-1.5 rounded-lg">
              <Activity size={15} className="text-amber-400" />
            </div>
            <span className="text-xs font-black text-white">FieldTracker Innovations+ <span className="text-amber-400">FieldTracker</span></span>
          </div>

          <div>
            <h1 className="text-xl font-black text-white mb-1">Register Your Organization</h1>
            <p className="text-[11px] text-stone-500">Create a secure corporate workspace and start managing your field team.</p>
          </div>

          {/* Success */}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Organization Created!</p>
                <p className="text-[11px] opacity-90 mt-0.5">{success}</p>
                <p className="text-[11px] opacity-70 mt-1">Redirecting to Sign In...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl flex items-start gap-2.5 text-xs text-rose-400">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Registration Failed</p>
                <p className="text-[11px] opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Org Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Organization Name *</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)}
                  placeholder="Acme Technologies Ltd" disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition disabled:opacity-50" />
              </div>
            </div>

            {/* Admin Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Admin Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <input type="email" required value={orgEmail} onChange={e => setOrgEmail(e.target.value)}
                  placeholder="admin@yourcompany.com" disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition disabled:opacity-50" />
              </div>
            </div>

            {/* Password row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Password *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                  <input type="password" required value={orgPassword} onChange={e => setOrgPassword(e.target.value)}
                    placeholder="Min 6 chars" disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-3 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition disabled:opacity-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Confirm *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                  <input type="password" required value={orgConfirmPass} onChange={e => setOrgConfirmPass(e.target.value)}
                    placeholder="Repeat" disabled={loading}
                    className={`w-full bg-stone-950/80 border text-stone-200 text-xs pl-10 pr-3 py-3 rounded-xl outline-none focus:ring-1 transition disabled:opacity-50 ${
                      orgConfirmPass && orgConfirmPass !== orgPassword
                        ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50'
                        : 'border-white/10 focus:border-amber-500 focus:ring-amber-500/50'
                    }`} />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">HQ Contact Phone *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <input type="tel" required value={orgPhone} onChange={e => setOrgPhone(e.target.value)}
                  placeholder="+1 (555) 900-1200" disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition disabled:opacity-50" />
              </div>
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Industry Sector</label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <select value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition cursor-pointer disabled:opacity-50">
                  {industries.map(ind => (
                    <option key={ind} value={ind} className="bg-stone-900 text-stone-200">{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Membership Plan Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Choose Membership Plan *</label>
              <div className="relative">
                <Shield size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <select value={orgPlan} onChange={e => setOrgPlan(e.target.value as any)} disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition cursor-pointer disabled:opacity-50">
                  <option value="FREE_TRIAL" className="bg-stone-900 text-stone-200">Free Trial Plan (Max 5 Employees)</option>
                  <option value="BASIC" className="bg-stone-900 text-stone-200">Basic Plan - $49/mo (Max 15 Employees)</option>
                  <option value="PREMIUM" className="bg-stone-900 text-stone-200">Premium Plan - $99/mo (Max 50 Employees)</option>
                  <option value="ENTERPRISE" className="bg-stone-900 text-stone-200">Enterprise Plan - $249/mo (Max 100 Employees)</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !!success}
              className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95 transition disabled:opacity-50 disabled:scale-100 cursor-pointer">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Initializing Workspace...</>
              ) : (
                <>Deploy Organization Space <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 text-[11px]">
            <Link href="/signup/staff" className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-400 transition font-semibold">
              <UserPlus size={12} /> Join as Field Staff
            </Link>
            <span className="hidden sm:block text-stone-700">·</span>
            <Link href="/signin" className="flex items-center gap-1.5 text-stone-500 hover:text-amber-400 transition font-semibold">
              <LogIn size={12} /> Already registered? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
