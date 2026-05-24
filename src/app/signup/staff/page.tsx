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
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  MapPin,
  Clock,
  Camera,
  LogIn,
  CheckSquare
} from 'lucide-react';

export default function StaffSignUpPage() {
  const { registerEmployee, organizations, currentUser } = useAppState();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [phone, setPhone] = useState('');
  const [dept, setDept] = useState('Sales & Marketing');
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  // Set default org to first available
  React.useEffect(() => {
    if (organizations.length > 0 && !orgId) {
      setOrgId(organizations[0].id);
    }
  }, [organizations, orgId]);

  React.useEffect(() => {
    if (mounted && currentUser) {
      if (currentUser.role === 'admin') router.replace('/admin');
      else router.replace('/employee');
    }
  }, [mounted, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone || !orgId) {
      setError('Please fill in all required fields.'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    if (password !== confirmPass) {
      setError('Passwords do not match.'); return;
    }
    setError(null);
    setLoading(true);
    try {
      const ok = await registerEmployee(name.trim(), email.trim().toLowerCase(), password, dept, phone.trim(), orgId);
      if (ok) {
        const orgName = organizations.find(o => o.id === orgId)?.name || 'your organization';
        setSuccess(`Account created under "${orgName}"! You can now sign in.`);
        setTimeout(() => router.push('/signin'), 2500);
      } else {
        setError('That email is already registered. Please sign in instead.');
      }
    } catch {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    { icon: MapPin,       text: 'Share live GPS location during active shifts' },
    { icon: Camera,       text: 'Upload geotagged photos & voice notes as visit proof' },
    { icon: Clock,        text: 'Automatic attendance tracking — no paperwork needed' },
    { icon: CheckSquare,  text: 'Receive & complete tasks assigned by your manager' },
  ];

  const departments = [
    'Sales & Marketing', 'Pharmaceuticals', 'Logistics Operations',
    'Maintenance & Service', 'Healthcare Delivery', 'Field Engineering', 'Other'
  ];

  return (
    <div className="min-h-screen w-full bg-[#0f0a06] flex relative overflow-hidden">

      {/* ── BACKGROUND ───────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-600/6 blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-teal-600/6 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.012]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* ── LEFT PANEL (form) ─────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 overflow-y-auto min-h-screen py-10">
        <div className="w-full max-w-md space-y-5">

          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-300 transition font-semibold">
            <ChevronLeft size={13} /> Back to Home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="bg-emerald-600/15 border border-emerald-500/30 p-1.5 rounded-lg">
              <Activity size={15} className="text-emerald-400" />
            </div>
            <span className="text-xs font-black text-white">FieldTracker Innovations+ <span className="text-emerald-400">FieldTracker</span></span>
          </div>

          <div>
            <h1 className="text-xl font-black text-white mb-1">Join as Field Staff</h1>
            <p className="text-[11px] text-stone-500">Create your operative profile, link to your organization, and go live on the map.</p>
          </div>

          {/* Success */}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Account Created!</p>
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

          {/* No orgs warning */}
          {mounted && organizations.length === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl text-xs text-amber-400">
              <p className="font-bold">No Organizations Found</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                No companies have registered yet.{' '}
                <Link href="/signup/organization" className="underline hover:text-amber-300">Register one first</Link>, then come back to sign up as staff.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Organization picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Select Your Organization *</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <select value={orgId} onChange={e => setOrgId(e.target.value)} required disabled={loading || organizations.length === 0}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition cursor-pointer disabled:opacity-50">
                  {organizations.length === 0 ? (
                    <option value="">No organizations available</option>
                  ) : (
                    organizations.map(org => (
                      <option key={org.id} value={org.id} className="bg-stone-900 text-stone-200">{org.name}</option>
                    ))
                  )}
                </select>
              </div>
              <p className="text-[10px] text-stone-600">Your data will be visible only to your organization&apos;s admin.</p>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Full Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe" disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="john@company.com" disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50" />
              </div>
            </div>

            {/* Password row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Password *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 chars" disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-3 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Confirm *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                  <input type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repeat" disabled={loading}
                    className={`w-full bg-stone-950/80 border text-stone-200 text-xs pl-10 pr-3 py-3 rounded-xl outline-none focus:ring-1 transition disabled:opacity-50 ${
                      confirmPass && confirmPass !== password
                        ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50'
                        : 'border-white/10 focus:border-emerald-500 focus:ring-emerald-500/50'
                    }`} />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Phone Number *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456" disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50" />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Department</label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3.5 top-1/2 -transtone-y-1/2 text-stone-500 pointer-events-none" />
                <select value={dept} onChange={e => setDept(e.target.value)} disabled={loading}
                  className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition cursor-pointer disabled:opacity-50">
                  {departments.map(d => (
                    <option key={d} value={d} className="bg-stone-900 text-stone-200">{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !!success || organizations.length === 0}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50 disabled:scale-100 cursor-pointer">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Creating Operative Profile...</>
              ) : (
                <>Complete Sign Up <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 text-[11px]">
            <Link href="/signup/organization" className="flex items-center gap-1.5 text-stone-500 hover:text-amber-400 transition font-semibold">
              <Building2 size={12} /> Register an Organization
            </Link>
            <span className="hidden sm:block text-stone-700">·</span>
            <Link href="/signin" className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-400 transition font-semibold">
              <LogIn size={12} /> Already have an account?
            </Link>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (decorative) ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-end">
          <div className="bg-emerald-600/15 border border-emerald-500/30 p-2 rounded-xl">
            <Activity size={18} className="text-emerald-400" />
          </div>
          <span className="text-sm font-black text-white">FieldTracker Innovations+</span>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold uppercase">FieldTracker</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/15 px-3 py-1.5 rounded-full text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              <User size={11} /> Field Operative Registration
            </div>
            <h2 className="text-3xl xl:text-4xl font-black leading-tight text-white">
              Go Live on the<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Field Map
              </span>
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
              Sign up, link to your company, and appear instantly on your manager's live tracking dashboard — ready for shifts, tasks, and real-time telemetry.
            </p>
          </div>

          {/* Perks */}
          <div className="space-y-3">
            {perks.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-emerald-500/8 border border-emerald-500/15 p-2 rounded-lg flex-shrink-0">
                    <Icon size={14} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-stone-400">{p.text}</p>
                </div>
              );
            })}
          </div>

          {/* Org count pill */}
          {mounted && organizations.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/3 border border-white/8 px-4 py-2.5 rounded-xl text-xs text-stone-400">
              <Building2 size={13} className="text-emerald-400" />
              <span><strong className="text-emerald-400">{organizations.length}</strong> organization{organizations.length > 1 ? 's' : ''} ready to join</span>
            </div>
          )}
        </div>

        <p className="text-[10px] text-stone-600 font-semibold tracking-wider">
          Secured by FTI Shield GPS Anti-Spoofing Protocols · v3.0.0
        </p>
      </div>
    </div>
  );
}
