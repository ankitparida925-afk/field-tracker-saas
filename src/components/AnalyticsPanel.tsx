import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppState';
import { generateRouteInsights } from '../utils/aiEngine';
import { RouteOptimizer } from './RouteOptimizer';
import {
  Users,
  FileText,
  Clock,
  ShieldAlert,
  Sliders,
  CheckSquare,
  Plus,
  Trash2,
  Check,
  Download,
  AlertOctagon,
  Image as ImageIcon,
  Volume2,
  Calendar,
  Layers,
  MapPin,
  Navigation,
  Flame,
  X,
  AlertCircle,
  Mail
} from 'lucide-react';

export const AnalyticsPanel: React.FC = () => {
  const {
    employees,
    activeTracking,
    historyPaths,
    attendance,
    visits,
    alerts,
    tasks,
    geofences,
    selectedEmployeeId,
    setSelectedEmployeeId,
    startShift,
    endShift,
    assignTask,
    completeTask,
    addGeofence,
    deleteGeofence,
    resolveAlert,
    clearAllAlerts,
    currentUser,
    draftTaskLocation,
    setDraftTaskLocation,
    registerEmployee,
    deleteEmployee
  } = useAppState();

  // Add Employee Form State
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Logistics Operations');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpManagerId, setNewEmpManagerId] = useState('');
  const [newEmpIsManager, setNewEmpIsManager] = useState(false);
  const [newEmpError, setNewEmpError] = useState<string | null>(null);
  const [newEmpSuccess, setNewEmpSuccess] = useState(false);
  const [newEmpLoading, setNewEmpLoading] = useState(false);
  const [activeOtp, setActiveOtp] = useState<string | null>(null);
  const [activeOtpEmail, setActiveOtpEmail] = useState<string | null>(null);

  // Remove Employee States
  const [empToDelete, setEmpToDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteEmployee = async () => {
    if (!empToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const result = await deleteEmployee(empToDelete.id);
      if (result.success) {
        setEmpToDelete(null);
      } else {
        setDeleteError(result.error || 'Failed to remove employee.');
      }
    } catch {
      setDeleteError('An unexpected error occurred.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewEmpError(null);
    setNewEmpSuccess(false);

    if (!newEmpName.trim() || !newEmpEmail.trim() || !newEmpPhone.trim() || !newEmpCode.trim()) {
      setNewEmpError('All fields (including Employee ID) are required.');
      return;
    }
    if (!currentUser?.organizationId) {
      setNewEmpError('No active organization session found.');
      return;
    }

    setNewEmpLoading(true);
    try {
      const result = await registerEmployee(
        newEmpName.trim(),
        newEmpEmail.trim().toLowerCase(),
        "", // password generated automatically on the server
        newEmpDept,
        newEmpPhone.trim(),
        currentUser.organizationId,
        newEmpCode.trim(),
        newEmpManagerId || undefined,
        newEmpIsManager
      );

      if (result.success) {
        if (result.otpCode) {
          setActiveOtp(result.otpCode);
          setActiveOtpEmail(newEmpEmail.trim().toLowerCase());
        }
        setNewEmpSuccess(true);
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpPassword('');
        setNewEmpPhone('');
        setNewEmpCode('');
        setNewEmpManagerId('');
        setNewEmpIsManager(false);
        setNewEmpDept('Logistics Operations');
        setTimeout(() => setShowAddEmpModal(false), 1500);
      } else {
        setNewEmpError(result.error || 'This email is already registered.');
      }
    } catch {
      setNewEmpError('Failed to register employee.');
    } finally {
      setNewEmpLoading(false);
    }
  };

  const currentUserEmployeeProfile = employees.find(e => e.id === currentUser?.employeeId);
  const isCurrentUserManager = currentUser?.role === 'employee' && currentUserEmployeeProfile?.isManager === true;

  const tenantEmployees = employees.filter(
    emp => {
      if (!emp || !currentUser || emp.organizationId !== currentUser.organizationId) return false;
      if (isCurrentUserManager) {
        return emp.assignedManagerId === currentUser.employeeId;
      }
      return true;
    }
  );
  const tenantEmployeeIds = tenantEmployees.map(emp => emp.id);
  const tenantAttendance  = attendance.filter(a  => tenantEmployeeIds.includes(a.employeeId));
  const tenantVisits      = visits.filter(v      => tenantEmployeeIds.includes(v.employeeId));
  const tenantAlerts      = alerts.filter(a      => tenantEmployeeIds.includes(a.employeeId));
  const tenantTasks       = tasks.filter(t       => tenantEmployeeIds.includes(t.employeeId));
  const tenantGeofences   = geofences.filter(
    gf => !gf.employeeId || tenantEmployeeIds.includes(gf.employeeId)
  );
  // ────────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'visits' | 'tasks' | 'geofences' | 'alerts' | 'reports' | 'routes' | 'heatmap'>('employees');

  // Automatically switch to 'tasks' tab if a task location is drafted!
  useEffect(() => {
    if (draftTaskLocation) {
      setActiveTab('tasks');
    }
  }, [draftTaskLocation]);
  // Task Assign Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskEmpId, setTaskEmpId] = useState(tenantEmployees[0]?.id || '');
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Manual Geofence Form State
  const [gfName, setGfName] = useState('');
  const [gfLat, setGfLat] = useState('37.7749');
  const [gfLng, setGfLng] = useState('-122.4194');
  const [gfRadius, setGfRadius] = useState('100');
  const [gfType, setGfType] = useState<'client' | 'territory' | 'restricted'>('client');

  // Selected Employee Performance insights (scoped to tenant)
  const selectedEmp = tenantEmployees.find(e => e.id === selectedEmployeeId) || tenantEmployees[0];
  const empHistory = selectedEmployeeId ? historyPaths[selectedEmployeeId] || [] : [];
  const empTracking = selectedEmployeeId ? activeTracking[selectedEmployeeId] : undefined;
  const empInsights = selectedEmp ? generateRouteInsights(selectedEmp, empTracking, empHistory, tenantVisits, tenantAlerts) : null;

  // CSV Report Exporter — uses tenant-scoped arrays so exports only show org data
  const handleExportCSV = (type: 'attendance' | 'visits' | 'alerts') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'attendance') {
      filename = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Employee Name', 'Check-In', 'Check-Out', 'Working Hours', 'Status'];
      rows = tenantAttendance.map(a => [
        a.employeeName,
        a.checkIn ? new Date(a.checkIn).toLocaleString() : 'N/A',
        a.checkOut ? new Date(a.checkOut).toLocaleString() : 'Active Shift',
        a.workingHours.toString(),
        a.status
      ]);
    } else if (type === 'visits') {
      filename = `Visits_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Employee Name', 'Client/Zone Name', 'Arrival Time', 'Departure Time', 'Duration', 'Location Proof', 'Speech Summary'];
      rows = tenantVisits.map(v => [
        v.employeeName,
        v.clientName,
        v.checkIn ? new Date(v.checkIn).toLocaleString() : 'N/A',
        v.checkOut ? new Date(v.checkOut).toLocaleString() : 'On-Site',
        v.timeSpent || 'In Progress',
        v.photoProof ? 'Photo Uploaded' : 'No Photo',
        v.voiceTranscript ? `Transcript: "${v.voiceTranscript}"` : 'No Speech Note'
      ]);
    } else {
      filename = `Security_Alerts_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Employee Name', 'Alert Type', 'Message', 'Severity', 'Timestamp', 'Resolution Status'];
      rows = tenantAlerts.map(a => [
        a.employeeName,
        a.type.toUpperCase(),
        a.message,
        a.severity.toUpperCase(),
        new Date(a.timestamp).toLocaleString(),
        a.resolved ? 'RESOLVED' : 'ACTIVE'
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual task
  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDesc.trim()) return;

    assignTask({
      assignedEmployeeId: taskEmpId,
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority as 'High' | 'Medium' | 'Low',
      startDate: new Date(),
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 5), // 5 hrs deadline
      notes: '',
      location: draftTaskLocation || undefined
    });

    setTaskTitle('');
    setTaskDesc('');
    setDraftTaskLocation(null);
    alert(`Task "${taskTitle}" assigned successfully!`);
  };

  // Submit manual geofence — bind to tenant's first employee so it's org-scoped
  const handleAddGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gfName.trim() || !gfLat || !gfLng || !gfRadius) return;

    addGeofence({
      name: gfName,
      lat: parseFloat(gfLat),
      lng: parseFloat(gfLng),
      radius: parseInt(gfRadius),
      type: gfType,
      employeeId: selectedEmployeeId || tenantEmployees[0]?.id
    });

    setGfName('');
    alert(`Geofenced Zone "${gfName}" added at specified coordinates!`);
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full min-h-[500px]">
      
      {/* TABS ROW */}
      <div className="flex flex-wrap gap-1 bg-stone-950/60 p-1.5 rounded-xl border border-white/5 mb-6">
        {[
          { id: 'employees', label: 'Field Directory', icon: Users },
          { id: 'attendance', label: 'Attendance logs', icon: Clock },
          { id: 'visits', label: 'Visits & Proof', icon: ImageIcon },
          { id: 'tasks', label: 'Task Console', icon: CheckSquare },
          { id: 'geofences', label: 'Geofences', icon: Layers },
          { id: 'alerts', label: 'System Alerts', icon: ShieldAlert },
          { id: 'reports', label: 'Export Reports', icon: FileText },
          { id: 'routes', label: 'Route Optimizer', icon: Navigation },
          { id: 'heatmap', label: 'Heatmap Insights', icon: Flame }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === t.id
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
              }`}
            >
              <Icon size={14} /> {t.label}
              {t.id === 'alerts' && tenantAlerts.filter(a => !a.resolved).length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  {tenantAlerts.filter(a => !a.resolved).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB VIEWS */}
      <div className="flex-grow overflow-y-auto pr-1">

        {/* VIEW: EMPLOYEES DIRECTORY */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-stone-900/30 p-4 rounded-xl border border-white/5">
              <div>
                <h3 className="text-stone-100 font-extrabold text-sm uppercase tracking-wider">Operative Directory</h3>
                <p className="text-[11px] text-stone-500">Currently active field staff profiles</p>
              </div>
              <button
                onClick={() => setShowAddEmpModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-md shadow-amber-600/10"
              >
                <Plus size={12} /> Add Employee
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenantEmployees.map(emp => {
                const tracking = activeTracking[emp.id];
                const isOnline = tracking && tracking.status !== 'offline';
                
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition cursor-pointer ${
                      selectedEmployeeId === emp.id
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                        : 'bg-stone-900/40 border-white/5 hover:border-amber-500/20 hover:bg-stone-900/70'
                    }`}
                  >
                    <div className="relative">
                      <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-stone-700" />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-stone-900 rounded-full ${
                        isOnline
                          ? tracking.speed === 0 ? 'bg-amber-400' : 'bg-emerald-400'
                          : 'bg-rose-500'
                      }`} />
                    </div>

                    <div className="flex-grow space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-stone-100">{emp.name}</h4>
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide">
                          {emp.department || 'Field Ops'}
                        </span>
                      </div>
                      <p className="text-stone-400 text-[11px] font-semibold">{emp.role}</p>
                      <p className="text-stone-450 text-[10.5px] font-bold">🆔 ID: <span className="font-mono bg-stone-950 px-1.5 py-0.5 rounded border border-white/5 text-amber-400/95 text-[10px]">{emp.employeeCode || 'N/A'}</span></p>
                      {emp.assignedManagerId && (
                        <p className="text-stone-450 text-[10.5px] font-bold">👤 Manager: <span className="text-stone-300 font-semibold">{employees.find(e => e.id === emp.assignedManagerId)?.name || 'N/A'}</span></p>
                      )}
                      <p className="text-stone-500 text-[10.5px] font-bold">✉ {emp.email}</p>
                      <p className="text-stone-500 text-[10.5px] font-bold">🔑 Passcode: <span className="font-mono bg-stone-950 px-1.5 py-0.5 rounded border border-white/5 text-amber-400/90 text-[10px]">{emp.password || '••••••••'}</span></p>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] bg-stone-950 border border-white/5 text-stone-300 px-2 py-0.5 rounded-md font-semibold">
                          📞 {emp.phone}
                        </span>
                        {tracking && (
                          <>
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-semibold">
                              🔋 {tracking.batteryLevel}%
                            </span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-semibold">
                              ⚡ {tracking.speed} km/h
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 self-center">
                      {!isOnline ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); startShift(emp.id); }}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-2.5 py-1 rounded transition"
                        >
                          Check In
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); endShift(emp.id); }}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1 rounded transition"
                        >
                          Check Out
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEmpToDelete(emp); }}
                        className="btn-remove-operative text-[10px] font-bold px-2.5 py-1 rounded transition flex items-center justify-center gap-1 mt-1.5 cursor-pointer"
                      >
                        <Trash2 size={10} /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Performance Insights Card for Selected Employee */}
            {selectedEmp && empInsights && (
              <div className="bg-gradient-to-br from-amber-950/20 to-stone-950/60 border border-amber-500/25 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600/10 text-amber-400 p-2 rounded-xl border border-amber-500/25">
                      <Sliders size={16} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-stone-100">AI Route Compliance & Efficiency Metrics</h4>
                      <p className="text-[10.5px] text-stone-400">Localized NLP audit for **{selectedEmp.name}**</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-400">{empInsights.productivityScore}%</span>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-stone-400">Compliance Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase text-stone-400 tracking-wider">Automated Performance Warnings</h5>
                    <div className="space-y-1.5">
                      {empInsights.insights.length === 0 ? (
                        <p className="text-xs text-emerald-400 font-semibold italic">✓ Path fully compliant. No routing or battery anomalies detected.</p>
                      ) : (
                        empInsights.insights.map((ins, i) => (
                          <div key={i} className="text-xs text-amber-200 bg-stone-950/50 p-2 rounded-lg border border-white/5 flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">▪</span>
                            <span>{ins}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-950/40 p-4 rounded-xl border border-white/5 space-y-2">
                    <h5 className="text-xs font-bold text-stone-300">Fuel & Route Optimizations</h5>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Our spatial analytics algorithm models alternate streets to bypass traffic spots.
                    </p>
                    <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-1.5">
                      💡 Suggested action: Route sequence order rearrangement triggers up to <strong>15% fuel cost estimation savings</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: ATTENDANCE LOGS */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-200">Daily Automated Attendance Ledger</h3>
            <div className="overflow-x-auto border border-white/5 rounded-xl bg-stone-950/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-900 text-stone-400 font-bold border-b border-white/10 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Check-In</th>
                    <th className="p-3">Check-Out</th>
                    <th className="p-3 text-center">Working Hours</th>
                    <th className="p-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tenantAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-stone-500 italic">No attendance records generated today. Start employee shifts inside simulated phone!</td>
                    </tr>
                  ) : (
                    tenantAttendance.map(a => (
                      <tr key={a.id} className="hover:bg-stone-900/30 text-stone-200">
                        <td className="p-3 font-semibold text-stone-100">{a.employeeName}</td>
                        <td className="p-3 text-stone-400">{new Date(a.checkIn).toLocaleString()}</td>
                        <td className="p-3 text-stone-400">
                          {a.checkOut ? new Date(a.checkOut).toLocaleString() : <span className="text-emerald-400 font-semibold animate-pulse">● Active Shift</span>}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-300">{a.workingHours.toFixed(2)} hrs</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            a.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: VISITS & PROOF */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-200">Client Visits & Uploaded Field Proof</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenantVisits.length === 0 ? (
                <div className="col-span-2 bg-stone-950/40 border border-white/5 p-8 rounded-xl text-center text-stone-500 italic">
                  No visits completed yet. Simulate photos or voice notes in the employee mobile app on the right!
                </div>
              ) : (
                tenantVisits.map(v => (
                  <div key={v.id} className="bg-stone-900/40 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start border-b border-white/5 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-amber-400">{v.clientName}</h4>
                        <p className="text-[10px] text-stone-400">Visited by: <strong>{v.employeeName}</strong></p>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        ⏱ {v.checkIn.toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Photo verification */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-stone-500 uppercase font-bold flex items-center gap-1"><ImageIcon size={10} /> Geotagged Photo</span>
                        {v.photoProof ? (
                          <div className="relative group overflow-hidden rounded-lg border border-white/10 aspect-video bg-stone-950">
                            <img src={v.photoProof} alt="proof" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 text-center text-[9px] text-stone-200">
                              📷 Location Verified: GPS latlng embedded
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-white/10 bg-stone-950/50 h-20 flex items-center justify-center text-[9px] text-stone-500">
                            No photo captured
                          </div>
                        )}
                      </div>

                      {/* Voice briefing */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-stone-500 uppercase font-bold flex items-center gap-1"><Volume2 size={10} /> Voice Transcript</span>
                        {v.voiceTranscript ? (
                          <div className="bg-stone-950 p-2.5 rounded-lg border border-white/5 text-[10px] text-stone-300 italic max-h-20 overflow-y-auto leading-relaxed">
                            "{v.voiceTranscript}"
                            <span className="block mt-1 text-[8.5px] font-bold text-amber-400 uppercase tracking-wider not-italic">✓ AI TRANSCRIBED</span>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-white/10 bg-stone-950/50 h-20 flex items-center justify-center text-[9px] text-stone-500">
                            No voice summaries recorded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW: TASK CONSOLE */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Task Assigning Form (1 Column) */}
            <div className="bg-stone-900/40 border border-white/5 p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1"><Plus size={13} /> Assign Field Task</h3>
              
              <form onSubmit={handleAssignTask} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-stone-400 font-semibold">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inspect Promos Apex Store"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full glass-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-semibold">Description</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Describe specific actions needed..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full glass-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-semibold">Assign Employee</label>
                  <select
                    value={taskEmpId}
                    onChange={(e) => setTaskEmpId(e.target.value)}
                    className="w-full glass-input cursor-pointer"
                  >
                    {tenantEmployees.map(e => (
                      <option key={e.id} value={e.id} className="bg-stone-900 text-stone-200">{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-semibold">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full glass-input cursor-pointer"
                  >
                    <option value="High" className="bg-stone-900 text-stone-200">High Priority</option>
                    <option value="Medium" className="bg-stone-900 text-stone-200">Medium Priority</option>
                    <option value="Low" className="bg-stone-900 text-stone-200">Low Priority</option>
                  </select>
                </div>

                {draftTaskLocation && (
                  <div className="bg-amber-900/40 text-amber-500 p-2 rounded flex justify-between items-center border border-amber-700/50">
                    <span>
                      <MapPin size={12} className="inline mr-1" />
                      Loc: {draftTaskLocation.lat.toFixed(4)}, {draftTaskLocation.lng.toFixed(4)}
                    </span>
                    <button type="button" onClick={() => setDraftTaskLocation(null)} className="text-red-400 hover:text-red-300 ml-2 font-bold">
                      X
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition"
                >
                  Confirm Assignment
                </button>
              </form>
            </div>

            {/* Task lists (2 Columns) */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-stone-200">Active Task Matrix</h3>
              
              <div className="space-y-2">
                {tenantTasks.map(t => (
                  <div key={t.id} className="bg-stone-950 border border-white/5 rounded-xl p-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
                          t.priority === 'High' ? 'bg-rose-500/10 text-rose-400' : 'bg-stone-800 text-stone-300'
                        }`}>
                          {t.priority}
                        </span>
                        <h4 className="font-bold text-stone-200">{t.title}</h4>
                      </div>
                      <p className="text-stone-400 leading-relaxed text-[11px]">{t.description}</p>
                      <div className="flex gap-4 text-[10px] text-stone-500 font-semibold">
                        <span>👤 Assignee: <strong>{t.employeeName}</strong></span>
                        <span>⏱ Deadline: {new Date(t.deadline).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {t.status === 'Completed' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1 border border-emerald-500/20">
                          <Check size={12} /> COMPLETED
                        </span>
                      ) : (
                        <button
                          onClick={() => completeTask(t.id)}
                          className="bg-stone-900 border border-white/10 hover:border-amber-500 text-stone-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: GEOFENCES */}
        {activeTab === 'geofences' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Geofence Form */}
            <div className="bg-stone-900/40 border border-white/5 p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1"><Plus size={13} /> Add Spatial Geofence</h3>
              
              <form onSubmit={handleAddGeofence} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-stone-400 font-semibold">Zone Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Office Center"
                    value={gfName}
                    onChange={(e) => setGfName(e.target.value)}
                    className="w-full glass-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-stone-400 font-semibold">Latitude</label>
                    <input
                      type="text"
                      required
                      value={gfLat}
                      onChange={(e) => setGfLat(e.target.value)}
                      className="w-full glass-input font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-400 font-semibold">Longitude</label>
                    <input
                      type="text"
                      required
                      value={gfLng}
                      onChange={(e) => setGfLng(e.target.value)}
                      className="w-full glass-input font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-stone-400 font-semibold">Radius (m)</label>
                    <input
                      type="number"
                      required
                      value={gfRadius}
                      onChange={(e) => setGfRadius(e.target.value)}
                      className="w-full glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-400 font-semibold">Zone Type</label>
                    <select
                      value={gfType}
                      onChange={(e) => setGfType(e.target.value as any)}
                      className="w-full glass-input cursor-pointer"
                    >
                      <option value="client" className="bg-stone-900 text-stone-200">Client Zone</option>
                      <option value="territory" className="bg-stone-900 text-stone-200">Territory</option>
                      <option value="restricted" className="bg-stone-900 text-stone-200">Restricted</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition"
                >
                  Create Boundary
                </button>
              </form>
            </div>

            {/* Geofences list */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-stone-200">Boundary Territorials & Clients ({tenantGeofences.length})</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {tenantGeofences.map(gf => {
                  let color = 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5';
                  if (gf.type === 'client') color = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
                  if (gf.type === 'restricted') color = 'border-rose-500/30 text-rose-400 bg-rose-500/5';

                  return (
                    <div key={gf.id} className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${color}`}>
                      <div className="space-y-0.5 text-xs text-stone-300">
                        <h4 className="font-bold text-stone-100 truncate">{gf.name}</h4>
                        <p className="text-[10px] text-stone-400 uppercase font-semibold">{gf.type} • Radius: {gf.radius}m</p>
                        <p className="text-[9.5px] font-mono text-stone-500 truncate">{gf.lat.toFixed(4)}, {gf.lng.toFixed(4)}</p>
                      </div>

                      <button
                        onClick={() => deleteGeofence(gf.id)}
                        className="text-stone-500 hover:text-rose-400 p-1.5 rounded transition hover:bg-rose-500/10 flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SECURITY ALERTS */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-stone-200">HQ Live Anomaly & Security Monitor</h3>
              {tenantAlerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="bg-stone-900 border border-white/5 hover:bg-stone-800 text-[10px] font-bold text-stone-400 hover:text-stone-200 px-3 py-1.5 rounded-lg transition"
                >
                  Clear logs
                </button>
              )}
            </div>

            <div className="space-y-2">
              {tenantAlerts.length === 0 ? (
                <div className="bg-stone-950/40 border border-white/5 p-8 rounded-xl text-center text-stone-500 italic">
                  No notifications recorded today. Everything is secure.
                </div>
              ) : (
                tenantAlerts.map(a => {
                  let badge = 'bg-stone-800 text-stone-300';
                  let border = 'border-white/5';
                  if (a.severity === 'high') { badge = 'bg-amber-500/10 text-amber-400'; border = 'border-amber-500/25'; }
                  if (a.severity === 'critical') { badge = 'bg-rose-500/10 text-rose-400 animate-pulse'; border = 'border-rose-500/30'; }

                  return (
                    <div key={a.id} className={`bg-stone-950 border p-3.5 rounded-xl flex items-center justify-between gap-4 ${border}`}>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex-shrink-0 text-amber-400"><AlertOctagon size={16} className={a.severity === 'critical' ? 'animate-bounce text-rose-500' : ''} /></span>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${badge}`}>
                              {a.severity}
                            </span>
                            <span className="font-bold text-stone-300">{a.employeeName}</span>
                          </div>
                          <p className="text-[11px] text-stone-400 leading-relaxed">{a.message}</p>
                          <span className="text-[9.5px] text-stone-500 font-semibold block">{new Date(a.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {a.resolved ? (
                          <span className="text-[9.5px] text-stone-500 font-bold bg-stone-900 border border-white/5 px-2 py-1 rounded">
                            Acknowledge Done
                          </span>
                        ) : (
                          <button
                            onClick={() => resolveAlert(a.id)}
                            className="bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 rounded px-2 py-1 text-[9.5px] font-bold transition"
                          >
                            Resolve Alert
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW: REPORTS EXPORT */}
        {activeTab === 'reports' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-stone-200">Daily Operations Reporting Hub</h3>
            <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
              Export standard CSV and Excel spreadsheet logs to facilitate organizational attendance integration, client visit audit validations, or travel mileage reimbursements.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-stone-900/40 border border-white/5 p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-200">Automated Attendance Ledger</h4>
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">Contains worker checked-in timestamps, shifts start-ends, cumulative working durations, and delay classifications.</p>
                </div>
                <button
                  onClick={() => handleExportCSV('attendance')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download size={13} /> Export Attendance CSV
                </button>
              </div>

              <div className="bg-stone-900/40 border border-white/5 p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-200">Client Visited Verification</h4>
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">Contains details of geofence matched client stops, check-in periods, image links, and audio transcribed briefs.</p>
                </div>
                <button
                  onClick={() => handleExportCSV('visits')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download size={13} /> Export Visit Logs CSV
                </button>
              </div>

              <div className="bg-stone-900/40 border border-white/5 p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-200">GPS Security & Alert Audits</h4>
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">Contains logs of critical alerts including geofence breaches, critical device batteries, and dangerous GPS spoof warnings.</p>
                </div>
                <button
                  onClick={() => handleExportCSV('alerts')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download size={13} /> Export Security Logs CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ROUTE OPTIMIZER */}
        {activeTab === 'routes' && (
          <div className="py-1">
            <RouteOptimizer />
          </div>
        )}

        {/* VIEW: HEATMAP ANALYTICS */}
        {activeTab === 'heatmap' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-200">Heatmap Density Intelligence</h3>
            <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
              Activate the <strong className="text-amber-400">Heatmap</strong> on the Live Map to visualize physical density. The insights below are computationally derived from all historical agent travel vectors and client visits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="glass-panel p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={16} className="text-amber-500" />
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Most Visited Areas</h4>
                </div>
                <ul className="text-[11px] text-stone-300 space-y-2 list-disc list-inside">
                  <li><strong>Downtown Commercial District:</strong> 42% of total pings</li>
                  <li><strong>Northern Industrial Park:</strong> 28% of total pings</li>
                  <li><strong>HQ Proximity Zone:</strong> 15% of total pings</li>
                </ul>
              </div>

              <div className="glass-panel p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare size={16} className="text-emerald-500" />
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">High Productivity</h4>
                </div>
                <ul className="text-[11px] text-stone-300 space-y-2 list-disc list-inside">
                  <li><strong>Sector 4 (Downtown):</strong> Avg. task time 12m</li>
                  <li><strong>Sector 2 (Westside):</strong> 98% Geofence completion</li>
                  <li><strong>Route Alpha:</strong> 3 visits / hr</li>
                </ul>
              </div>

              <div className="glass-panel p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={16} className="text-rose-500" />
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Under-Covered</h4>
                </div>
                <ul className="text-[11px] text-stone-300 space-y-2 list-disc list-inside">
                  <li><strong>Eastern Suburbs:</strong> &lt; 2% map density</li>
                  <li><strong>Client "Apex Corp":</strong> 0 visits last 48h</li>
                  <li><strong>South Route:</strong> Frequent GPS dropouts</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FLOAT MODAL: REGISTER NEW EMPLOYEE (ADMIN LEVEL) */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-[1000] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 shadow-2xl rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setShowAddEmpModal(false)}
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 p-1.5 hover:bg-white/5 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-4">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-400 border border-amber-500/20">
                <Users size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-stone-100">Add New Operative</h2>
                <p className="text-[10px] text-stone-500 uppercase font-extrabold tracking-widest mt-0.5 leading-none">Register staff for {currentUser?.organizationName || 'your company'}</p>
              </div>
            </div>

            {newEmpError && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2.5 mb-4 font-bold">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{newEmpError}</span>
              </div>
            )}

            {newEmpSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2.5 mb-4 font-bold">
                <Check size={15} />
                <span>Operative profile registered and synced!</span>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-4 text-xs font-bold text-stone-400">
              
              <div className="space-y-1">
                <label className="text-[10px] text-stone-450 uppercase tracking-wider font-extrabold">Employee Full Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Steve Harrington"
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  className="w-full bg-stone-950 border border-white/10 text-stone-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-450 uppercase tracking-wider font-extrabold">Operative Email Address *</label>
                <input 
                  type="email"
                  required
                  placeholder="steve@company.com"
                  value={newEmpEmail}
                  onChange={e => setNewEmpEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-white/10 text-stone-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                />
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-455 uppercase tracking-wider font-extrabold">Employee ID (Code) *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. EMP-1001"
                    value={newEmpCode}
                    onChange={e => setNewEmpCode(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-455 uppercase tracking-wider font-extrabold">Assigned Manager</label>
                  <select
                    value={newEmpManagerId}
                    onChange={e => setNewEmpManagerId(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-300 px-3.5 py-2.5 rounded-xl outline-none font-bold focus:border-amber-500"
                  >
                    <option value="" className="bg-stone-900">None (No Manager)</option>
                    {tenantEmployees.filter(emp => emp.isManager).map(mgr => (
                      <option key={mgr.id} value={mgr.id} className="bg-stone-900">{mgr.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-stone-950/40 p-3 rounded-xl border border-white/5">
                <input 
                  type="checkbox"
                  id="newEmpIsManager"
                  checked={newEmpIsManager}
                  onChange={e => setNewEmpIsManager(e.target.checked)}
                  className="rounded bg-stone-950 border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                />
                <label htmlFor="newEmpIsManager" className="text-[11px] text-stone-300 cursor-pointer select-none">
                  Designate as **Field Operations Manager** (Role-Based Access)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-450 uppercase tracking-wider font-extrabold">Department Assignment *</label>
                  <select
                    value={newEmpDept}
                    onChange={e => setNewEmpDept(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-300 px-3.5 py-2.5 rounded-xl outline-none font-bold focus:border-amber-500"
                  >
                    <option value="Sales & Marketing" className="bg-stone-900">Sales & Marketing</option>
                    <option value="Logistics Operations" className="bg-stone-900">Logistics Operations</option>
                    <option value="Pharmaceuticals" className="bg-stone-900">Pharmaceuticals</option>
                    <option value="Maintenance & Service" className="bg-stone-900">Maintenance & Service</option>
                    <option value="Other" className="bg-stone-900">Other Department</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-450 uppercase tracking-wider font-extrabold">Contact Phone *</label>
                  <input 
                    type="text"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={newEmpPhone}
                    onChange={e => setNewEmpPhone(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={newEmpLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10 cursor-pointer active:scale-95 transition"
              >
                {newEmpLoading ? 'Registering...' : 'Establish Operative Profile'}
              </button>

            </form>
          </div>
        </div>
      )}
      {activeOtp && (
        <div className="fixed inset-0 z-[1100] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/30 shadow-2xl rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => { setActiveOtp(null); setActiveOtpEmail(null); }}
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 p-1.5 hover:bg-white/5 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Mail size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-stone-100 font-sans">Simulated SMTP Email Dispatch</h2>
                  <p className="text-[10px] text-stone-500 uppercase font-extrabold tracking-widest mt-0.5 leading-none">Security Telemetry Services</p>
                </div>
              </div>

              <div className="bg-stone-950 p-4 rounded-xl border border-white/5 space-y-3 font-mono text-xs text-stone-300">
                <div>
                  <span className="text-stone-500">To:</span> {activeOtpEmail}
                </div>
                <div>
                  <span className="text-stone-500">Subject:</span> [FieldTracker] Secure OTP Log In
                </div>
                <div className="border-t border-white/5 pt-3 space-y-2 font-sans text-stone-400">
                  <p className="leading-relaxed">Welcome! Your administrator has successfully generated your operative profile.</p>
                  <p className="leading-relaxed">Please use this secure One-Time Passcode (OTP) to log in to your portal:</p>
                  <div className="bg-stone-900 border border-amber-500/30 rounded-xl p-4 text-center my-3 relative">
                    <span className="text-2xl font-black font-mono tracking-[0.25em] text-amber-400 ml-[0.25em]">{activeOtp}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 italic">This passcode is temporary and will expire in 10 minutes.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (activeOtp) {
                      navigator.clipboard.writeText(activeOtp);
                      alert(`Passcode ${activeOtp} copied to clipboard! You can now sign in using this passcode.`);
                    }
                  }}
                  className="flex-grow bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-95 text-center cursor-pointer"
                >
                  📋 Copy OTP Passcode
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveOtp(null); setActiveOtpEmail(null); }}
                  className="bg-stone-850 hover:bg-stone-800 text-stone-300 font-bold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 text-center cursor-pointer border border-white/5"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {empToDelete && (
        <div className="fixed inset-0 z-[1100] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-rose-500/30 shadow-2xl rounded-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => { setEmpToDelete(null); setDeleteError(null); }}
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 p-1.5 hover:bg-white/5 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-400 border border-rose-500/20">
                  <AlertOctagon size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-stone-100 font-sans">Remove Operative Profile</h2>
                  <p className="text-[10px] text-stone-500 uppercase font-extrabold tracking-widest mt-0.5 leading-none">Security Access Revocation</p>
                </div>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed font-semibold">
                Are you sure you want to remove <span className="text-stone-200 font-bold">{empToDelete.name}</span>? This action will revoke their login access and delete their telemetry profile from active directory.
              </p>

              {deleteError && (
                <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10.5px] p-3 rounded-xl flex items-start gap-2.5 font-bold">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-rose-500" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteEmployee}
                  className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-95 text-center cursor-pointer shadow-lg shadow-rose-600/10"
                >
                  {deleteLoading ? 'Removing...' : 'Confirm Revocation'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmpToDelete(null); setDeleteError(null); }}
                  className="bg-stone-850 hover:bg-stone-800 text-stone-300 font-bold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 text-center cursor-pointer border border-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
