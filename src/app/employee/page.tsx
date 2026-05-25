'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../context/AppState';
import {
  MapPin, LogOut, Navigation, Battery, Zap, Wifi, WifiOff,
  Clock, CheckCircle, AlertTriangle, Play, Square, Activity,
  User, Building, Radio, ClipboardList, Navigation2, Check
} from 'lucide-react';

const GPS_INTERVAL_MS = 5000;

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
  const [pingCount,  setPingCount]  = React.useState(0);
  const [lastPingAt, setLastPingAt] = React.useState<Date|null>(null);
  const [secondsAgo, setSecondsAgo] = React.useState(0);
  const [accuracy,   setAccuracy]   = React.useState<number|null>(null);

  const watchIdRef     = React.useRef<number | null>(null);
  const intervalRef    = React.useRef<any>(null);
  const shiftActiveRef = React.useRef(false);
  const lastPosRef     = React.useRef<GeolocationPosition | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  // Protect route
  React.useEffect(() => {
    if (mounted && (!currentUser || currentUser.role !== 'employee')) {
      router.push('/signin');
    }
  }, [mounted, currentUser, router]);

  const employee  = currentUser ? employees.find(e => e.id === currentUser.id) : null;
  const tracking  = employee ? activeTracking[employee.id] : null;
  const isOnDuty  = !!tracking && tracking.status !== 'offline';
  const myAlerts  = alerts.filter(a => a.employeeId === employee?.id && !a.resolved).slice(0,3);
  const myTasks = tasks.filter(t => t.employeeId === employee?.id && t.status === 'Pending');

  React.useEffect(() => {
    const t = setInterval(() => {
      if (lastPingAt) setSecondsAgo(Math.floor((Date.now() - lastPingAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastPingAt]);

  const sendPing = React.useCallback((pos: GeolocationPosition) => {
    if (!employee) return;
    setAccuracy(Math.round(pos.coords.accuracy));
    injectGPSPing(employee.id, pos.coords.latitude, pos.coords.longitude, Math.round((pos.coords.speed || 0) * 3.6));
    setPingCount(c => c + 1);
    setLastPingAt(new Date());
  }, [employee, injectGPSPing]);

  const stopTracking = React.useCallback(() => {
    shiftActiveRef.current = false;
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (intervalRef.current)         { clearInterval(intervalRef.current); intervalRef.current = null; }
    setGpsStatus('idle');
  }, []);

  const handleEndShift = () => {
    if (!employee) return;
    stopTracking();
    endShift(employee.id);
  };

  const handleStartShift = () => {
    if (!employee) return;
    setGpsStatus('acquiring');
    setGpsError('');

    const successCb = (pos: any) => {
      shiftActiveRef.current = true;
      const { latitude, longitude, accuracy: acc } = pos.coords || { latitude: 37.7749, longitude: -122.4194, accuracy: 5 };
      setAccuracy(Math.round(acc));
      startShift(employee.id, latitude, longitude);
      setGPSSource(employee.id, 'real');
      setGpsStatus('live');
      setPingCount(1);
      setLastPingAt(new Date());

      if (navigator.geolocation && navigator.geolocation.watchPosition) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => { lastPosRef.current = p; },
          (e) => console.warn('GPS watch error:', e.message),
          { enableHighAccuracy: true, maximumAge: 3000 }
        );
      } else {
        lastPosRef.current = pos;
      }

      intervalRef.current = setInterval(() => {
        if (lastPosRef.current && shiftActiveRef.current) {
          sendPing(lastPosRef.current);
        }
      }, GPS_INTERVAL_MS);
    };

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, using mock location.');
      successCb({ coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 5, speed: 0 } });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      successCb,
      (err) => {
        console.warn(`GPS failed: ${err.message}. Using mock location.`);
        setGpsError(`GPS Denied. Using mock location for testing.`);
        successCb({ coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 5, speed: 0 } });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  React.useEffect(() => () => stopTracking(), [stopTracking]);

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-amber-500/15 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isLive = gpsStatus === 'live';

  return (
    <div className="min-h-screen w-full bg-[#050505] text-stone-200 font-sans relative overflow-x-hidden">
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-all duration-1000 ${isLive ? 'bg-amber-600 scale-110' : 'bg-stone-800 scale-100'}`} />
        <div className={`absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 transition-all duration-1000 ${isLive ? 'bg-emerald-500' : 'bg-transparent'}`} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto min-h-screen flex flex-col p-4 space-y-4">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="glass-panel p-4 rounded-3xl flex items-center justify-between shadow-2xl shadow-black/50 border border-white/5 bg-white/[0.02] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/5 border border-amber-500/20 flex items-center justify-center shadow-inner">
              <User size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mb-0.5">Field Operative</p>
              <h1 className="text-base font-black text-white leading-none">{currentUser.name}</h1>
              {currentUser.organizationName && (
                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-1 font-medium">
                  <Building size={10}/> {currentUser.organizationName}
                </p>
              )}
            </div>
          </div>
          <button onClick={logout} className="p-3 rounded-full hover:bg-white/5 transition-colors text-stone-500 hover:text-red-400">
            <LogOut size={18} />
          </button>
        </header>

        {/* ── Main Action (GPS Toggle) ─────────────────────────────────── */}
        <div className="relative mt-2">
          {/* Outer glow ring for active state */}
          {isLive && <div className="absolute inset-0 bg-amber-500/20 rounded-3xl blur-xl animate-pulse" />}
          
          <div className="glass-panel relative rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-2xl border border-white/5 bg-white/[0.01] backdrop-blur-2xl overflow-hidden">
            
            {/* GPS Error */}
            {gpsError && (
              <div className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/20 p-2 text-[10px] text-red-400 font-bold">
                {gpsError}
              </div>
            )}

            {!isOnDuty || gpsStatus === 'idle' || gpsStatus === 'error' ? (
              <>
                <div className="w-20 h-20 rounded-full bg-stone-900/50 border border-white/10 flex items-center justify-center mb-4 shadow-inner">
                  <WifiOff size={28} className="text-stone-600" />
                </div>
                <h2 className="text-xl font-black text-white mb-1">Off Duty</h2>
                <p className="text-xs text-stone-500 font-medium mb-6">You are invisible to dispatch.</p>
                
                <button
                  onClick={handleStartShift}
                  disabled={gpsStatus === 'acquiring'}
                  className="w-full relative group overflow-hidden rounded-2xl p-[1px] transition-transform active:scale-95 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-[#0a0a0a] px-4 py-4 rounded-[15px] flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition-all duration-300">
                    <span className="font-black text-sm text-white flex items-center gap-2 z-10">
                      <Play size={16} className={gpsStatus === 'acquiring' ? 'animate-pulse' : ''} /> 
                      {gpsStatus === 'acquiring' ? 'Acquiring GPS Fix...' : 'Go On Duty'}
                    </span>
                  </div>
                </button>
              </>
            ) : (
              <>
                <div className="relative mb-4 mt-2">
                  <div className="absolute inset-0 bg-amber-500 rounded-full blur-md opacity-30 animate-pulse" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center relative shadow-lg">
                    <Wifi size={28} className="text-white" />
                  </div>
                  {/* Radar rings */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-amber-400/50 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-amber-400/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] animation-delay-500" />
                </div>
                
                <h2 className="text-xl font-black text-white mb-1">Shift Active</h2>
                <p className="text-xs text-amber-500 font-bold mb-6 flex items-center justify-center gap-1">
                  <Activity size={12} className="animate-pulse" /> Broadcasting Location
                </p>
                
                <button
                  onClick={handleEndShift}
                  className="w-full bg-stone-900/50 hover:bg-stone-800 border border-white/10 text-stone-300 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95"
                >
                  <Square size={16} className="text-red-500" /> End Shift
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Telemetry Ribbon ─────────────────────────────────────────── */}
        {isLive && tracking && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-3 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-1 backdrop-blur-xl">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Speed</span>
              <span className="text-sm font-black text-white">{tracking.speed} <span className="text-[9px] text-stone-500">km/h</span></span>
            </div>
            <div className="glass-panel p-3 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-1 backdrop-blur-xl">
              <Battery size={14} className={tracking.batteryLevel < 20 ? 'text-red-500' : 'text-emerald-400'} />
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Battery</span>
              <span className="text-sm font-black text-white">{tracking.batteryLevel}%</span>
            </div>
            <div className="glass-panel p-3 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-1 backdrop-blur-xl">
              <Radio size={14} className="text-blue-400" />
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Pings</span>
              <span className="text-sm font-black text-white">{pingCount}</span>
            </div>
          </div>
        )}

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        {myAlerts.length > 0 && (
          <div className="glass-panel border border-red-500/30 bg-red-500/5 rounded-3xl p-5 space-y-3 relative overflow-hidden backdrop-blur-xl shadow-lg shadow-red-500/5">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" />
            <h3 className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={12}/> Security Alerts
            </h3>
            <div className="space-y-3">
              {myAlerts.map(a => (
                <div key={a.id} className="text-xs text-stone-300 flex items-start gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1 animate-pulse" />
                  <span className="font-medium leading-relaxed">{a.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Task Matrix ──────────────────────────────────────────────── */}
        {myTasks.length > 0 && (
          <div className="mt-2 space-y-3">
            <h3 className="text-[11px] text-amber-500 font-black uppercase tracking-widest pl-2 flex items-center gap-2">
              <ClipboardList size={14}/> Assigned Tasks
              <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full text-[9px]">{myTasks.length}</span>
            </h3>
            
            <div className="space-y-3">
              {myTasks.map(t => {
                let distStr = '';
                if (t.location && tracking && tracking.status !== 'offline') {
                  const distM = getDistance(tracking.latitude, tracking.longitude, t.location.lat, t.location.lng);
                  distStr = distM > 1000 ? `${(distM/1000).toFixed(1)}km` : `${Math.round(distM)}m`;
                }

                return (
                  <div key={t.id} className="glass-panel bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-3xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 group backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-4">
                        <h4 className="text-stone-100 font-bold text-sm mb-1">{t.title}</h4>
                        <p className="text-stone-400 text-xs font-medium leading-relaxed">{t.description}</p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${t.priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-stone-800/50 text-stone-400 border border-white/5'}`}>
                        {t.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      {t.location && (
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${t.location!.lat},${t.location!.lng}`, '_blank')}
                          className="flex-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-600/20 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Navigation2 size={14}/> {distStr ? `Navigate (${distStr})` : 'Navigate'}
                        </button>
                      )}
                      <button 
                        onClick={() => completeTask(t.id)}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check size={14}/> Complete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Padding for bottom */}
        <div className="h-8" />
        
      </div>
      
      {/* Global styles for glassmorphism utility */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-panel {
          box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.05);
        }
      `}} />
    </div>
  );
}
