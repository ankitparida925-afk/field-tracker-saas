'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppState } from '../context/AppState';
import {
  Activity,
  Building2,
  LogIn,
  MapPin,
  Shield,
  Globe,
  ChevronRight,
  Users,
  Bell,
  BarChart3,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';

export default function LandingPage() {
  const { currentUser, theme, toggleTheme } = useAppState();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (mounted && currentUser) {
      if (currentUser.role === 'admin') router.replace('/admin');
      else if (currentUser.role === 'employee') router.replace('/employee');
    }
  }, [mounted, currentUser, router]);

  if (!mounted || currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0f0a06] flex items-center justify-center">
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-amber-600/10 blur-[80px] animate-pulse pointer-events-none" />
        <div className="flex flex-col items-center gap-3 z-10 text-center">
          <div className="w-10 h-10 border-[3px] border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-[11px] text-stone-500 font-bold uppercase tracking-widest">Initializing...</p>
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  const features = [
    { icon: MapPin,    title: 'Real-Time GPS Tracking',    desc: 'Live location with spoofing detection and geofence alerts.' },
    { icon: Shield,    title: 'Security Intelligence',     desc: 'AI-powered anomaly detection and breach monitoring.' },
    { icon: BarChart3, title: 'Analytics Dashboard',       desc: 'Attendance ledger, visit verification, and CSV exports.' },
    { icon: Bell,      title: 'Instant Alert System',      desc: 'Low battery, offline, and geofence breach push alerts.' },
    { icon: Users,     title: 'Multi-Tenant Isolation',    desc: "Each organization's data is fully partitioned & private." },
    { icon: Globe,     title: 'Anywhere Access',           desc: 'Works on desktop admin console and employee mobile app.' },
  ];

  return (
    <div className={`min-h-screen w-full ${isDark ? 'bg-[#0f0a06] text-white' : 'bg-stone-50 text-stone-900'} overflow-x-hidden transition-colors duration-300`}>

      {/* ── BACKGROUND MESH ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full ${isDark ? 'bg-amber-600/8' : 'bg-amber-400/10'} blur-[120px]`} />
        <div className={`absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full ${isDark ? 'bg-yellow-600/8' : 'bg-orange-400/8'} blur-[120px]`} />
        {isDark && (
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        )}
      </div>

      {/* ── NAV BAR ──────────────────────────────────────── */}
      <nav className={`relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b ${isDark ? 'border-white/5' : 'border-stone-200/60'}`}>
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-600/15 border border-amber-500/30 p-2 rounded-xl">
            <Activity size={20} className="text-amber-500" />
          </div>
          <div>
            <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-stone-900'} tracking-tight`}>FieldTracker Innovations+</span>
            <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">FieldTracker</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-stone-900/60 hover:bg-stone-800 border-white/10 text-stone-400 hover:text-white' : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-900'} border transition active:scale-95 cursor-pointer shadow-sm`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <Link href="/signup/organization"
            className={`hidden sm:flex items-center gap-1.5 text-xs ${isDark ? 'text-stone-400 hover:text-stone-200 hover:bg-white/5' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'} px-4 py-2 rounded-lg transition font-semibold`}>
            Register Org
          </Link>
          <Link href="/signin"
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-amber-600/20 active:scale-95">
            <LogIn size={13} /> Sign In
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 max-w-4xl mx-auto">
        {/* Badge */}
        <div className={`inline-flex items-center gap-2 ${isDark ? 'bg-amber-500/8 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-300/60 text-amber-600'} border px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest mb-7 backdrop-blur-sm`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Multi-Tenant GPS Intelligence Platform — v3.0
        </div>

        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6 ${isDark ? 'text-white' : 'text-stone-900'}`}>
          Track Your Field Team{' '}
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
            in Real-Time
          </span>
        </h1>

        <p className={`${isDark ? 'text-stone-400' : 'text-stone-600'} text-base sm:text-lg leading-relaxed max-w-2xl mb-10`}>
          FieldTracker gives operations teams live GPS visibility, automated attendance, geofence breach alerts, and visit proof — all inside one secure, multi-tenant platform.
        </p>

        {/* CTA CARDS ── B2B portals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
          {/* Organization Sign Up */}
          <Link href="/signup/organization"
            className={`group flex flex-col items-center gap-3 p-6 rounded-2xl border ${isDark ? 'border-white/8 bg-white/3 hover:bg-amber-600/10 hover:border-amber-500/40' : 'border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-400/60 shadow-sm'} transition-all duration-300 backdrop-blur-sm text-center cursor-pointer`}>
            <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl group-hover:bg-amber-500/20 transition">
              <Building2 size={22} className="text-amber-500" />
            </div>
            <div>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-800'} mb-1`}>Register Organization</p>
              <p className={`text-[11px] ${isDark ? 'text-stone-500' : 'text-stone-500'} leading-relaxed`}>Set up your company workspace and manage your team</p>
            </div>
            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 group-hover:gap-2 transition-all">
              Get Started <ChevronRight size={11} />
            </span>
          </Link>

          {/* Sign In */}
          <Link href="/signin"
            className={`group flex flex-col items-center gap-3 p-6 rounded-2xl border ${isDark ? 'border-white/8 bg-white/3 hover:bg-yellow-600/10 hover:border-yellow-500/40' : 'border-stone-200 bg-white hover:bg-yellow-50 hover:border-yellow-400/60 shadow-sm'} transition-all duration-300 backdrop-blur-sm text-center cursor-pointer`}>
            <div className="bg-yellow-500/10 border border-yellow-500/25 p-3 rounded-xl group-hover:bg-yellow-500/20 transition">
              <LogIn size={22} className="text-yellow-500" />
            </div>
            <div>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-800'} mb-1`}>Sign In Portal</p>
              <p className={`text-[11px] ${isDark ? 'text-stone-500' : 'text-stone-500'} leading-relaxed`}>Access your enterprise company workspace dashboard</p>
            </div>
            <span className="text-[10px] font-bold text-yellow-500 flex items-center gap-1 group-hover:gap-2 transition-all">
              Sign In <ChevronRight size={11} />
            </span>
          </Link>
        </div>

        {/* Trust badges */}
        <div className={`flex flex-wrap items-center justify-center gap-5 mt-10 text-[10.5px] ${isDark ? 'text-stone-500' : 'text-stone-500'} font-semibold`}>
          {['GPS Anti-Spoofing', 'End-to-End Encryption', 'Zero Data Leaks', 'Multi-Tenant Isolation'].map(b => (
            <span key={b} className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" /> {b}
            </span>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className={`text-2xl sm:text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Manage Field Teams</span>
          </h2>
          <p className={`${isDark ? 'text-stone-500' : 'text-stone-500'} text-sm`}>From live tracking to compliance reports — one unified platform.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={`group p-5 rounded-2xl border ${isDark ? 'border-white/6 bg-white/2 hover:bg-white/4 hover:border-amber-500/20' : 'border-stone-200 bg-white hover:bg-amber-50/50 hover:border-amber-400/40 shadow-sm'} transition-all duration-300 backdrop-blur-sm`}>
                <div className="bg-amber-500/10 border border-amber-500/15 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition">
                  <Icon size={18} className="text-amber-500" />
                </div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-stone-100' : 'text-stone-800'} mb-1.5`}>{f.title}</h3>
                <p className={`text-[11.5px] ${isDark ? 'text-stone-500' : 'text-stone-500'} leading-relaxed`}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto text-center">
        <h2 className={`text-2xl font-black mb-10 ${isDark ? 'text-white' : 'text-stone-900'}`}>
          <span className="bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">3 Steps</span> to Get Started
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Register Organization', desc: 'Sign up your company and get an instant admin dashboard with geofences and analytics.', href: '/signup/organization', color: 'indigo' },
            { step: '02', title: 'Internal Onboarding', desc: 'Add employees internally from your dashboard and provide their custom portal credentials.', href: '/signin', color: 'emerald' },
            { step: '03', title: 'Track & Manage', desc: 'Monitor live GPS, manage tasks, review attendance, and export reports anytime.', href: '/signin', color: 'blue' },
          ].map((s) => (
            <Link key={s.step} href={s.href} className={`group flex flex-col items-center gap-4 p-6 rounded-2xl border ${isDark ? 'border-white/6 bg-white/2 hover:bg-white/4 hover:border-white/12' : 'border-stone-200 bg-white hover:bg-stone-50 shadow-sm'} transition-all duration-300 backdrop-blur-sm cursor-pointer`}>
              <span className={`text-4xl font-black opacity-20 group-hover:opacity-40 transition text-${s.color}-500`}>{s.step}</span>
              <div>
                <p className={`text-sm font-bold ${isDark ? 'text-stone-100' : 'text-stone-800'} mb-2`}>{s.title}</p>
                <p className={`text-[11.5px] ${isDark ? 'text-stone-500' : 'text-stone-500'} leading-relaxed`}>{s.desc}</p>
              </div>
              <span className={`text-[10px] font-bold text-${s.color}-500 flex items-center gap-1 group-hover:gap-2 transition-all`}>
                Start Here <ChevronRight size={11} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className={`relative z-10 border-t ${isDark ? 'border-white/5' : 'border-stone-200'} px-6 py-8 text-center`}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Activity size={14} className="text-amber-500" />
          <span className={`text-xs font-bold ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>FieldTracker Innovations+ · FieldTracker</span>
        </div>
        <p className={`text-[10px] ${isDark ? 'text-stone-600' : 'text-stone-400'} font-semibold tracking-wider`}>
          Secured by FTI Shield GPS Anti-Spoofing Protocols · Version 3.0.0 · All data encrypted in-transit
        </p>
      </footer>
    </div>
  );
}
