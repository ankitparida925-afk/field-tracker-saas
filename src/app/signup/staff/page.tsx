'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export default function StaffSignUpPage() {
  return (
    <div className="min-h-screen w-full bg-[#0f0a06] flex items-center justify-center p-4 relative overflow-hidden py-10">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-rose-600/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-amber-600/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6 text-center">
        {/* Brand */}
        <div className="inline-flex bg-rose-600/10 border border-rose-500/25 p-3.5 rounded-2xl text-rose-400 shadow-xl">
          <ShieldAlert size={28} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Controlled Enterprise Portal</h1>
          <p className="text-[11px] text-rose-400 uppercase tracking-widest font-black">Public Staff Registration Disabled</p>
        </div>

        <div className="bg-stone-950/60 backdrop-blur-xl border border-white/8 rounded-2xl p-7 shadow-2xl space-y-5 text-left">
          <h2 className="text-sm font-bold text-stone-200">B2B SaaS Workspace Notice</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            FieldTracker is an enterprise-controlled B2B SaaS platform. Employees and field operatives **cannot self-register** on the public portal.
          </p>
          <div className="bg-stone-900 border border-white/5 p-4 rounded-xl space-y-2.5 text-xs text-stone-400 leading-relaxed">
            <p className="font-bold text-stone-200">How to get access:</p>
            <ul className="list-disc list-inside space-y-1.5 text-stone-400">
              <li>Contact your organization&apos;s Administrator.</li>
              <li>Ask them to onboard you from their **Admin Dashboard**.</li>
              <li>Log in using the custom secure credentials provided by your manager.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/signin" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer">
              <LogIn size={13} /> Return to Portal Sign In
            </Link>
            <Link href="/" className="w-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-stone-200 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer border border-white/5">
              <ArrowLeft size={13} /> Back to Landing Page
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] text-stone-600 font-semibold tracking-wider">
          <Activity size={12} className="text-rose-500" />
          <span>Secured B2B SaaS Tenancy Protocols · v3.0.0</span>
        </div>
      </div>
    </div>
  );
}
