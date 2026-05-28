'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../context/AppState';
import {
  MapPin, LogOut, Navigation, Battery, Zap, Wifi, WifiOff,
  Clock, CheckCircle, AlertTriangle, Play, Square, Activity,
  User, Building, Radio, ClipboardList, Navigation2, Lock,
  Eye, EyeOff, Sun, Moon, Pause, Paperclip
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
    alerts, tasks, completeTask, setupEmployeePassword,
    theme, toggleTheme,
    updateTaskStatus, addTaskComment, addTaskAttachment
  } = useAppState();

  const router = useRouter();
  const [mounted,    setMounted]    = React.useState(false);
  const [gpsStatus,  setGpsStatus]  = React.useState<'idle'|'acquiring'|'live'|'error'>('idle');
  const [gpsError,   setGpsError]   = React.useState('');
  const [accuracy,   setAccuracy]   = React.useState<number|null>(null);
  const [pingCount,  setPingCount]  = React.useState(0);
  
  // Password Setup States
  const [setupPass, setSetupPass] = React.useState('');
  const [setupConfirmPass, setSetupConfirmPass] = React.useState('');
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = React.useState(false);
  const [setupLoading, setSetupLoading] = React.useState(false);
  const [showSetupPassword, setShowSetupPassword] = React.useState(false);
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

  // Auto-restore active duty status and tracking watches on page refresh
  React.useEffect(() => {
    if (mounted && employee && isOnDuty && gpsStatus === 'idle') {
      handleStartShift();
    }
  }, [mounted, employee, isOnDuty, gpsStatus, handleStartShift]);

  // Cleanup on unmount
  React.useEffect(() => () => stopTracking(), [stopTracking]);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(false);

    if (!setupPass || !setupConfirmPass) {
      setSetupError('Please fill in all fields.');
      return;
    }
    if (setupPass.length < 8 || !/[A-Z]/.test(setupPass) || !/[0-9]/.test(setupPass)) {
      setSetupError('Password must be at least 8 characters and contain at least one uppercase letter and one number.');
      return;
    }
    if (setupPass !== setupConfirmPass) {
      setSetupError('Passwords do not match.');
      return;
    }

    setSetupLoading(true);
    try {
      const result = await setupEmployeePassword(setupPass);
      if (result.success) {
        setSetupSuccess(true);
        setSetupPass('');
        setSetupConfirmPass('');
      } else {
        setSetupError(result.error || 'Failed to setup password.');
      }
    } catch {
      setSetupError('An error occurred during password setup.');
    } finally {
      setSetupLoading(false);
    }
  };

  const [geotagLoading, setGeotagLoading] = React.useState<string | null>(null);
  const [activeCameraTaskId, setActiveCameraTaskId] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startWebcam = async (taskId: string) => {
    setActiveCameraTaskId(taskId);
    setGpsError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      // Wait for React to render the modal video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 300);
    } catch (err: any) {
      console.warn('Webcam not accessible:', err.message);
      // Fallback: trigger standard folder explorer file upload input
      setActiveCameraTaskId(null);
      const fileInput = document.getElementById(`mob-camera-${taskId}`) as HTMLInputElement;
      fileInput?.click();
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setActiveCameraTaskId(null);
  };

  const captureWebcamPhoto = () => {
    if (!videoRef.current || !activeCameraTaskId) return;

    setGeotagLoading(activeCameraTaskId);
    const taskId = activeCameraTaskId;
    
    // Acquire current GPS coordinates for secure geotag watermark
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const timestamp = new Date().toLocaleString();

        const video = videoRef.current!;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setGeotagLoading(null);
          stopWebcam();
          return;
        }

        // Scale to max 1200px
        const maxDim = 1200;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Watermark black overlay bar at the bottom
        const barHeight = Math.max(60, Math.round(height * 0.08));
        ctx.fillStyle = 'rgba(15, 10, 6, 0.75)'; // dark amber semi-transparent background
        ctx.fillRect(0, height - barHeight, width, barHeight);

        // Text configuration
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        const fontSize = Math.max(12, Math.round(barHeight * 0.28));
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

        // Draw location & time text
        const textX = Math.round(width * 0.04);
        const line1Y = Math.round(height - barHeight * 0.65);
        const line2Y = Math.round(height - barHeight * 0.35);

        ctx.fillText(`📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, textX, line1Y);
        ctx.fillText(`📅 TIME: ${timestamp}`, textX, line2Y);

        // Convert to Base64 image
        const base64Data = canvas.toDataURL('image/jpeg', 0.85);

        // Save proof
        addTaskAttachment(taskId, `cam-proof-${Date.now()}.jpg`, base64Data)
          .then(() => {
            alert('Webcam geotagged proof photo captured successfully!');
          })
          .catch(err => {
            console.error(err);
            alert('Error saving geotagged proof.');
          })
          .finally(() => {
            setGeotagLoading(null);
            stopWebcam();
          });
      },
      (err) => {
        setGeotagLoading(null);
        stopWebcam();
        alert(`Failed to capture GPS for geotagging: ${err.message}. Geotagged proofs require active location services.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleGeotagUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeotagLoading(taskId);
    
    // 1. Get current GPS Coordinates for secure geotagging
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const timestamp = new Date().toLocaleString();

        // 2. Read File as Data URL
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              setGeotagLoading(null);
              return;
            }

            // Downscale dimensions to max 1200px to maintain performant base64 sizes
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;

            // Draw original captured image
            ctx.drawImage(img, 0, 0, width, height);

            // Watermark black overlay bar at the bottom
            const barHeight = Math.max(60, Math.round(height * 0.08));
            ctx.fillStyle = 'rgba(15, 10, 6, 0.75)'; // dark amber semi-transparent background
            ctx.fillRect(0, height - barHeight, width, barHeight);

            // Text configuration
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            const fontSize = Math.max(12, Math.round(barHeight * 0.28));
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

            // Draw location & time text
            const textX = Math.round(width * 0.04);
            const line1Y = Math.round(height - barHeight * 0.65);
            const line2Y = Math.round(height - barHeight * 0.35);

            ctx.fillText(`📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, textX, line1Y);
            ctx.fillText(`📅 TIME: ${timestamp}`, textX, line2Y);

            // Convert to Base64 image
            const base64Data = canvas.toDataURL('image/jpeg', 0.85);

            // Upload proof to state context
            addTaskAttachment(taskId, file.name, base64Data)
              .then(() => {
                alert('Geotagged proof photo uploaded successfully!');
              })
              .catch(err => {
                console.error(err);
                alert('Error uploading geotagged proof.');
              })
              .finally(() => {
                setGeotagLoading(null);
              });
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      },
      (err) => {
        setGeotagLoading(null);
        alert(`Failed to capture GPS for geotagging: ${err.message}. Geotagged proofs require active location services.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen w-full bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Authenticating…</p>
        </div>
      </div>
    );
  }

  const statusColor =
    gpsStatus === 'live'      ? '#10b981' :
    gpsStatus === 'acquiring' ? '#f59e0b' :
    gpsStatus === 'error'     ? '#ef4444' : '#64748b';

  return (
    <div className="min-h-screen w-full bg-stone-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-amber-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-emerald-400/20 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 space-y-3">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="bg-white shadow-md border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Field Operative</p>
              <p className="text-sm font-black text-stone-900">{currentUser.name}</p>
              {currentUser.organizationName && (
                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                  <Building size={9}/> {currentUser.organizationName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-800 p-2 rounded-xl text-xs font-bold transition flex items-center justify-center active:scale-95 cursor-pointer"
              title="Switch Color Theme"
            >
              {theme === 'light' ? <Moon size={11} /> : <Sun size={11} />}
            </button>
            <button
              onClick={() => { handleEndShift(); logout(); router.replace('/'); }}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-3 py-1.5 rounded-xl text-[10.5px] font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={11}/> Log Out
            </button>
          </div>
        </div>

        {/* ── GPS Tracking Card ─────────────────────────────────────────── */}
        <div className="bg-white shadow-md border border-stone-200 rounded-2xl p-5 space-y-4">

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
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-[10.5px] text-rose-600">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-rose-500"/>
              <span>{gpsError}</span>
            </div>
          )}

          {/* Ping stats strip */}
          {gpsStatus === 'live' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-2.5 text-center">
                <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Pings Sent</p>
                <p className="text-sm font-black text-amber-600 mt-0.5 flex items-center justify-center gap-1">
                  <Radio size={10}/> {pingCount}
                </p>
              </div>
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-2.5 text-center">
                <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Last Ping</p>
                <p className="text-sm font-black mt-0.5" style={{ color: secondsAgo <= 7 ? '#10b981' : '#f59e0b' }}>
                  {secondsAgo}s ago
                </p>
              </div>
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-2.5 text-center">
                <p className="text-[8px] text-stone-500 uppercase font-black tracking-wider">Accuracy</p>
                <p className="text-sm font-black text-stone-900 mt-0.5">
                  {accuracy !== null ? `±${accuracy}m` : '…'}
                </p>
              </div>
            </div>
          )}

          {/* Coordinates + telemetry */}
          {tracking && tracking.status !== 'offline' && (
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 space-y-2.5">
              <p className="text-[9px] text-stone-500 font-black uppercase tracking-wider flex items-center gap-1">
                <MapPin size={9}/> Current GPS Coordinates
              </p>
              <p className="font-mono text-[11px] text-stone-900 font-bold">
                {tracking.latitude.toFixed(6)}, {tracking.longitude.toFixed(6)}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-200">
                <div>
                  <p className="text-[8px] text-stone-500 uppercase font-black">Speed</p>
                  <p className="text-[11px] font-black text-stone-900 flex items-center gap-0.5 mt-0.5">
                    <Zap size={9} className="text-amber-500"/> {tracking.speed} <span className="text-[8px] text-stone-500">km/h</span>
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-stone-500 uppercase font-black">Battery</p>
                  <p className="text-[11px] font-black mt-0.5 flex items-center gap-0.5" style={{ color: tracking.batteryLevel < 20 ? '#ef4444' : '#10b981' }}>
                    <Battery size={9}/> {tracking.batteryLevel}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-stone-500 uppercase font-black">Status</p>
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 flex-shrink-0 animate-pulse">
              <Wifi size={14}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Shift Active — Broadcasting Every 5s</p>
              <p className="text-[9.5px] text-stone-600 mt-0.5">Admin can see your live location on the map right now.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0">
              <WifiOff size={14}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Off Duty — Hidden from Admin</p>
              <p className="text-[9.5px] text-stone-400 mt-0.5">Tap "Go On Duty" to start broadcasting your location.</p>
            </div>
          </div>
        )}

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        {myAlerts.length > 0 && (
          <div className="bg-white shadow-md border border-amber-200 rounded-2xl p-4 space-y-2">
            <p className="text-[9.5px] text-amber-600 font-black uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10}/> {myAlerts.length} Alert{myAlerts.length > 1 ? 's' : ''}
            </p>
            {myAlerts.map(a => (
              <div key={a.id} className="text-[10px] text-stone-700 flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5"/>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* 🚀 Tasks Section */}
        {myTasks.length > 0 && (
          <div className="bg-white shadow-md border border-stone-200 rounded-2xl p-4 space-y-3">
            <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider flex items-center gap-1">
              <ClipboardList size={12}/> My Tasks ({myTasks.length})
            </p>
            {myTasks.map(t => {
              let distStr = '';
              if (t.location && tracking && tracking.status !== 'offline') {
                const distM = getDistance(tracking.latitude, tracking.longitude, t.location.lat, t.location.lng);
                distStr = distM > 1000 ? `${(distM/1000).toFixed(1)}km away` : `${Math.round(distM)}m away`;
              }
              return (
                <div key={t.id} className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-stone-900 font-bold text-sm">{t.title}</h4>
                      <p className="text-stone-500 text-xs mt-0.5">{t.description}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${t.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-stone-200 text-stone-600'}`}>
                        {t.priority}
                      </span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded mt-1 uppercase ${
                        t.status === 'Pending' ? 'bg-stone-100 text-stone-500' :
                        t.status === 'Started' ? 'bg-emerald-100 text-emerald-600' :
                        t.status === 'Paused' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Special instructions */}
                  {t.notes && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg leading-relaxed mt-1 text-left">
                      💡 <b>HQ Note:</b> {t.notes}
                    </p>
                  )}

                  {/* Comments section inside Mobile UI */}
                  {t.comments && t.comments.length > 0 && (
                    <div className="space-y-1 mt-1 text-left border-t border-stone-100 pt-2">
                      <p className="text-[8.5px] text-stone-400 font-extrabold uppercase tracking-wide">Recent Thread Notes</p>
                      {t.comments.slice(-2).map((c, i) => (
                        <div key={i} className="text-[10px] bg-stone-100 p-1.5 rounded leading-relaxed text-stone-600">
                          <b>{c.authorName.split('@')[0]}:</b> {c.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-stone-200">
                    {t.location && t.status !== 'Completed' && (
                      <button 
                        onClick={() => {
                          const origin = tracking && tracking.status !== 'offline' ? `&origin=${tracking.latitude},${tracking.longitude}` : '';
                          window.open(`https://www.google.com/maps/dir/?api=1${origin}&destination=${t.location!.lat},${t.location!.lng}`, '_blank');
                        }}
                        className="flex-grow bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                      >
                        <Navigation2 size={12}/> Navigate {distStr && `(${distStr})`}
                      </button>
                    )}

                    {t.status === 'Pending' && (
                      <button 
                        onClick={() => updateTaskStatus(t.id, 'Started')}
                        className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Play size={11}/> Start Task
                      </button>
                    )}

                    {t.status === 'Started' && (
                      <>
                        <button 
                          onClick={() => updateTaskStatus(t.id, 'Paused')}
                          className="flex-grow bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Pause size={11}/> Pause
                        </button>
                        <button 
                          onClick={() => updateTaskStatus(t.id, 'Completed')}
                          className="flex-grow bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle size={11}/> Complete
                        </button>
                      </>
                    )}

                    {t.status === 'Paused' && (
                      <button 
                        onClick={() => updateTaskStatus(t.id, 'Started')}
                        className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Play size={11}/> Resume
                      </button>
                    )}

                    {t.status === 'Completed' && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-3 py-1.5 rounded flex items-center gap-1 flex-grow justify-center">
                        <CheckCircle size={12} /> Completed successfully!
                      </span>
                    )}
                  </div>

                  {/* Comment & upload inputs inside employee mobile view */}
                  {t.status !== 'Completed' && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex gap-1">
                      <input 
                        type="text"
                        placeholder="Add quick note..."
                        id={`mob-comment-${t.id}`}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val.trim()) {
                              addTaskComment(t.id, val.trim());
                              (e.target as HTMLInputElement).value = '';
                              alert('Note posted successfully!');
                            }
                          }
                        }}
                        className="flex-grow bg-stone-50 border border-stone-200 text-[10px] pl-2.5 py-1.5 rounded outline-none"
                      />
                      <input 
                        type="file"
                        id={`mob-camera-${t.id}`}
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleGeotagUpload(e, t.id)}
                        className="hidden"
                      />
                      <button
                        onClick={() => startWebcam(t.id)}
                        disabled={geotagLoading === t.id}
                        title="Capture geotagged proof photo"
                        className="bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-500 p-1.5 rounded flex items-center justify-center cursor-pointer transition disabled:opacity-50"
                      >
                        {geotagLoading === t.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-amber-500 rounded-full animate-spin" />
                        ) : (
                          <Paperclip size={12} />
                        )}
                      </button>
                    </div>
                  )}
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

      {currentUser.needsPasswordSetup && (
        <div className="fixed inset-0 z-[2000] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/30 shadow-2xl rounded-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-400 border border-amber-500/20">
                  <Lock size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-stone-100 font-sans">Establish Secure Credentials</h2>
                  <p className="text-[10px] text-stone-500 uppercase font-extrabold tracking-widest mt-0.5 leading-none">First-Time Portal Authentication</p>
                </div>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed font-semibold">
                Welcome! For security compliance, you must establish a private personal password. The organization administrator cannot set this for you.
              </p>

              {setupError && (
                <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10.5px] p-3 rounded-xl flex items-start gap-2.5 font-bold">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-rose-500" />
                  <span>{setupError}</span>
                </div>
              )}

              {setupSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10.5px] p-3 rounded-xl flex items-center gap-2.5 font-bold">
                  <CheckCircle size={14} className="flex-shrink-0 text-emerald-400" />
                  <span>Password established! Unlocking dashboard...</span>
                </div>
              )}

              <form onSubmit={handleSetupPassword} className="space-y-4 text-xs font-bold text-stone-400">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-450 uppercase tracking-wider font-extrabold">New Secure Password *</label>
                  <div className="relative">
                    <input 
                      type={showSetupPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      value={setupPass}
                      onChange={e => setSetupPass(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 text-stone-200 pl-3.5 pr-10 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition focus:outline-none cursor-pointer"
                    >
                      {showSetupPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-450 uppercase tracking-wider font-extrabold">Confirm New Password *</label>
                  <input 
                    type="password"
                    required
                    placeholder="Verify secure password match"
                    value={setupConfirmPass}
                    onChange={e => setSetupConfirmPass(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={setupLoading || setupSuccess}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10 cursor-pointer active:scale-95 transition"
                >
                  {setupLoading ? 'Saving...' : 'Establish Secure Credentials'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WEBCAM CAPTURE OVERLAY MODAL */}
      {activeCameraTaskId && (
        <div className="fixed inset-0 z-[3000] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/25 shadow-2xl rounded-2xl w-full max-w-sm p-4 relative space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <div>
                <h3 className="text-xs font-black text-stone-100">Live Geotagged Shutter</h3>
                <p className="text-[9px] text-stone-500 font-extrabold uppercase tracking-widest mt-0.5">Hardware Camera Feed</p>
              </div>
              <button 
                onClick={stopWebcam}
                className="text-stone-400 hover:text-white transition cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-stone-950/70 border border-white/10 text-[9px] text-stone-400 font-bold px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> REC FEED
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-between">
              {/* Fallback to folders link */}
              <button
                onClick={() => {
                  const input = document.getElementById(`mob-camera-${activeCameraTaskId}`) as HTMLInputElement;
                  input?.click();
                  stopWebcam();
                }}
                className="text-stone-400 hover:text-white text-[10px] font-bold cursor-pointer transition underline"
              >
                Upload from folder instead
              </button>

              {/* Shutter capture button */}
              <button
                onClick={captureWebcamPhoto}
                disabled={geotagLoading === activeCameraTaskId}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2 text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-md shadow-amber-600/10 disabled:opacity-50"
              >
                {geotagLoading === activeCameraTaskId ? 'Watermarking...' : 'Capture Photo'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      </div>

      <style>{`@keyframes ep-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
