'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../context/AppState';
import {
  Activity,
  Mail,
  Lock,
  Shield,
  ArrowRight,
  LogIn,
  AlertCircle,
  User,
  ChevronLeft,
  Building2,
  UserPlus,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';

export default function SignInPage() {
  const { login, currentUser, theme, toggleTheme } = useAppState();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [tenantName, setTenantName] = useState('FieldTracker');
  const [brandColor, setBrandColor] = useState('amber'); // amber | indigo | rose
  const [logoText, setLogoText] = useState('FieldTracker Innovations+ Operations Portal');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tenant')?.toLowerCase();
      if (t === 'apex') {
        setTenantName('Apex Logistics Solutions');
        setBrandColor('indigo');
        setLogoText('Apex Corporate Operations Portal');
      } else if (t === 'med') {
        setTenantName('MedVitals Pharma Distribution');
        setBrandColor('rose');
        setLogoText('MedVitals Security Telemetry Portal');
      } else if (t === 'fti') {
        setTenantName('FieldTracker Innovations+');
        setBrandColor('amber');
        setLogoText('FieldTracker Innovations+ Operations Portal');
      }
    }
  }, []);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    if (mounted && currentUser) {
      let url = '/employee';
      if (currentUser.role === 'superadmin') {
        url = '/superadmin';
      } else if (currentUser.role === 'admin') {
        url = '/admin';
      }
      // Redirect cleanly in the exact same tab
      router.replace(url);
    }
  }, [mounted, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError(null);
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (!ok) setError('Invalid email or password. Please try again.');
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (e: string, p: string) => {
    setError(null);
    setLoading(true);
    setEmail(e);
    setPassword(p);
    try {
      const ok = await login(e, p);
      if (!ok) setError('Demo login failed.');
    } catch {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const demoAdmins = [
    { label: 'Super Admin Portal', email: 'superadmin@fieldtracker.com', pass: 'superadmin123', sub: 'Global SaaS Control, Multitenant Map & Subscriptions' },
    { label: 'FieldTracker Innovations+ Admin', email: 'admin@fti.com', pass: 'admin123', sub: 'Full analytics, maps & geofence console' }
  ];
  const demoStaff = [
    { name: 'Rahul Sharma',  email: 'rahul@fti.com',  pass: 'rahul123',  role: 'Sales Lead',        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { name: 'Sarah Jenkins', email: 'sarah@fti.com', pass: 'sarah123', role: 'Pharma Specialist',  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { name: 'Amit Patel',    email: 'amit@fti.com',  pass: 'amit123',  role: 'Delivery Lead',      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { name: 'Carlos Ruiz',   email: 'carlos@fti.com',pass: 'carlos123',role: 'Service Expert',     avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
  ];

  return (
    <div className={`min-h-screen w-full ${theme === 'light' ? 'bg-stone-50 text-stone-900' : 'bg-[#0f0a06] text-white'} flex items-center justify-center p-4 relative overflow-hidden py-10 transition-colors duration-300`}>

      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 z-[1000] p-3 rounded-2xl ${theme === 'light' ? 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-900/60 hover:bg-stone-800 border-white/10 text-stone-400 hover:text-white'} border transition active:scale-95 cursor-pointer shadow-lg`}
        title="Toggle Theme Mode"
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {/* Background glows */}
      <div className={`absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full ${brandColor === 'indigo' ? 'bg-indigo-600/8' : brandColor === 'rose' ? 'bg-rose-600/8' : 'bg-amber-600/8'} blur-[120px] pointer-events-none`} />
      <div className={`absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full ${brandColor === 'indigo' ? 'bg-slate-600/8' : brandColor === 'rose' ? 'bg-yellow-600/8' : 'bg-yellow-600/8'} blur-[100px] pointer-events-none`} />

      <div className="w-full max-w-md z-10 space-y-5">

        {/* Back link */}
        <Link href="/" className={`inline-flex items-center gap-1.5 text-[11px] ${theme === 'light' ? 'text-stone-500 hover:text-stone-800' : 'text-stone-500 hover:text-stone-300'} transition font-semibold`}>
          <ChevronLeft size={13} /> Back to Home
        </Link>

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className={`inline-flex ${brandColor === 'indigo' ? 'bg-indigo-600/10 border-indigo-500/25 text-indigo-500 shadow-indigo-600/5' : brandColor === 'rose' ? 'bg-rose-600/10 border-rose-500/25 text-rose-500 shadow-rose-600/5' : 'bg-amber-600/10 border-amber-500/25 text-amber-500 shadow-amber-600/5'} border p-3 rounded-2xl shadow-xl`}>
            <Activity size={24} className="animate-pulse" />
          </div>
          <h1 className={`text-xl font-black ${theme === 'light' ? 'text-stone-900' : 'text-white'}`}>Sign In to {tenantName}</h1>
          <p className={`text-[11px] ${theme === 'light' ? 'text-stone-500' : 'text-stone-500'} uppercase tracking-widest font-bold`}>{logoText}</p>
        </div>

        {/* Glass Card */}
        <div className={`${theme === 'light' ? 'bg-white border-stone-200 shadow-2xl' : 'bg-stone-950/60 backdrop-blur-xl border-white/8 shadow-2xl'} border rounded-2xl p-7 space-y-5 transition-colors duration-300`}>

          <div>
            <h2 className={`text-sm font-bold ${theme === 'light' ? 'text-stone-800' : 'text-stone-200'}`}>Portal Authentication</h2>
            <p className="text-[11px] text-stone-500 mt-0.5">Enter your credentials to access your dashboard or field app.</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-500">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Authentication Refused</p>
                <p className="text-[11px] opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className={`text-[11px] ${theme === 'light' ? 'text-stone-500' : 'text-stone-400'} uppercase tracking-wider font-bold`}>Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={loading}
                  autoComplete="username"
                  className={`w-full ${theme === 'light' ? 'bg-stone-50 border-stone-200 text-stone-900 focus:bg-white' : 'bg-stone-950/80 border-white/10 text-stone-200'} border text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:${brandColor === 'indigo' ? 'border-indigo-500' : brandColor === 'rose' ? 'border-rose-500' : 'border-amber-500'} transition disabled:opacity-50`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[11px] ${theme === 'light' ? 'text-stone-500' : 'text-stone-400'} uppercase tracking-wider font-bold`}>Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  className={`w-full ${theme === 'light' ? 'bg-stone-50 border-stone-200 text-stone-900 focus:bg-white' : 'bg-stone-950/80 border-white/10 text-stone-200'} border text-xs pl-10 pr-10 py-3 rounded-xl outline-none focus:${brandColor === 'indigo' ? 'border-indigo-500' : brandColor === 'rose' ? 'border-rose-500' : 'border-amber-500'} transition disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${brandColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : brandColor === 'rose' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'} text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition disabled:opacity-50 disabled:scale-100 cursor-pointer`}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Validating...</>
              ) : (
                <><LogIn size={13} /> Connect Portal</>
              )}
            </button>
          </form>

          {/* Separator */}
          <div className="relative flex items-center gap-3">
            <div className={`flex-grow border-t ${theme === 'light' ? 'border-stone-200' : 'border-white/5'}`} />
            <span className={`text-[10px] ${theme === 'light' ? 'text-stone-400' : 'text-stone-600'} font-bold uppercase tracking-wider flex-shrink-0`}>Demo Quick Access</span>
            <div className={`flex-grow border-t ${theme === 'light' ? 'border-stone-200' : 'border-white/5'}`} />
          </div>

          {/* Admin demo */}
          {demoAdmins.map(d => (
            <button
              key={d.email}
              type="button"
              disabled={loading}
              onClick={() => handleQuick(d.email, d.pass)}
              className={`w-full flex items-center justify-between p-3 rounded-xl ${theme === 'light' ? 'bg-stone-50 hover:bg-stone-100 border-stone-200' : 'bg-stone-900/50 hover:bg-stone-900 border-white/5'} border hover:border-amber-500/30 transition text-left disabled:opacity-50 cursor-pointer`}
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500 border border-amber-500/20">
                  <Shield size={14} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${theme === 'light' ? 'text-stone-700' : 'text-stone-200'}`}>{d.label}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{d.sub}</p>
                </div>
              </div>
              <span className={`text-[9px] ${theme === 'light' ? 'bg-stone-200 text-stone-600' : 'bg-stone-800 text-stone-400'} px-1.5 py-0.5 rounded font-black uppercase flex-shrink-0`}>Admin</span>
            </button>
          ))}

          {/* Staff demo grid */}
          <div className="grid grid-cols-2 gap-2">
            {demoStaff.map(s => (
              <button
                key={s.email}
                type="button"
                disabled={loading}
                onClick={() => handleQuick(s.email, s.pass)}
                className={`flex items-center gap-2 p-2.5 rounded-xl ${theme === 'light' ? 'bg-stone-50 hover:bg-stone-100 border-stone-200' : 'bg-stone-900/50 hover:bg-stone-900 border-white/5'} border hover:border-emerald-500/30 transition disabled:opacity-50 cursor-pointer text-left`}
              >
                <img src={s.avatar} alt={s.name} className="w-7 h-7 rounded-full border border-white/10 object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <p className={`text-[10.5px] font-bold ${theme === 'light' ? 'text-stone-700' : 'text-stone-300'} truncate`}>{s.name}</p>
                  <p className="text-[9px] text-stone-400 truncate">{s.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Redirect links */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          <Link href="/signup/organization" className="flex items-center gap-1.5 text-stone-500 hover:text-amber-500 transition font-semibold">
            <Building2 size={12} /> Register Organization Tenant
          </Link>
        </div>

        <p className="text-center text-[10px] text-stone-500 font-semibold tracking-wide">
          Secured by FTI Shield GPS Anti-Spoofing Protocols · v3.0.0
        </p>
      </div>
    </div>
  );
}
