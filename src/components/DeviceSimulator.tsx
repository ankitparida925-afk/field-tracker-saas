import React, { useState, useEffect, useRef } from 'react';
import { useAppState, getHaversineDistance } from '../context/AppState';
import {
  Play,
  Square,
  Wifi,
  WifiOff,
  Camera,
  Mic,
  AlertTriangle,
  MapPin,
  CheckCircle,
  Clock,
  Battery,
  User,
  Zap,
  RotateCw,
  Send,
  Navigation,
  Lock,
  Mail,
  Settings
} from 'lucide-react';
import { spoofingDestinations } from '../utils/mockRoutes';

/**
 * Helper to acquire the current browser geolocation with a two-stage fallback:
 * First attempts to query high-accuracy GPS (ideal for mobile).
 * If that fails or times out (desktop without GPS chip), immediately falls back
 * to low-accuracy Wi-Fi/IP triangulation.
 */
export const getCurrentPositionWithFallback = (
  onSuccess: (position: GeolocationPosition, highAccuracyUsed: boolean) => void,
  onError: (error: GeolocationPositionError) => void,
  silent: boolean = false
) => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    if (!silent) alert('Geolocation is not supported by your browser.');
    return;
  }

  // Attempt 1: High Accuracy (shorter timeout to fail fast if no hardware GPS is available)
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onSuccess(pos, true);
    },
    (err) => {
      // If we timed out or the position was unavailable, immediately try the low-accuracy fallback
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        console.warn(`High-accuracy GPS request failed (Code ${err.code}). Trying low-accuracy Wi-Fi/IP fallback...`);
        
        // Attempt 2: Low Accuracy (long timeout to ensure resolution)
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            onSuccess(fallbackPos, false);
          },
          (fallbackErr) => {
            console.warn('All geolocation attempts failed:', fallbackErr.message || fallbackErr);
            onError(fallbackErr);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        // For other errors (e.g. Permission Denied), do not fallback, fail immediately
        onError(err);
      }
    },
    { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 }
  );
};

