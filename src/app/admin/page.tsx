'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../context/AppState';
import { AnalyticsPanel } from '../../components/AnalyticsPanel';
import { DeviceSimulator } from '../../components/DeviceSimulator';
import { ChatBot } from '../../components/ChatBot';
import { NetflixMessenger } from '../../components/NetflixMessenger';
import { TaskBoard } from '../../components/TaskBoard';
import { TaskAnalytics } from '../../components/TaskAnalytics';
import {
  Activity,
  MapPin,
  Clock,
  ShieldAlert,
  Building,
  UserCheck,
  AlertTriangle,
  LogOut,
  Search,
  Users,
  Smartphone,
  Battery,
  Zap,
  Phone,
  Mail,
  Compass,
  Shield,
  Sun,
  Moon
} from 'lucide-react';

// Load OpenLayers map dynamically (no SSR — OL uses browser APIs)
const LiveMap = dynamic(
  () => import('../../components/LiveMap'),
  { ssr: false }
);

export default function AdminPage() {
  const {
    activeTracking,
    attendance,
    visits,
    alerts,
    currentUser,
    logout,
    isDemoMode,
    setIsDemoMode,
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    theme,
    toggleTheme
  } = useAppState();

  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [directoryFilter, setDirectoryFilter] = React.useState<'all' | 'active'>('all');
  const [sessionLabel, setSessionLabel] = React.useState('');
  const [workspaceTab, setWorkspaceTab] = React.useState<'map' | 'tasks' | 'analytics'>('map');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Live session timer — ticks every 10 seconds
  React.useEffect(() => {
    if (!mounted) return;
    const tick = async () => {
      const { getSessionExpiryLabel } = await import('../../lib/session');
      setSessionLabel(getSessionExpiryLabel());
    };
    tick();
    const interval = setInterval(tick, 10_000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Enforce access control on mount and when auth state changes
  React.useEffect(() => {
    if (mounted) {
      if (!currentUser) {
        router.replace('/');
      } else if (currentUser.role !== 'admin') {
        router.replace('/employee');
      }
    }
  }, [mounted, currentUser, router]);

  // Tenant-scoped employees
  const tenantEmployees = employees.filter(emp => emp && currentUser && emp.organizationId === currentUser.organizationId);

  // Auto-focus dynamic employee selection inside tenant
  React.useEffect(() => {
    if (mounted && currentUser && tenantEmployees.length > 0) {
      const isSelectedValid = tenantEmployees.some(emp => emp.id === selectedEmployeeId);
      if (!isSelectedValid) {
        setSelectedEmployeeId(tenantEmployees[0].id);
      }
    } else if (mounted && currentUser && tenantEmployees.length === 0) {
      if (selectedEmployeeId !== null) {
        setSelectedEmployeeId(null);
      }
    }
  }, [mounted, currentUser, tenantEmployees, selectedEmployeeId, setSelectedEmployeeId]);
  const tenantEmployeeIds = tenantEmployees.map(emp => emp.id);

  // Compute live stats (scoped to current organization)
  const activeLogs = Object.entries(activeTracking)
    .filter(([empId]) => tenantEmployeeIds.includes(empId))
    .map(([, log]) => log);
  const activeShiftsCount = activeLogs.filter(a => a.status !== 'offline').length;
  
  const tenantVisits = visits.filter(v => tenantEmployeeIds.includes(v.employeeId));
  const activeVisitsCount = tenantVisits.filter(v => !v.checkOut).length;

  const tenantAttendance = attendance.filter(att => tenantEmployeeIds.includes(att.employeeId));

  const tenantAlerts = alerts.filter(a => tenantEmployeeIds.includes(a.employeeId));
  const unresolvedAlertsCount = tenantAlerts.filter(a => !a.resolved).length;
  const isSpoofAlarmActive = tenantAlerts.some(a => a.type === 'gps_spoof' && !a.resolved);

  // Return a secure loading state while checking permissions
  if (!mounted || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen w-full relative bg-[#0f0a06] flex flex-col items-center justify-center p-4">
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-amber-600/10 blur-[80px] pointer-events-none animate-pulse"></div>
        <div className="flex flex-col items-center gap-3.5 z-10 text-center">
          <div className="w-10 h-10 border-[3px] border-amber-500/15 border-t-amber-500 rounded-full animate-spin"></div>
          <div>
            <h2 className="text-sm font-black text-stone-200 tracking-wider uppercase">FieldTracker <span className="text-amber-400">AI</span></h2>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Initializing Admin Console...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen">
      {/* ENTERPRISE BRANDING BAR */}
      <header className="bg-stone-950/80 backdrop-blur border-b border-white/5 py-4 px-4 md:px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <span className="bg-amber-600 p-2.5 rounded-xl border border-amber-400/20 shadow-lg shadow-amber-600/25 flex items-center justify-center text-white">
                <Activity size={20} className="animate-pulse" />
              </span>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  FieldTracker <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-500/30">AI PRO</span>
                </h1>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Realtime Field Force & Productivity SaaS</p>
              </div>
            </div>
            
            {/* Mobile quick indicators */}
            <div className="flex lg:hidden items-center gap-2">
              {isSpoofAlarmActive && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" title="Spoof Alarm" />
              )}
              {isDemoMode ? (
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold">DEMO</span>
              ) : (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md font-bold">PROD</span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2.5 md:gap-4 justify-center lg:justify-end w-full lg:w-auto">
            {/* Spoof Siren indicator */}
            {isSpoofAlarmActive && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10.5px] px-3.5 py-1.5 rounded-xl font-bold animate-pulse flex items-center gap-1.5">
                <AlertTriangle size={13} className="animate-bounce" /> SPOOF ALERT
              </div>
            )}

            {/* Console Mode Toggle switch */}
            <div className="bg-stone-900 p-1 rounded-xl border border-white/10 flex shadow-inner select-none text-xs">
              <button
                onClick={() => setIsDemoMode(true)}
                className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  isDemoMode
                    ? 'bg-amber-600 text-white shadow shadow-amber-600/30'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => setIsDemoMode(false)}
                className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  !isDemoMode
                    ? 'bg-emerald-600 text-white shadow shadow-emerald-600/30'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Prod
              </button>
            </div>

            {/* Org badge */}
            <div className="bg-stone-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] max-w-[150px] md:max-w-none">
              <Building size={13} className="text-amber-400 flex-shrink-0" />
              <span className="text-stone-300 font-semibold truncate">{currentUser.organizationName || 'FieldTracker'}</span>
            </div>

            {/* JWT Session Timer */}
            {sessionLabel && (
              <div className="bg-stone-900 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 flex items-center gap-1 text-[11px]" title="JWT session expires in">
                <Shield size={11} className="text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-400 font-bold font-mono">{sessionLabel}</span>
              </div>
            )}

            {/* Theme Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="bg-stone-900 hover:bg-stone-800 border border-white/10 hover:border-amber-500/30 text-stone-400 hover:text-white p-2 rounded-xl text-xs font-bold transition flex items-center justify-center active:scale-95 cursor-pointer"
              title="Switch Color Theme"
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            </button>

            {/* Logout button */}
            <button
              onClick={() => {
                logout();
                router.replace('/');
              }}
              className="bg-stone-900 hover:bg-rose-900 border border-white/10 hover:border-rose-500 text-stone-400 hover:text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={12} className="flex-shrink-0" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* TELEMETRY STAT CARDS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-amber-400 flex-shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Active Field Shifts</p>
              <h3 className="text-xl font-black text-stone-100 mt-0.5">
                {activeShiftsCount}
                <span className="text-xs font-semibold text-stone-500"> / {tenantEmployees.length} staff</span>
              </h3>
              <p className="text-[9.5px] text-stone-600 mt-0.5">
                {tenantEmployees.length - activeShiftsCount} offline
              </p>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-400 flex-shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Geofence Check-Ins</p>
              <h3 className="text-xl font-black text-stone-100 mt-0.5">
                {activeVisitsCount} <span className="text-xs font-semibold text-stone-500">active stops</span>
              </h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-amber-400 flex-shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">HQ Attendance Sheet</p>
              <h3 className="text-xl font-black text-stone-100 mt-0.5">
                {tenantAttendance.length} <span className="text-xs font-semibold text-stone-500">checked-in</span>
              </h3>
            </div>
          </div>

          <div className={`glass-panel p-4 flex items-center gap-4 border transition ${
            unresolvedAlertsCount > 0 ? 'border-rose-500/30 bg-rose-950/5' : ''
          }`}>
            <div className={`p-3 rounded-2xl flex-shrink-0 ${
              unresolvedAlertsCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-stone-800 text-stone-500'
            }`}>
              <ShieldAlert size={20} className={unresolvedAlertsCount > 0 ? 'animate-pulse' : ''} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Unresolved Violations</p>
              <h3 className={`text-xl font-black mt-0.5 ${
                unresolvedAlertsCount > 0 ? 'text-rose-400' : 'text-stone-100'
              }`}>
                {unresolvedAlertsCount} <span className="text-xs font-semibold text-stone-500">alerts</span>
              </h3>
            </div>
          </div>

        </section>

        {/* STALE DATA WARNING — shown if tenant filter returns no employees */}
        {tenantEmployees.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400">No staff found for this organization</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Your browser may have cached old employee data. Click "Clear Cache & Reload" to fix this instantly — all your registered employees will reappear.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                ['field_tracker_employees','field_tracker_organizations','field_tracker_user','field_tracker_demo_mode','field_tracker_version'].forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-black px-4 py-2 rounded-xl transition flex-shrink-0 cursor-pointer active:scale-95"
            >
              Clear Cache & Reload
            </button>
          </div>
        )}

        {/* WORKSPACE SECTOR SWITCHER */}
        <div className="flex justify-start border-b border-white/5 pb-2 mb-2 select-none overflow-x-auto scrollbar-none">
          <div className="flex gap-4 md:gap-6 whitespace-nowrap">
            <button
              onClick={() => setWorkspaceTab('map')}
              className={`pb-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                workspaceTab === 'map' ? 'border-amber-500 text-amber-500' : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              🗺️ Field Map & Telemetry
            </button>
            <button
              onClick={() => setWorkspaceTab('tasks')}
              className={`pb-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                workspaceTab === 'tasks' ? 'border-amber-500 text-amber-500' : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              📋 Tasks Kanban Board
            </button>
            <button
              onClick={() => setWorkspaceTab('analytics')}
              className={`pb-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                workspaceTab === 'analytics' ? 'border-amber-500 text-amber-500' : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              📊 Productivity Analytics
            </button>
          </div>
        </div>

        {/* WORKSPACE DOUBLE COLUMN LAYOUT */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* LEFT & CENTER COLUMN (Live Map & Analytics Console / Tasks boards) */}
          <div className="xl:col-span-2 space-y-6">
            
            {workspaceTab === 'map' && (
              <>
                {/* Live Leaflet Map Container */}
                <div className="glass-panel overflow-hidden rounded-2xl relative h-[350px] md:h-[500px] w-full" style={{ padding: 0 }}>
                  <LiveMap />
                </div>

                {/* Spatial analytics subpanels & charts console */}
                <AnalyticsPanel />
              </>
            )}

            {workspaceTab === 'tasks' && <TaskBoard />}

            {workspaceTab === 'analytics' && <TaskAnalytics />}

          </div>

          {/* RIGHT COLUMN (Employee Phone Handset Simulator / Real Field Directory) */}
          <div className="xl:col-span-1 bg-stone-950/40 border border-white/5 rounded-3xl p-5 shadow-2xl xl:sticky xl:top-28 flex flex-col xl:max-h-[calc(100vh-140px)] h-[600px] xl:h-auto overflow-hidden">
            {isDemoMode ? (
              <>
                <div className="mb-4 flex-shrink-0">
                  <h2 className="text-sm font-black text-stone-200">Field Operator Simulation</h2>
                  <p className="text-[10.5px] text-stone-400 mt-0.5 leading-relaxed">
                    Control the employee's mobile handset to simulate travel coordinates, start/end shifts, trigger offline caches, upload proofs, or simulate GPS spoofing vectors.
                  </p>
                </div>
                <div className="overflow-y-auto flex-grow pr-1">
                  <DeviceSimulator />
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full space-y-4 overflow-hidden">
                <div className="flex items-center justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-sm font-black text-stone-200">Real Field Directory</h2>
                    <p className="text-[10.5px] text-stone-400 mt-0.5 leading-relaxed">
                      Instant connection to dynamically registered employees and their hardware device geolocations.
                    </p>
                  </div>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                {/* Directory Controls */}
                <div className="space-y-2 flex-shrink-0">
                  {/* Search Bar */}
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-stone-500">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by name, department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-stone-900 border border-white/10 text-xs text-stone-200 pl-9 pr-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>

                  {/* Filter Capsules */}
                  <div className="flex gap-1.5 p-1 bg-stone-950/80 rounded-xl border border-white/5 text-[10.5px] font-bold select-none">
                    <button
                      onClick={() => setDirectoryFilter('all')}
                      className={`flex-grow py-1.5 px-3 rounded-lg text-center transition cursor-pointer ${
                        directoryFilter === 'all'
                          ? 'bg-stone-900 border border-white/10 text-stone-200 shadow'
                          : 'text-stone-500 hover:text-stone-400'
                      }`}
                    >
                      All Staff ({tenantEmployees.length})
                    </button>
                    <button
                      onClick={() => setDirectoryFilter('active')}
                      className={`flex-grow py-1.5 px-3 rounded-lg text-center transition cursor-pointer ${
                        directoryFilter === 'active'
                          ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400 shadow'
                          : 'text-stone-500 hover:text-stone-400'
                      }`}
                    >
                      On Shift ({tenantEmployees.filter(emp => activeTracking[emp.id] && activeTracking[emp.id].status !== 'offline').length})
                    </button>
                  </div>
                </div>

                {/* Employee Cards List */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                  {tenantEmployees
                    .filter(emp => {
                      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                           emp.department.toLowerCase().includes(searchQuery.toLowerCase());
                      const tracking = activeTracking[emp.id];
                      const isShiftActive = tracking && tracking.status !== 'offline';
                      const matchesFilter = directoryFilter === 'all' || (directoryFilter === 'active' && isShiftActive);
                      return matchesSearch && matchesFilter;
                    })
                    .map(emp => {
                      const tracking = activeTracking[emp.id];
                      const isShiftActive = tracking && tracking.status !== 'offline';
                      const visitsCount = visits.filter(v => v.employeeId === emp.id).length;

                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (isShiftActive) {
                              setSelectedEmployeeId(emp.id);
                            }
                          }}
                          className={`glass-panel p-3.5 border transition cursor-pointer select-none space-y-3 ${
                            selectedEmployeeId === emp.id && isShiftActive
                              ? 'border-amber-500 bg-amber-950/10 shadow-lg shadow-amber-500/5 scale-[1.01]'
                              : 'hover:border-white/10'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                className="w-9 h-9 rounded-full border border-white/10 bg-stone-900 object-cover flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-stone-200 truncate">{emp.name}</h4>
                                <p className="text-[9.5px] text-stone-500 truncate leading-tight mt-0.5">{emp.role}</p>
                              </div>
                            </div>
                            
                            {/* Shift Status Pill */}
                            {isShiftActive ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[8.5px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse flex-shrink-0">
                                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                ON SHIFT
                              </span>
                            ) : (
                              <span className="bg-stone-900 border border-white/5 text-stone-500 text-[8.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                OFF SHIFT
                              </span>
                            )}
                          </div>

                          {/* Card Details */}
                          {isShiftActive ? (
                            <div className="space-y-2.5 text-left border-t border-white/5 pt-2.5 animate-in fade-in duration-300">
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="bg-stone-950/80 p-2 rounded-xl border border-white/5">
                                  <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Speed</p>
                                  <p className="text-xs font-black text-stone-200 mt-0.5 flex items-center justify-center gap-1">
                                    <Zap size={11} className="text-amber-400 animate-pulse" />
                                    {tracking.speed} km/h
                                  </p>
                                </div>
                                <div className="bg-stone-950/80 p-2 rounded-xl border border-white/5">
                                  <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Battery</p>
                                  <p className="text-xs font-black text-stone-200 mt-0.5 flex items-center justify-center gap-1">
                                    <Battery size={12} className={tracking.batteryLevel < 20 ? 'text-rose-500 animate-pulse animate-bounce' : 'text-emerald-400'} />
                                    {tracking.batteryLevel}%
                                  </p>
                                </div>
                              </div>

                              <div className="bg-stone-950/50 p-2 rounded-xl border border-white/5 space-y-1">
                                <p className="text-[8.5px] text-stone-500 flex items-center gap-1 uppercase font-black"><MapPin size={9} /> Current GPS</p>
                                <p className="text-[9.5px] font-mono text-stone-300 truncate">
                                  {tracking.latitude.toFixed(6)}, {tracking.longitude.toFixed(6)}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[9px] text-stone-400 border-t border-white/5 pt-2 font-semibold">
                                <span>Completed: {visitsCount} client visits</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmployeeId(emp.id);
                                  }}
                                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition"
                                >
                                  <Compass size={11} /> Locate on Map
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 text-left border-t border-white/5 pt-2.5 text-[10px] text-stone-400">
                              <p className="flex items-center gap-2">
                                <Mail size={11} className="text-stone-500 flex-shrink-0" />
                                <span className="truncate">{emp.email || `${emp.name.toLowerCase().split(' ')[0]}@fti.com`}</span>
                              </p>
                              <p className="flex items-center gap-2">
                                <Phone size={11} className="text-stone-500 flex-shrink-0" />
                                <span>{emp.phone || '+1 (555) 123-4567'}</span>
                              </p>
                              <p className="text-[9px] text-stone-500 italic mt-1 text-center bg-stone-950/40 py-1 rounded">
                                Offline · Shift has not started today
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  
                  {tenantEmployees.filter(emp => {
                    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         emp.department.toLowerCase().includes(searchQuery.toLowerCase());
                    const tracking = activeTracking[emp.id];
                    const isShiftActive = tracking && tracking.status !== 'offline';
                    const matchesFilter = directoryFilter === 'all' || (directoryFilter === 'active' && isShiftActive);
                    return matchesSearch && matchesFilter;
                  }).length === 0 && (
                    <div className="text-center py-12 text-stone-500">
                      <p className="text-xs">No matching employee assets found.</p>
                      <p className="text-[10px] mt-1">Verify search terms or register staff in signup gate.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </section>

      </main>

      {/* FLOATING AI ASSISTANT CHATBOT */}
      <ChatBot />
      <NetflixMessenger />

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-stone-950/60 py-6 px-6 mt-12 text-center text-xs text-stone-500 font-semibold max-w-7xl mx-auto w-full">
        <p>© 2026 FieldTracker AI SaaS Systems. Built for high-reliability mobile asset management and route compliance auditing.</p>
      </footer>

    </div>
  );
}
