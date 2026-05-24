import React, { useState } from 'react';
import { useAppState } from '../context/AppState';
import {
  Shield,
  Mail,
  Lock,
  User,
  UserCheck,
  Activity,
  AlertCircle,
  ArrowRight,
  Phone,
  Briefcase,
  CheckCircle2,
  Building
} from 'lucide-react';

export const LoginPortal: React.FC = () => {
  const { login, registerEmployee, registerOrganization, organizations } = useAppState();
  
  const [activeForm, setActiveForm] = useState<'signup-org' | 'signup-staff' | 'signin'>('signup-org');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Organization signup states
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPassword, setOrgPassword] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('Software & Telemetry');

  // Employee signup states
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupDept, setSignupDept] = useState('Sales & Marketing');
  const [signupOrgId, setSignupOrgId] = useState('org-fti');
  
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credential fields.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password. Please verify the credentials.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgEmail || !orgPassword || !orgPhone) {
      setError('Please fill in all organization details.');
      return;
    }

    if (orgPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const success = await registerOrganization(
        orgName.trim(),
        orgEmail.trim().toLowerCase(),
        orgPassword,
        orgPhone.trim(),
        orgIndustry
      );

      if (success) {
        setSuccessMessage(`Organization "${orgName}" registered successfully! Employees can now sign up under your company, and you can log in as Admin.`);
        setEmail(orgEmail.trim().toLowerCase());
        setPassword('');
        setActiveForm('signin');
        
        // Reset inputs
        setOrgName('');
        setOrgEmail('');
        setOrgPassword('');
        setOrgPhone('');
      } else {
        setError('Email address is already registered.');
      }
    } catch (err) {
      setError('An error occurred during organization registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword || !signupPhone || !signupOrgId) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const success = await registerEmployee(
        signupName.trim(),
        signupEmail.trim().toLowerCase(),
        signupPassword,
        signupDept,
        signupPhone.trim(),
        signupOrgId
      );

      if (success) {
        const selectedOrg = organizations.find(org => org.id === signupOrgId);
        setSuccessMessage(`Account created successfully under "${selectedOrg?.name || 'selected company'}"! You can now log in.`);
        setEmail(signupEmail.trim().toLowerCase());
        setPassword('');
        setActiveForm('signin');
        
        // Reset inputs
        setSignupName('');
        setSignupEmail('');
        setSignupPassword('');
        setSignupPhone('');
      } else {
        setError('Email address is already registered.');
      }
    } catch (err) {
      setError('An error occurred during employee registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword(demoPass);

    try {
      const success = await login(demoEmail, demoPass);
      if (!success) {
        setError('Demo login failed. Key match error.');
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-[#0f0a06] flex items-center justify-center p-4 overflow-y-auto select-none py-10">
      
      {/* GLOWING ORBIT BACKGROUND MESHES */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-amber-600/10 blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] rounded-full bg-yellow-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[10%] right-[10%] w-[100px] h-[100px] rounded-full bg-purple-600/5 blur-[50px] pointer-events-none"></div>

      {/* PORTAL CONTAINER */}
      <div className="w-full max-w-lg z-10 space-y-6">
        
        {/* BRAND HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-amber-600/10 border border-amber-500/25 p-3 rounded-2xl text-amber-400 shadow-xl shadow-amber-600/5 mb-1">
            <Activity size={26} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            FieldTracker Innovations+ <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-black border border-amber-500/30">FIELDTRACKER</span>
          </h1>
          <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Multi-Tenant Field Operative Tracking & Intelligence Platform</p>
        </div>

        {/* AUTHENTICATION GLASS CARD */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          
          {/* Form Switcher Capsule */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-stone-950/80 rounded-xl border border-white/5 select-none">
            <button
              type="button"
              onClick={() => {
                setActiveForm('signup-org');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-[9.5px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer text-center outline-none ${
                activeForm === 'signup-org'
                  ? 'bg-amber-600/90 text-white shadow shadow-amber-600/30 border border-amber-400/20'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Org Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveForm('signup-staff');
                setError(null);
                setSuccessMessage(null);
                // Set default org if not set
                if (organizations.length > 0 && !signupOrgId) {
                  setSignupOrgId(organizations[0].id);
                }
              }}
              className={`py-2 text-[9.5px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer text-center outline-none ${
                activeForm === 'signup-staff'
                  ? 'bg-amber-600/90 text-white shadow shadow-amber-600/30 border border-amber-400/20'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Staff Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveForm('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-[9.5px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer text-center outline-none ${
                activeForm === 'signin'
                  ? 'bg-amber-600/90 text-white shadow shadow-amber-600/30 border border-amber-400/20'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Sign In
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-stone-100">
              {activeForm === 'signup-org' && 'Register Organization'}
              {activeForm === 'signup-staff' && 'Field Operative Sign Up'}
              {activeForm === 'signin' && 'Portal Authentication'}
            </h2>
            <p className="text-[11px] text-stone-400">
              {activeForm === 'signup-org' && 'Create a secure corporate space. Instantly deploy maps, geofences, and manage your staff.'}
              {activeForm === 'signup-staff' && 'Select your organization, fill in details, and sync your tracking profile with telemetry hubs.'}
              {activeForm === 'signin' && 'Access the operations room dashboard or start employee tracking shift.'}
            </p>
          </div>

          {/* SUCCESS NOTIFICATION */}
          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400 animate-in fade-in duration-300">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Transaction Accepted</p>
                <p className="text-[11px] opacity-90 mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {/* ERROR ALERT DIALOG */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-rose-400 animate-pulse">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Authentication Refused</p>
                <p className="text-[11px] opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {activeForm === 'signup-org' && (
            /* ORGANIZATION SIGN UP FORM */
            <form onSubmit={handleOrgSignup} className="space-y-4 animate-in fade-in duration-300">
              {/* Organization Name input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Organization Name</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Building size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="FieldTracker Innovations+ Ltd"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Admin Email input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Admin Email Address</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="admin@company.com"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Admin Security Password (min 6 chars)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    value={orgPassword}
                    onChange={(e) => setOrgPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">HQ Contact Phone</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Phone size={15} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+1 (555) 900-1200"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Industry Type selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Industry Sector</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Briefcase size={15} />
                  </span>
                  <select
                    value={orgIndustry}
                    onChange={(e) => setOrgIndustry(e.target.value)}
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="Software & Telemetry" className="bg-stone-900 text-stone-200">Software & Telemetry</option>
                    <option value="Logistics & Delivery" className="bg-stone-900 text-stone-200">Logistics & Delivery</option>
                    <option value="Healthcare & Pharma" className="bg-stone-900 text-stone-200">Healthcare & Pharma</option>
                    <option value="Utility & Maintenance" className="bg-stone-900 text-stone-200">Utility & Maintenance</option>
                    <option value="Other" className="bg-stone-900 text-stone-200">Other</option>
                  </select>
                </div>
              </div>

              {/* Submit Org Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95 transition disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Initializing Workspace...
                  </span>
                ) : (
                  <>
                    Deploy Organization Space <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {activeForm === 'signup-staff' && (
            /* STAFF SIGN UP FORM */
            <form onSubmit={handleSignup} className="space-y-4 animate-in fade-in duration-300">
              {/* Organization Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Select Organization</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Building size={15} />
                  </span>
                  <select
                    value={signupOrgId}
                    onChange={(e) => setSignupOrgId(e.target.value)}
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id} className="bg-stone-900 text-stone-200">
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Full Name input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Full Name</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Email Address</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="john@company.com"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Security Password (min 6 chars)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Phone Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Phone size={15} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Department selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Department</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Briefcase size={15} />
                  </span>
                  <select
                    value={signupDept}
                    onChange={(e) => setSignupDept(e.target.value)}
                    disabled={loading}
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-300 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="Sales & Marketing" className="bg-stone-900 text-stone-200">Sales & Marketing</option>
                    <option value="Pharmaceuticals" className="bg-stone-900 text-stone-200">Pharmaceuticals</option>
                    <option value="Logistics Operations" className="bg-stone-900 text-stone-200">Logistics Operations</option>
                    <option value="Maintenance & Service" className="bg-stone-900 text-stone-200">Maintenance & Service</option>
                  </select>
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95 transition disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Creating Operative Profile...
                  </span>
                ) : (
                  <>
                    Complete Sign Up <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {activeForm === 'signin' && (
            /* SIGN IN FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Email Address</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    disabled={loading}
                    autoComplete="username"
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Security Key / Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                    className="w-full bg-stone-950/80 border border-white/10 text-stone-200 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95 transition disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Validating Access Keys...
                  </span>
                ) : (
                  <>
                    Connect Portal <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* DECORATIVE SEPARATOR */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[10px] text-stone-500 font-bold uppercase tracking-wider">Demo Quick Access Deck</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* QUICK DEMO LOGINS */}
          <div className="space-y-2.5">
            {/* Admin trigger */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@fti.com', 'admin123')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-900/40 hover:bg-stone-900 border border-white/5 hover:border-amber-500/30 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 border border-amber-500/20">
                  <Shield size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-200 leading-none">FieldTracker Innovations+ Admin Room</p>
                  <p className="text-[10px] text-stone-500 mt-1">Full-scale manager analytics, geofences, alerts & maps</p>
                </div>
              </div>
              <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded font-black uppercase">Manager</span>
            </button>

            {/* Employee quick cards grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('rahul@fti.com', 'rahul123')}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/40 hover:bg-stone-900 border border-white/5 hover:border-emerald-500/30 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" alt="Rahul" className="w-7 h-7 rounded-full border border-white/10" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold text-stone-300 truncate">Rahul Sharma</p>
                  <p className="text-[9px] text-stone-500 leading-none mt-0.5 truncate">Sales Lead</p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('sarah@fti.com', 'sarah123')}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/40 hover:bg-stone-900 border border-white/5 hover:border-emerald-500/30 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" alt="Sarah" className="w-7 h-7 rounded-full border border-white/10" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold text-stone-300 truncate">Sarah Jenkins</p>
                  <p className="text-[9px] text-stone-500 leading-none mt-0.5 truncate">Pharma Specialist</p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('amit@fti.com', 'amit123')}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/40 hover:bg-stone-900 border border-white/5 hover:border-emerald-500/30 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" alt="Amit" className="w-7 h-7 rounded-full border border-white/10" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold text-stone-300 truncate">Amit Patel</p>
                  <p className="text-[9px] text-stone-500 leading-none mt-0.5 truncate">Delivery Lead</p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('carlos@fti.com', 'carlos123')}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/40 hover:bg-stone-900 border border-white/5 hover:border-emerald-500/30 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100" alt="Carlos" className="w-7 h-7 rounded-full border border-white/10" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold text-stone-300 truncate">Carlos Ruiz</p>
                  <p className="text-[9px] text-stone-500 leading-none mt-0.5 truncate">Service Expert</p>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* SYSTEM FOOTER */}
        <p className="text-center text-[10px] text-stone-500 font-semibold tracking-wide">
          Secured by FTI Shield GPS Anti-Spoofing Protocols · Version 3.0.0
        </p>

      </div>
    </div>
  );
};
