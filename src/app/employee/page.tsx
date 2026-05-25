'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../context/AppState';
import {
  MapPin, LogOut, Navigation, Battery, Zap, Wifi, WifiOff,
  Clock, CheckCircle, AlertTriangle, Play, Square, Activity,
  User, Building, Radio, ClipboardList, Navigation2
} from 'lucide-react';

const GPS_INTERVAL_MS = 5000; // Ping every 5 seconds

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180, dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function EmployeePage() {
  const {
    currentUser, logout,
    employees, activeTracking,
    startShift, endShift, injectGPSPing, setGPSSource,
    alerts, tasks, completeTask
  } = useAppState();

  const router = useRouter();
  const [mounted,    setMounted]    = React.useState(false);
  const [gpsStatus,  setGpsStatus]  = React.useState<'idle'|'acquiring'|'live'|'error'>('idle');
  const [gpsError,   setGpsError]   = React.useState('');
  const [accuracy,   setAccuracy]   = React.useState<number|null>(null);
  const [pingCount,  setPingCount]  = React.useState(0);
  const [lastPingAt, setLastPingAt] = React.useState<Date|null>(null);
  const [secondsAgo, setSecondsAgo] = React.useState(0);

  const watchIdRef      = React.useRef<number|null>(null);
  const intervalRef     = React.useRef<ReturnType<typeof setInterval>|null>(null);
  const timerRef        = React.useRef<ReturnType<typeof setInterval>|null>(null);
  const hasStartedRef   = React.useRef(false);
  const lastPosRef      = React.useRef<GeolocationPosition|null>(null);
  const shiftActiveRef  = React.useRef(false);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    if (mounted && !currentUser) router.replace('/');
  }, [mounted, currentUser, router]);

  const employee = React.useMemo(() =>
    employees.find(e => e.id === currentUser?.employeeId) ?? null,
    [currentUser, employees]
  );

  const tracking  = employee ? activeTracking[employee.id] : null;
  const isOnDuty  = !!tracking && tracking.status !== 'offline';
  const myAlerts  = alerts.filter(a => a.employeeId === employee?.id && !a.resolved).slice(0,3);
  const myTasks = tasks.filter(t => t.employeeId === employee?.id && t.status === 'Pending');

  // ── "seconds ago" counter ────────────────────────────────────────────────
  React.useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (lastPingAt) setSecondsAgo(Math.round((Date.now() - lastPingAt.getTime()) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lastPingAt]);

  // ── Send one GPS ping ────────────────────────────────────────────────────
  const sendPing = React.useCallback((pos: GeolocationPosition) => {
    if (!employee || !shiftActiveRef.current) return;
    const { latitude, longitude, accuracy: acc } = pos.coords;
    lastPosRef.current = pos;
    setAccuracy(Math.round(acc));
    injectGPSPing(employee.id, latitude, longitude); // speed auto-calculated in AppState
    setPingCount(c => c + 1);
    setLastPingAt(new Date());
    setSecondsAgo(0);
  }, [employee, injectGPSPing]);

  // ── Stop everything ──────────────────────────────────────────────────────
  const stopTracking = React.useCallback(() => {
    if (watchIdRef.current !== null)  { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null; }
    shiftActiveRef.current = false;
  }, []);

  // ── Go Off Duty ──────────────────────────────────────────────────────────
  const handleEndShift = React.useCallback(() => {
    stopTracking();
    if (employee) endShift(employee.id);
    setGpsStatus('idle');
    setPingCount(0);
    setLastPingAt(null);
    hasStartedRef.current = false;
  }, [employee, endShift, stopTracking]);

  // ── Go On Duty ───────────────────────────────────────────────────────────
  const handleStartShift = React.useCallback(() => {
    if (!employee || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation not supported on this device.');
      return;
    }
    setGpsStatus('acquiring');
    setGpsError('');

    // Get first fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setAccuracy(Math.round(acc));
        lastPosRef.current = pos;
        hasStartedRef.current = true;
        shiftActiveRef.current = true;

        // Start shift with initial real GPS coordinates
        startShift(employee.id, latitude, longitude);
        setGPSSource(employee.id, 'real');
        setGpsStatus('live');
        setPingCount(1);
        setLastPingAt(new Date());

        // ① Continuous watchPosition for immediate movement detection
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => { lastPosRef.current = p; },
          (e) => console.warn('GPS watch error:', e.message),
          { enableHighAccuracy: true, maximumAge: 3000 }
        );

        // ② Forced 5-second interval to guarantee regular pings
        intervalRef.current = setInterval(() => {
          if (lastPosRef.current && shiftActiveRef.current) {
            sendPing(lastPosRef.current);
          }
        }, GPS_INTERVAL_MS);
      },
      (err) => {
        setGpsStatus('error');
        setGpsError(`GPS failed: ${err.message}. Please allow location and retry.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [employee, startShift, setGPSSource, sendPing]);

  // Cleanup on unmount
  React.useEffect(() => () => stopTracking(), [stopTracking]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0f0a06] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-amber-500/15 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Authenticating…</p>
        </div>
      </div>
    );
  }

  const statusColor =
    gpsStatus === 'live'      ? '#10b981' :
    gpsStatus === 'acquiring' ? '#f59e0b' :
    gpsStatus === 'error'     ? '#ef4444' : '#475569';

  return (
    <div className="min-h-screen w-full bg-[#0f0a06] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -transtone-x-1/2 w-[400px] h-[400px] rounded-full bg-amber-600/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-emerald-500/6 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 space-y-3">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="bg-stone-950/80 backdrop-blur border border-white/8 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Field Operative</p>
              <p className="text-sm font-black text-stone-100">{currentUser.name}</p>
              {currentUser.organizationName && (
                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                  <Building size={9}/> {currentUser.organizationName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => { handleEndShift(); logout(); router.replace('/'); }}
            className="bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl text-[10.5px] font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={11}/> Log Out
          </button>
        </div>

        {/* ── GPS Tracking Card ─────────────────────────────────────────── */}
        <div className="bg-stone-950/80 backdrop-blur border border-white/8 rounded-2xl p-5 space-y-4">

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ background: statusColor + '18', border: `1px solid ${statusColor}44`, borderRadius: 10, padding: 8, color: statusColor, display:'flex' }}>
                <Navigation size={16} style={{ animation: gpsStatus === 'live' || gpsStatus === 'acquiring' ? 'ep-spin 2s linear infinite' : 'none' }}/>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">GPS Status</p>
                <p className="text-xs font-bold" style={{ color: statusColor }}>
                  {gpsStatus === 'idle'      && 'Standby — Not on duty'}
                  {gpsStatus === 'acquiring' && 'Acquiring satellite fix…'}
                  {gpsStatus === 'live'      && 'Live · Sending pings every 5s'}
                  {gpsStatus === 'error'     && 'GPS Error'}
                </p>
              </div>
            </div>
            {gpsStatus === 'live' && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"/>
              </span>
            )}
          </div>

          {/* Error */}
          {gpsStatus === 'error' && gpsError && (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 flex items-start gap-2 text-[10.5px] text-rose-300">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-rose-400"/>
              <span>{gpsError}</span>
            </div>
          )}

          {/* Ping stats strip */}
          {gpsStatus === 'live' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-stone-900/70 border border-white/5 rounded-xl p-2.5 text-center">
                <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Pings Sent</p>
                <p className="text-sm font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                  <Radio size={10}/> {pingCount}
                </p>
              </div>
              <div className="bg-stone-900/70 border border-white/5 rounded-xl p-2.5 text-center">
                <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Last Ping</p>
                <p className="text-sm font-black mt-0.5" style={{ color: secondsAgo <= 7 ? '#10b981' : '#f59e0b' }}>
                  {secondsAgo}s ago
                </p>
              </div>
              <div className="bg-stone-900/70 border border-white/5 rounded-xl p-2.5 text-center">
                <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Accuracy</p>
                <p className="text-sm font-black text-stone-200 mt-0.5">
                  {accuracy !== null ? `±${accuracy}m` : '…'}
                </p>
              </div>
            </div>
          )}

          {/* Coordinates + telemetry */}
          {tracking && tracking.status !== 'offline' && (
            <div className="bg-stone-900/60 border border-white/5 rounded-xl p-3 space-y-2.5">
              <p className="text-[9px] text-stone-500 font-black uppercase tracking-wider flex items-center gap-1">
                <MapPin size={9}/> Current GPS Coordinates
              </p>
              <p className="font-mono text-[11px] text-stone-200 font-bold">
                {tracking.latitude.toFixed(6)}, {tracking.longitude.toFixed(6)}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                <div>
                  <p className="text-[8px] text-stone-600 uppercase font-black">Speed</p>
                  <p className="text-[11px] font-black text-stone-200 flex items-center gap-0.5 mt-0.5">
                    <Zap size={9} className="text-amber-400"/> {tracking.speed} <span className="text-[8px] text-stone-500">km/h</span>
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-stone-600 uppercase font-black">Battery</p>
                  <p className="text-[11px] font-black mt-0.5 flex items-center gap-0.5" style={{ color: tracking.batteryLevel < 20 ? '#ef4444' : '#10b981' }}>
                    <Battery size={9}/> {tracking.batteryLevel}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-stone-600 uppercase font-black">Status</p>
                  <p className="text-[11px] font-black mt-0.5" style={{ color: tracking.status === 'active' ? '#10b981' : '#f59e0b' }}>
                    {tracking.status.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* On/Off Duty button */}
          {!isOnDuty || gpsStatus === 'idle' || gpsStatus === 'error' ? (
            <button
              onClick={handleStartShift}
              disabled={gpsStatus === 'acquiring'}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color:'#fff', boxShadow:'0 8px 32px rgba(16,185,129,0.35)' }}
            >
              <Play size={16}/>
              {gpsStatus === 'acquiring' ? 'Acquiring GPS fix…' : 'Go On Duty'}
            </button>
          ) : (
            <button
              onClick={handleEndShift}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', color:'#fff', boxShadow:'0 8px 32px rgba(239,68,68,0.3)' }}
            >
              <Square size={16}/> Go Off Duty
            </button>
          )}
        </div>

        {/* ── Status Banner ─────────────────────────────────────────────── */}
        {gpsStatus === 'live' ? (
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 animate-pulse">
              <Wifi size={14}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Shift Active · Broadcasting Every 5s</p>
              <p className="text-[9.5px] text-stone-400 mt-0.5">Admin can see your live location on the map right now.</p>
            </div>
          </div>
        ) : (
          <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-800 border border-white/8 flex items-center justify-center text-stone-500 flex-shrink-0">
              <WifiOff size={14}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Off Duty · Hidden from Admin</p>
              <p className="text-[9.5px] text-stone-600 mt-0.5">Tap "Go On Duty" to start broadcasting your location.</p>
            </div>
          </div>
        )}

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        {myAlerts.length > 0 && (
          <div className="bg-stone-950/80 backdrop-blur border border-amber-500/20 rounded-2xl p-4 space-y-2">
            <p className="text-[9.5px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10}/> {myAlerts.length} Alert{myAlerts.length > 1 ? 's' : ''}
            </p>
            {myAlerts.map(a => (
              <div key={a.id} className="text-[10px] text-stone-400 flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0 mt-1.5"/>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* 🚀 Tasks Section */}
        {myTasks.length > 0 && (
          <div className="bg-stone-950/80 backdrop-blur border border-amber-600/30 rounded-2xl p-4 space-y-3">
            <p className="text-[10px] text-amber-500 font-black uppercase tracking-wider flex items-center gap-1">
              <ClipboardList size={12}/> My Tasks ({myTasks.length})
            </p>
            {myTasks.map(t => {
              let distStr = '';
              if (t.location && tracking && tracking.status !== 'offline') {
                const distM = getDistance(tracking.latitude, tracking.longitude, t.location.lat, t.location.lng);
                distStr = distM > 1000 ? `${(distM/1000).toFixed(1)}km away` : `${Math.round(distM)}m away`;
              }
              return (
                <div key={t.id} className="bg-stone-900/60 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-stone-200 font-bold text-sm">{t.title}</h4>
                      <p className="text-stone-400 text-xs mt-0.5">{t.description}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${t.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-stone-800 text-stone-400'}`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    {t.location && (
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${t.location!.lat},${t.location!.lng}`, '_blank')}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 transition"
                      >
                        <Navigation2 size={12}/> Navigate {distStr && `(${distStr})`}
                      </button>
                    )}
                    <button 
                      onClick={() => completeTask(t.id)}
                      className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 transition"
                    >
                      <CheckCircle size={12}/> Complete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Shift clock ───────────────────────────────────────────────── */}
        {gpsStatus === 'live' && tracking && (
          <div className="bg-stone-950/60 border border-white/5 rounded-2xl p-3 flex items-center gap-2 text-[10px] text-stone-500">
            <Clock size={11} className="text-amber-400 flex-shrink-0"/>
            <span>Shift started: <span className="text-stone-300 font-bold">{new Date(tracking.timestamp).toLocaleTimeString()}</span></span>
            <span className="ml-auto flex items-center gap-1 text-emerald-400 font-bold">
              <Activity size={10}/> {pingCount} pings
            </span>
          </div>
        )}

      </div>

      <style>{`@keyframes ep-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