export const DeviceSimulator: React.FC = () => {
  const {
    employees,
    activeTracking,
    visits,
    alerts,
    tasks,
    startShift,
    endShift,
    toggleOfflineMode,
    triggerSpoof,
    adjustSimulatorBattery,
    uploadVisitProof,
    uploadVoiceNote,
    injectGPSPing,
    gpsSource,
    setGPSSource,
    selectedEmployeeId,
    setSelectedEmployeeId,
    isOffline,
    currentUser,
    completeTask,
    isDemoMode
  } = useAppState();

  const [voiceText, setVoiceText] = useState('');
  const [selectedSpoofIndex, setSelectedSpoofIndex] = useState(0);

  const [syncingGPS, setSyncingGPS] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // New simulated mobile OS & routing states
  const [activeTab, setActiveTab] = useState<'hud' | 'tasks' | 'summary'>('hud');
  const [isLocked, setIsLocked] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [bgTrackingEnabled, setBgTrackingEnabled] = useState(true);

  // Active employee context based on admin selection or device selection
  // Scope to current user's organization so admins only see their own staff
  const tenantEmployees = employees.filter(
    emp => emp && currentUser && emp.organizationId === currentUser.organizationId
  );
  const employee = tenantEmployees.find(e => e.id === selectedEmployeeId) || tenantEmployees[0] || employees[0];
  const tracking = activeTracking[employee?.id];
  const isShiftActive = !!tracking && tracking.status !== 'offline';
  
  const isLiveSyncActive = gpsSource[employee?.id] === 'real';

  const stopLiveSync = React.useCallback(() => {
    if (watchIdRef.current !== null) {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    if (gpsSource[employee.id] === 'real') {
      setGPSSource(employee.id, 'route');
    }
    setSyncingGPS(false);
  }, [employee.id, gpsSource, setGPSSource]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isShiftActive) {
      stopLiveSync();
    }
  }, [isShiftActive, stopLiveSync]);

  const syncRealGPS = React.useCallback((empId: string, silent: boolean = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (!silent) alert('Geolocation is not supported by your browser.');
      return;
    }

    if (gpsSource[empId] === 'real' && !silent) {
      stopLiveSync();
      alert('Stopped browser GPS synchronization. Reverted to simulated mock route.');
      return;
    }

    setSyncingGPS(true);

    getCurrentPositionWithFallback(
      (position, highAccuracyUsed) => {
        const { latitude, longitude, speed } = position.coords;
        injectGPSPing(empId, latitude, longitude, speed || 0);

        setGPSSource(empId, 'real');

        // Clear existing watch if active
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        // Watch for position updates
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            if (!bgTrackingEnabled) return; // If background settings turned off, skip
            const { latitude: lat, longitude: lng, speed: sp } = pos.coords;
            injectGPSPing(empId, lat, lng, sp || 0);
          },
          (err) => {
            console.warn('Error watching position:', err.message || err);
          },
          { enableHighAccuracy: highAccuracyUsed }
        );

        watchIdRef.current = id;
        setSyncingGPS(false);
        if (!silent) {
          alert('Live browser GPS tracking active! Your simulated movement now follows your actual device GPS.');
        }
      },
      (error) => {
        setSyncingGPS(false);
        if (!silent) {
          alert(`Failed to acquire browser location: ${error.message}`);
        }
      },
      silent
    );
  }, [gpsSource, bgTrackingEnabled, injectGPSPing, setGPSSource, stopLiveSync]);

  const handleSyncRealGPS = () => {
    syncRealGPS(employee.id, false);
  };

  // Automatically activate device GPS when page loads/mounts or login is complete for any employee
  useEffect(() => {
    if (currentUser?.role === 'employee' && gpsSource[employee.id] !== 'real') {
      const timer = setTimeout(() => {
        syncRealGPS(employee.id, true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentUser, employee.id, gpsSource, syncRealGPS]);

  // Periodic physical GPS polling fallback to ensure real-time update heartbeat even when stationary
  useEffect(() => {
    if (!isShiftActive || gpsSource[employee.id] !== 'real') return;
    
    const interval = setInterval(() => {
      getCurrentPositionWithFallback(
        (pos) => {
          const { latitude: lat, longitude: lng, speed: sp } = pos.coords;
          injectGPSPing(employee.id, lat, lng, sp || 0);
        },
        (err) => {
          console.warn('Silent periodic GPS polling fallback failed:', err.message);
        },
        true // Silent
      );
    }, 12000); // every 12 seconds
    
    return () => clearInterval(interval);
  }, [isShiftActive, employee.id, injectGPSPing, gpsSource]);
  
  // Tasks specifically for this employee
  const employeeTasks = tasks.filter(t => t.employeeId === employee.id);
  const pendingTasks = employeeTasks.filter(t => t.status === 'Pending');
  const completedCount = employeeTasks.filter(t => t.status === 'Completed').length;

  // Visits and distance metrics
  const employeeVisits = visits.filter(v => v.employeeId === employee.id);
  const employeeAlerts = alerts.filter(a => a.employeeId === employee.id);
  const isSpoofed = employeeAlerts.some(a => a.type === 'gps_spoof' && !a.resolved);
  const hasBreaches = employeeAlerts.some(a => a.type === 'geofence_breach' && !a.resolved);

  // Triggering mock camera proof
  const handleSimulateCamera = () => {
    const mockImage = `https://placehold.co/400x300/1e293b/f1f5f9?text=Verified+Proof+${employee.name.replace(' ', '+')}+${new Date().toLocaleTimeString()}`;
    uploadVisitProof(employee.id, tracking?.status === 'idle' ? 'Client Stop' : 'Field Spot', mockImage);
    alert('Visit photo captured with geotag and uploaded successfully!');
  };

  // Triggering mock speech-to-text
  const handleSimulateVoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceText.trim()) return;

    uploadVoiceNote(employee.id, tracking?.status === 'idle' ? 'Client Stop' : 'Field Spot', voiceText);
    setVoiceText('');
    alert('Voice note uploaded. Transcript processed by AI NLP Engine!');
  };

  const handlePredefinedVoice = (text: string) => {
    uploadVoiceNote(employee.id, tracking?.status === 'idle' ? 'Client Stop' : 'Field Spot', text);
    alert('Predefined speech note transcribed and uploaded!');
  };

  // Haversine Distance Mileage compute
  const getDistanceCovered = () => {
    const points = activeTracking[employee.id] ? (useAppState().historyPaths[employee.id] || []) : [];
    if (points.length <= 1) return '0.00 km';
    let totalMeters = 0;
    for (let i = 1; i < points.length; i++) {
      totalMeters += getHaversineDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }
    return `${(totalMeters / 1000).toFixed(2)} km`;
  };

  // Active checked-in shift duration compute
  const getShiftDurationString = () => {
    const activeAttendance = useAppState().attendance.find(a => a.employeeId === employee.id && !a.checkOut);
    if (!activeAttendance) return '0h 0m';
    const diffMs = Date.now() - new Date(activeAttendance.checkIn).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Device Selection Context Bar */}
      <div className="mb-4 w-full flex items-center justify-between bg-stone-900/60 p-2.5 rounded-xl border border-white/5">
        <label className="text-xs text-stone-400 font-semibold flex items-center gap-1.5">
          <User size={13} className="text-amber-400" /> SIMULATED HANDSET:
        </label>
        {currentUser?.role === 'employee' ? (
          <span className="text-[11px] font-bold text-stone-300 bg-stone-800/80 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <User size={11} className="text-emerald-400" />
            {employee.name}
          </span>
        ) : (
          <select
            value={employee.id}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setActiveTab('hud');
              setIsMinimized(false);
              setIsLocked(false);
            }}
            className="bg-stone-800 border border-white/10 text-xs rounded-lg px-2 py-1 text-stone-200 outline-none cursor-pointer focus:border-amber-500"
          >
            {tenantEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role.split(' ')[0]})</option>
            ))}
          </select>
        )}
      </div>

      {/* Phone container */}
      <div className="relative">
        
        {/* Physical Power Button on Right Bezel (Demo Only) */}
        {isDemoMode && (
          <button
            onClick={() => {
              if (isShiftActive) {
                setIsLocked(prev => !prev);
              } else {
                alert('Start shift first to simulate lock screen telemetry tracking.');
              }
            }}
            className="absolute right-[-17px] top-[110px] w-[5px] h-[45px] bg-stone-700 hover:bg-amber-600 rounded-r border-r border-white/10 active:scale-95 transition z-50 cursor-pointer"
            title="Simulate OS Power / Lock Screen Button"
          />
        )}

        {/* Physical Volume controls on Left Bezel (Demo Only) */}
        {isDemoMode && (
          <>
            <div className="absolute left-[-17px] top-[90px] w-[5px] h-[30px] bg-stone-800 rounded-l border-l border-white/5" />
            <div className="absolute left-[-17px] top-[135px] w-[5px] h-[30px] bg-stone-800 rounded-l border-l border-white/5" />
          </>
        )}

        <div className={isDemoMode ? "phone-bezel" : "w-full max-w-md bg-[#070a13]/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[580px] relative p-1.5"}>
          {isDemoMode && <div className="phone-notch"></div>}
          
          <div className={isDemoMode ? "phone-screen flex flex-col justify-between pt-8 relative" : "w-full flex-grow flex flex-col justify-between relative min-h-[570px]"}>
            
            {/* TOP BAR / SIGNAL */}
            {isDemoMode ? (
              <div className="flex justify-between items-center text-[10.5px] text-stone-400 px-4 font-mono absolute top-2.5 left-0 right-0 z-40 select-none">
                <span>9:41 AM</span>
                <div className="flex items-center gap-1.5">
                  {bgTrackingEnabled && isShiftActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" title="Background Tracking Active"></span>
                  )}
                  {!isOffline[employee.id] ? (
                    <Wifi size={11} className="text-emerald-400" />
                  ) : (
                    <WifiOff size={11} className="text-rose-500 font-bold" />
                  )}
                  <div className="flex items-center gap-0.5">
                    <Battery size={12} />
                    <span className="text-[9.5px]">{tracking ? tracking.batteryLevel : employee.batteryStart}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-[10.5px] text-stone-400 px-4 py-2.5 bg-stone-950/60 border-b border-white/5 select-none w-full flex-shrink-0">
                <span className="font-mono text-stone-500 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  PRODUCTION TELEMETRY
                </span>
                <div className="flex items-center gap-2.5">
                  {isShiftActive && (
                    <span className="text-[9.5px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                      GPS STREAMING
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-[9.5px] text-stone-400 font-bold">
                    <Wifi size={11} className="text-emerald-400" />
                    <span>ONLINE</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN SWITCHER */}
            {isLocked ? (
              /* SCREEN A: LOCKED STATE OVERLAY */
              <div
                onClick={() => setIsLocked(false)}
                className="w-full h-full bg-gradient-to-b from-[#120c08] via-[#070b13] to-amber-950/80 flex flex-col justify-between p-6 cursor-pointer select-none animate-in fade-in duration-300 relative"
              >
                <div className="absolute top-1/4 left-1/4 w-[150px] h-[150px] rounded-full bg-amber-500/5 blur-[50px] pointer-events-none"></div>

                <div className="flex flex-col items-center mt-6 space-y-1.5 text-center">
                  <Lock size={15} className="text-stone-400 animate-pulse" />
                  <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Tap Screen to Unlock</span>
                </div>

                <div className="text-center mt-3">
                  <h1 className="text-4xl font-black text-stone-100 tracking-tight">9:41</h1>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Friday, May 22</p>
                </div>

                {/* Background locked GPS widget notifications */}
                <div className="bg-stone-900/90 border border-white/10 rounded-2xl p-3.5 space-y-2.5 shadow-2xl">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg border border-amber-500/20">
                        <Zap size={12} className="animate-pulse" />
                      </span>
                      <div className="text-left">
                        <h5 className="text-[10px] font-black text-stone-200">FieldTracker AI</h5>
                        <p className="text-[8px] text-stone-500 uppercase tracking-wider font-bold">Lock Screen GPS Auditing</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">ACTIVE</span>
                  </div>
                  
                  <p className="text-[9.5px] text-stone-400 leading-relaxed text-left">
                    📍 Background tracking remains active. Locked screen GPS telemetry is transmitting coordinate pings every 5 seconds.
                  </p>

                  <div className="flex justify-between items-center text-[8.5px] text-stone-500 font-mono border-t border-white/5 pt-2">
                    <span>Battery: {tracking ? tracking.batteryLevel : employee.batteryStart}%</span>
                    <span>Acc: 5m</span>
                  </div>
                </div>

                <div className="flex flex-col items-center mb-1">
                  <div className="w-20 h-1 bg-white/20 rounded-full animate-bounce"></div>
                  <span className="text-[8px] text-stone-600 font-extrabold uppercase tracking-widest mt-1.5">Simulation OS v10.6</span>
                </div>
              </div>
            ) : isMinimized ? (
              /* SCREEN B: MINIMIZED DESKTOP STATE OVERLAY */
              <div className="w-full h-full bg-gradient-to-br from-[#0c1221] via-[#070b13] to-rose-950/15 flex flex-col justify-between p-4 relative select-none animate-in fade-in duration-300">
                
                {/* DYNAMIC ISLAND / STATUS BANNER */}
                <button
                  onClick={() => setIsMinimized(false)}
                  className="w-full bg-stone-950/95 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-2.5 flex items-center justify-between shadow-2xl animate-bounce mt-4 cursor-pointer text-left focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h5 className="text-[10px] font-black text-stone-200 leading-none">FieldTracker · BG Active</h5>
                      <p className="text-[8.5px] text-stone-500 leading-none mt-1">Speed: {tracking?.speed || 0} km/h · Syncing GPS</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/30 uppercase">Restore</span>
                </button>

                {/* MOCK DESKTOP APPS GRID */}
                <div className="grid grid-cols-4 gap-x-3 gap-y-5 px-2 my-auto">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-white shadow-lg border border-white/10">
                      <Mail size={16} />
                    </div>
                    <span className="text-[8px] font-bold text-stone-500">Mail</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg border border-white/10">
                      <Clock size={16} />
                    </div>
                    <span className="text-[8px] font-bold text-stone-500">Calendar</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg border border-white/10">
                      <Navigation size={16} />
                    </div>
                    <span className="text-[8px] font-bold text-stone-500">Maps</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg border border-white/10">
                      <Camera size={16} />
                    </div>
                    <span className="text-[8px] font-bold text-stone-500">Camera</span>
                  </div>
                </div>

                {/* DOCK BAR */}
                <div className="bg-stone-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-2 flex justify-around items-center">
                  <button
                    onClick={() => setIsMinimized(false)}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-900 to-stone-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl"
                    title="Restore FieldTracker App"
                  >
                    <Zap size={16} className="animate-pulse" />
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN C: NATIVE APP VIEWS */
              <div className="flex-grow flex flex-col justify-between h-full w-full">
                
                {/* APP HEADER */}
                <div className="mt-3 bg-gradient-to-r from-amber-900/80 to-stone-900/80 p-3 rounded-xl border border-amber-500/20 text-center relative overflow-hidden mx-4 flex-shrink-0">
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      onClick={() => {
                        const next = !bgTrackingEnabled;
                        setBgTrackingEnabled(next);
                        alert(next ? 'Background GPS tracking enabled.' : 'Background GPS tracking disabled. Map telemetry will pause.');
                      }}
                      className={`p-0.5 rounded hover:bg-white/5 transition cursor-pointer ${
                        bgTrackingEnabled ? 'text-amber-400 animate-pulse' : 'text-stone-500'
                      }`}
                      title="Background Geolocation Settings"
                    >
                      <Settings size={12} />
                    </button>
                    <span className={`flex h-2 w-2 rounded-full ${isShiftActive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`}></span>
                  </div>
                  <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-full mx-auto border-2 border-amber-400" />
                  <h4 className="text-stone-100 font-bold text-xs mt-1">{employee.name}</h4>
                  <p className="text-amber-300 text-[9px] uppercase tracking-wider font-semibold">{employee.role}</p>
                </div>

                {/* DYNAMIC SHIFT MIDDLE CONTAINER */}
                <div className="flex-grow my-3 overflow-y-auto px-4 pr-3.5 space-y-3">
                  {!isShiftActive ? (
                    /* 1. SHIFT OFF VIEW */
                    <div className="flex flex-col items-center justify-center py-10 px-2 space-y-4 text-center my-auto">
                      <div className="bg-amber-950/40 p-4 rounded-full border border-amber-500/20 text-amber-400 animate-pulse">
                        <Clock size={32} />
                      </div>
                      <div>
                        <h5 className="text-stone-200 font-bold text-xs">Shift is Currently Off</h5>
                        <p className="text-stone-500 text-[10px] mt-1 max-w-[200px] mx-auto leading-relaxed">
                          You must start your shift to synchronize your live coordinates, battery logs, and map routes with HQ.
                        </p>
                      </div>

                      <button
                        disabled={syncingGPS}
                        onClick={async () => {
                          if (typeof window === 'undefined' || !navigator.geolocation) {
                            alert('Geolocation is not supported by your browser.');
                            return;
                          }
                          setSyncingGPS(true);
                          getCurrentPositionWithFallback(
                            (position, highAccuracyUsed) => {
                              const { latitude, longitude, speed } = position.coords;
                              startShift(employee.id, latitude, longitude);

                              // Clear existing watch if active
                              if (watchIdRef.current !== null) {
                                navigator.geolocation.clearWatch(watchIdRef.current);
                                watchIdRef.current = null;
                              }

                              // Watch for position updates
                              const id = navigator.geolocation.watchPosition(
                                (pos) => {
                                  if (!bgTrackingEnabled) return;
                                  const { latitude: lat, longitude: lng, speed: sp } = pos.coords;
                                  injectGPSPing(employee.id, lat, lng, sp || 0);
                                },
                                (err) => console.error('Error watching position:', err),
                                { enableHighAccuracy: highAccuracyUsed }
                              );

                              watchIdRef.current = id;
                              setSyncingGPS(false);
                              setActiveTab('hud');
                            },
                            (error) => {
                              setSyncingGPS(false);
                              alert(`Failed to acquire browser location: ${error.message}. Please allow location access to start your shift.`);
                            },
                            false // Manual action, show error if both fail
                          );
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-5 rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition w-full max-w-[180px] cursor-pointer disabled:opacity-50"
                      >
                        {syncingGPS ? (
                          <>
                            <span className="w-3.5 h-3.5 border-[2px] border-white/20 border-t-white rounded-full animate-spin"></span>
                            ACQUIRING GPS...
                          </>
                        ) : (
                          <>
                            <Play size={13} /> START SHIFT
                          </>
                        )}
                      </button>
                    </div>
                  ) : activeTab === 'hud' ? (
                    /* 2. TAB A: SHIFT TRANSMISSION HUD */
                    <>
                      {/* Real-time Tracking HUD */}
                      <div className="bg-stone-900/80 border border-white/5 rounded-xl p-3 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] text-stone-400 uppercase font-bold tracking-wider">GPS Service Status</span>
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Zap size={11} className="animate-bounce" /> Live Upload
                          </span>
                        </div>

                        {/* GPS Source Selector Toggle (Demo only) / Telemetry Indicator (Prod) */}
                        {isDemoMode ? (
                          <div className="grid grid-cols-2 gap-1 bg-stone-950 p-1 rounded-lg border border-white/5 select-none">
                            <button
                              onClick={() => {
                                if (isLiveSyncActive) {
                                  stopLiveSync();
                                }
                              }}
                              className={`py-1 text-[9px] font-bold rounded-md transition cursor-pointer text-center ${
                                !isLiveSyncActive
                                  ? 'bg-amber-600/90 text-white shadow-md border border-amber-400/20'
                                  : 'text-stone-500 hover:text-stone-300'
                              }`}
                            >
                              Simulated Route
                            </button>
                            <button
                              onClick={handleSyncRealGPS}
                              disabled={syncingGPS}
                              className={`py-1 text-[9px] font-bold rounded-md transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                                isLiveSyncActive
                                  ? 'bg-emerald-600 text-white shadow-md animate-pulse border border-emerald-400/20'
                                  : 'text-stone-500 hover:text-stone-300'
                              }`}
                            >
                              <Navigation size={10} className={syncingGPS ? 'animate-spin' : ''} />
                              Device GPS
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl flex items-center gap-2 text-[10px] text-emerald-400 font-bold select-none justify-center">
                            <Navigation size={11} className="animate-pulse text-emerald-400" />
                            <span>HARDWARE DEVICE GPS LINK SECURED</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-stone-950 p-2 rounded-lg border border-white/5">
                            <p className="text-[8.5px] text-stone-500">SPEED</p>
                            <p className="text-xs font-bold text-stone-200">{tracking.speed} <span className="text-[9.5px] font-normal text-stone-400">km/h</span></p>
                          </div>
                          <div className="bg-stone-950 p-2 rounded-lg border border-white/5">
                            <p className="text-[8.5px] text-stone-500">BATTERY</p>
                            <p className="text-xs font-bold text-amber-300">{tracking.batteryLevel}%</p>
                          </div>
                        </div>

                        <div className="bg-stone-950/70 p-2 rounded-lg border border-white/5 space-y-1 text-left">
                          <p className="text-[8.5px] text-stone-500 flex items-center gap-1"><MapPin size={9} /> CURRENT GPS</p>
                          <p className="text-[10px] font-mono text-stone-300 truncate">
                            {tracking.latitude.toFixed(6)}, {tracking.longitude.toFixed(6)}
                          </p>
                          <p className="text-[9px] text-amber-400 truncate italic">
                            📍 {tracking.speed === 0 ? 'Stationary Stop' : 'Traversing route'}
                          </p>
                        </div>
                      </div>

                      {/* Visit Upload Tools */}
                      <div className="bg-stone-900/80 border border-white/5 rounded-xl p-3 space-y-2 text-left">
                        <span className="text-[9.5px] text-stone-400 uppercase font-bold tracking-wider">Field Proof Verification</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleSimulateCamera}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-2 text-[9.5px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Camera size={14} /> Take Photo Proof
                          </button>
                          
                          <button
                            onClick={() => handlePredefinedVoice('Clinic visit completed successfully. Sample batches were verified, promotional boards are positioned.')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-2 text-[9.5px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Mic size={14} /> Audio Briefing
                          </button>
                        </div>

                        <form onSubmit={handleSimulateVoice} className="flex gap-1.5 mt-1">
                          <input
                            type="text"
                            placeholder="Simulate voice note..."
                            value={voiceText}
                            onChange={(e) => setVoiceText(e.target.value)}
                            className="flex-grow bg-stone-950 text-[10px] px-2 py-1.5 rounded border border-white/10 outline-none text-stone-200"
                          />
                          <button type="submit" className="bg-stone-800 hover:bg-stone-700 p-1.5 rounded border border-white/10 text-amber-400 cursor-pointer">
                            <Send size={11} />
                          </button>
                        </form>
                      </div>

                      {/* Advanced Security Spoofing vectors */}
                      {isDemoMode && (
                        <div className="bg-stone-900/80 border border-white/5 rounded-xl p-3 space-y-2 text-left">
                          <span className="text-[9.5px] text-amber-500 uppercase font-bold tracking-wider flex items-center gap-1">
                            <AlertTriangle size={11} /> Simulation Drawer
                          </span>

                          <div className="space-y-2">
                            <div className="flex gap-1 bg-stone-950 p-1 rounded border border-white/5 items-center justify-between">
                              <select
                                value={selectedSpoofIndex}
                                onChange={(e) => setSelectedSpoofIndex(Number(e.target.value))}
                                className="bg-transparent text-[9.5px] text-stone-300 outline-none p-1 cursor-pointer w-2/3"
                              >
                                {spoofingDestinations.map((dst, i) => (
                                  <option key={i} className="bg-stone-900 text-stone-200" value={i}>{dst.name.split(' (')[0]}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => triggerSpoof(employee.id, selectedSpoofIndex)}
                                className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-500/30 rounded px-2 py-1 text-[9px] font-bold transition flex-shrink-0 cursor-pointer"
                              >
                                Spoof GPS
                              </button>
                            </div>

                            <button
                              onClick={() => toggleOfflineMode(employee.id)}
                              className={`w-full py-1.5 px-3 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                isOffline[employee.id]
                                  ? 'bg-rose-950 border-rose-500/35 text-rose-400'
                                  : 'bg-stone-950 border-white/10 text-stone-300 hover:bg-stone-900'
                              }`}
                            >
                              {isOffline[employee.id] ? (
                                <>
                                  <WifiOff size={12} className="text-rose-400 animate-pulse" /> Re-connect & Sync
                                </>
                              ) : (
                                <>
                                  <Wifi size={12} className="text-emerald-400" /> Go Offline (Test cache)
                                </>
                              )}
                            </button>

                            <button
                              onClick={handleSyncRealGPS}
                              disabled={syncingGPS}
                              className={`w-full py-1.5 px-3 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                isLiveSyncActive
                                  ? 'bg-emerald-950 border-emerald-500/35 text-emerald-400 animate-pulse'
                                  : 'bg-stone-950 border-white/10 text-stone-300 hover:bg-stone-900'
                              }`}
                            >
                              <Navigation size={12} className={`${syncingGPS ? 'animate-spin' : ''} ${isLiveSyncActive ? 'text-emerald-400' : 'text-stone-400'}`} />
                              {isLiveSyncActive ? 'Syncing Browser GPS' : 'Sync with Browser GPS'}
                            </button>

                            <div className="bg-stone-950/70 p-2 rounded-lg border border-white/5 space-y-1">
                              <div className="flex justify-between text-[8.5px] text-stone-500">
                                <span>SIMULATE BATTERY DRAIN</span>
                                <span className="font-mono text-amber-400">{tracking.batteryLevel}%</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="100"
                                value={tracking.batteryLevel}
                                onChange={(e) => adjustSimulatorBattery(employee.id, Number(e.target.value))}
                                className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : activeTab === 'tasks' ? (
                    /* 3. TAB B: TASKS MANAGER PANEL */
                    <div className="space-y-2.5 text-left">
                      <h5 className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-2 flex justify-between">
                        <span>Assigned Shift Tasks</span>
                        <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full text-[9px] font-black">{pendingTasks.length} pending</span>
                      </h5>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                        {employeeTasks.length === 0 ? (
                          <p className="text-[9.5px] text-stone-500 text-center py-8">No duties mapped for your shift today.</p>
                        ) : (
                          employeeTasks.map(t => (
                            <div key={t.id} className="flex items-start justify-between bg-stone-950 p-2.5 rounded-xl border border-white/5 gap-2">
                              <div className="flex items-start gap-2">
                                <CheckCircle size={14} className={`mt-0.5 flex-shrink-0 ${t.status === 'Completed' ? 'text-emerald-400' : 'text-stone-600'}`} />
                                <div>
                                  <p className={`text-[10px] font-bold leading-tight ${t.status === 'Completed' ? 'line-through text-stone-500' : 'text-stone-200'}`}>{t.title}</p>
                                  <p className="text-[8.5px] text-stone-500 mt-1 leading-normal">{t.description}</p>
                                </div>
                              </div>
                              {t.status === 'Pending' && (
                                <button
                                  onClick={() => {
                                    completeTask(t.id);
                                    alert(`Task "${t.title}" checked off!`);
                                  }}
                                  className="bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white px-2 py-0.5 rounded-lg text-[8.5px] font-bold transition active:scale-95 cursor-pointer flex-shrink-0"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* 4. TAB C: DAILY SHIFT SUMMARY */
                    <div className="space-y-3.5 text-left">
                      <h5 className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Shift Daily Summary</h5>
                      
                      <div className="bg-stone-900/80 border border-white/5 rounded-xl p-3 text-center space-y-2">
                        <span className="text-[9px] text-stone-500 uppercase font-bold tracking-wider">Compliance Audit Grade</span>
                        <div className="flex justify-center items-center gap-1.5">
                          <span className={`text-2xl font-black ${isSpoofed ? 'text-rose-500' : hasBreaches ? 'text-amber-500' : 'text-emerald-400'}`}>
                            {isSpoofed ? '25%' : hasBreaches ? '70%' : '98%'}
                          </span>
                          <span className="text-[8.5px] font-bold text-stone-500 uppercase tracking-widest leading-none block text-left">
                            {isSpoofed ? 'CRITICAL RISK' : hasBreaches ? 'POLICY WARNING' : 'EXCELLENT SCORE'}
                          </span>
                        </div>
                        <div className="w-full bg-stone-950 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${isSpoofed ? 'bg-rose-500 w-1/4' : hasBreaches ? 'bg-amber-500 w-[70%]' : 'bg-emerald-400 w-[98%]'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-stone-900/80 border border-white/5 rounded-xl p-2.5">
                          <p className="text-[8px] text-stone-500 uppercase font-bold">Total Mileage</p>
                          <p className="text-xs font-black text-stone-200 mt-0.5">{getDistanceCovered()}</p>
                        </div>
                        <div className="bg-stone-900/80 border border-white/5 rounded-xl p-2.5">
                          <p className="text-[8px] text-stone-500 uppercase font-bold">Shift Duration</p>
                          <p className="text-xs font-black text-stone-200 mt-0.5">{getShiftDurationString()}</p>
                        </div>
                        <div className="bg-stone-900/80 border border-white/5 rounded-xl p-2.5">
                          <p className="text-[8px] text-stone-500 uppercase font-bold">Client Stoppages</p>
                          <p className="text-xs font-black text-emerald-400 mt-0.5">{employeeVisits.length} check-ins</p>
                        </div>
                        <div className="bg-stone-900/80 border border-white/5 rounded-xl p-2.5">
                          <p className="text-[8px] text-stone-500 uppercase font-bold">Duties Completed</p>
                          <p className="text-xs font-black text-amber-300 mt-0.5">{completedCount} / {employeeTasks.length}</p>
                        </div>
                      </div>

                      {isSpoofed && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[9px] text-rose-400 leading-normal flex items-start gap-1.5 animate-pulse">
                          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                          <span>Fake coordinates jumped at impossible speeds. Security violation logs have synced to HQ control console.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* APP BOTTOM TAB ROUTER */}
                <div className="bg-stone-950 border-t border-white/5 py-1 px-2 flex justify-around items-center flex-shrink-0 select-none">
                  <button
                    onClick={() => setActiveTab('hud')}
                    className={`flex flex-col items-center gap-0.5 text-[8.5px] font-extrabold transition cursor-pointer py-1 ${
                      activeTab === 'hud' ? 'text-amber-400' : 'text-stone-500 hover:text-stone-400'
                    }`}
                  >
                    <Zap size={13} />
                    <span>HUD</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex flex-col items-center gap-0.5 text-[8.5px] font-extrabold transition cursor-pointer py-1 relative ${
                      activeTab === 'tasks' ? 'text-amber-400' : 'text-stone-500 hover:text-stone-400'
                    }`}
                  >
                    <CheckCircle size={13} />
                    <span>Tasks</span>
                    {pendingTasks.length > 0 && (
                      <span className="absolute top-0.5 -right-2 bg-amber-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[7px] font-black border border-stone-950">
                        {pendingTasks.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex flex-col items-center gap-0.5 text-[8.5px] font-extrabold transition cursor-pointer py-1 ${
                      activeTab === 'summary' ? 'text-amber-400' : 'text-stone-500 hover:text-stone-400'
                    }`}
                  >
                    <Clock size={13} />
                    <span>Summary</span>
                  </button>
                </div>

                {/* PHONE HOME GESTURE BAR TO MINIMIZE */}
                {isDemoMode && (
                  <div className="w-full flex justify-center py-1.5 bg-stone-950 flex-shrink-0">
                    <button
                      onClick={() => setIsMinimized(true)}
                      className="w-16 h-1 bg-white/20 hover:bg-white/40 rounded-full active:scale-95 transition cursor-pointer"
                      title="Swipe Up/Click Home to Minimize App to Background"
                    />
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </div>

      {/* SHIFT END BUTTON IN BEZEL FRAME */}
      {isShiftActive && !isLocked && !isMinimized && (
        <button
          onClick={() => {
            endShift(employee.id);
            setIsLocked(false);
            setIsMinimized(false);
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold w-full max-w-[280px] mt-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/10 active:scale-95 transition cursor-pointer"
        >
          <Square size={10} /> End Shift & Check-Out
        </button>
      )}

    </div>
  );
};
