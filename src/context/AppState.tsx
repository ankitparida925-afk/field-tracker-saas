'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { mockEmployees, EmployeeRoute, RoutePoint, spoofingDestinations } from '../utils/mockRoutes';
import {
  storeAccessToken,
  getAccessToken,
  clearSession,
  isSessionValid,
  scheduleAutoRefresh,
  ensureSessionId,
} from '../lib/session';
import { decodeTokenUnsafe } from '../lib/jwt';
import { signMessage, verifyMessage } from '../lib/crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'employee';
  employeeId?: string;
  organizationId?: string;
  organizationName?: string;
}

export interface Organization {
  id: string;
  name: string;
  adminEmail: string;
  adminPassword?: string;
  phone: string;
  industry: string;
  createdAt: Date;
}

export interface GPSLog {
  latitude: number;
  longitude: number;
  speed: number;
  batteryLevel: number;
  accuracy: number;
  timestamp: Date;
  status: 'active' | 'idle' | 'offline';
  isSpoofed?: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: Date;
  checkOut?: Date;
  workingHours: number;
  status: 'Present' | 'Late' | 'Absent';
}

export interface VisitRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clientName: string;
  checkIn: Date;
  checkOut?: Date;
  timeSpent?: string; // e.g. "45m"
  photoProof?: string;
  voiceNoteUrl?: string;
  voiceTranscript?: string;
  location: { lat: number; lng: number };
}

export interface AlertLog {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'geofence_entry' | 'geofence_exit' | 'geofence_breach' | 'low_battery' | 'gps_spoof' | 'gps_disabled';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface Task {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: Date;
  status: 'Pending' | 'Completed';
  completedAt?: Date;
  location?: { lat: number; lng: number };
}

interface Geofence {
  id: string;
  employeeId?: string; // If specific to an employee, otherwise global
  name: string;
  lat: number;
  lng: number;
  radius: number;
  type: 'client' | 'territory' | 'restricted';
}

interface AppStateContextType {
  employees: EmployeeRoute[];
  organizations: Organization[];
  activeTracking: { [key: string]: GPSLog };
  historyPaths: { [key: string]: GPSLog[] };
  attendance: AttendanceRecord[];
  visits: VisitRecord[];
  alerts: AlertLog[];
  tasks: Task[];
  geofences: Geofence[];
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  isOffline: { [key: string]: boolean };
  gpsSource: { [key: string]: 'route' | 'real' };
  setGPSSource: (employeeId: string, source: 'route' | 'real') => void;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  registerEmployee: (name: string, email: string, pass: string, department: string, phone: string, organizationId: string, employeeCode?: string, assignedManagerId?: string, isManager?: boolean) => Promise<{ success: boolean; error?: string; otpCode?: string }>;
  registerOrganization: (name: string, email: string, pass: string, phone: string, industry: string, subscriptionPlan?: string) => Promise<boolean>;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  // Simulator triggers
  startShift: (employeeId: string, initialLat?: number, initialLng?: number) => void;
  endShift: (employeeId: string) => void;
  toggleOfflineMode: (employeeId: string) => void;
  triggerSpoof: (employeeId: string, spoofIndex: number) => void;
  adjustSimulatorBattery: (employeeId: string, value: number) => void;
  uploadVisitProof: (employeeId: string, clientName: string, imageBase64: string) => void;
  uploadVoiceNote: (employeeId: string, clientName: string, text: string) => void;
  injectGPSPing: (employeeId: string, lat: number, lng: number, speed?: number) => void;
  // Admin triggers
  assignTask: (task: Omit<Task, 'id' | 'status' | 'employeeName'>) => void;
  draftTaskLocation: { lat: number; lng: number } | null;
  setDraftTaskLocation: (loc: { lat: number; lng: number } | null) => void;
  completeTask: (taskId: string) => void;
  addGeofence: (geofence: Omit<Geofence, 'id'>) => void;
  deleteGeofence: (id: string) => void;
  resolveAlert: (id: string) => void;
  clearAllAlerts: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}


const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Helper: Haversine distance formula in meters
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Data version guard ─────────────────────────────────────────────────────
  // If the stored version doesn't match, wipe all stale localStorage so
  // old org IDs / emails from previous rebrands don't break tenant filtering.
  const DATA_VERSION = 'v4-fti-clean';
  if (typeof window !== 'undefined') {
    const storedVersion = localStorage.getItem('field_tracker_version');
    if (storedVersion !== DATA_VERSION) {
      [
        'field_tracker_employees',
        'field_tracker_organizations',
        'field_tracker_user',
        'field_tracker_demo_mode'
      ].forEach(key => localStorage.removeItem(key));
      localStorage.setItem('field_tracker_version', DATA_VERSION);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const [employees, setEmployees] = useState<EmployeeRoute[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('field_tracker_employees');
      if (saved) {
        try {
          const parsed: EmployeeRoute[] = JSON.parse(saved);
          // Patch any mock employee record that has a stale/missing organizationId
          return parsed.map(emp => {
            const mock = mockEmployees.find(m => m.id === emp.id);
            if (mock && (!emp.organizationId || emp.organizationId !== mock.organizationId)) {
              return { ...emp, organizationId: mock.organizationId, email: mock.email, password: mock.password };
            }
            return emp;
          });
        } catch (e) {
          console.error('Failed to parse saved employees', e);
        }
      }
    }
    return mockEmployees;
  });

  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('field_tracker_organizations');
      if (saved) {
        try {
          const parsed: Organization[] = JSON.parse(saved);
          // Always ensure the default FTI org exists with the correct ID
          const hasFTI = parsed.some(o => o.id === 'org-fti');
          if (!hasFTI) {
            // Remove any stale default org and inject the correct one
            const filtered = parsed.filter(o => o.id !== 'org-qulith');
            return [
              {
                id: 'org-fti',
                name: 'FieldTracker Innovations+',
                adminEmail: 'admin@fti.com',
                adminPassword: 'admin123',
                phone: '+1 (555) 900-1200',
                industry: 'Software & Telemetry',
                createdAt: new Date('2026-01-01T00:00:00.000Z')
              },
              ...filtered
            ];
          }
          return parsed;
        } catch (e) {
          console.error('Failed to parse saved organizations', e);
        }
      }
    }
    return [
      {
        id: 'org-fti',
        name: 'FieldTracker Innovations+',
        adminEmail: 'admin@fti.com',
        adminPassword: 'admin123',
        phone: '+1 (555) 900-1200',
        industry: 'Software & Telemetry',
        createdAt: new Date('2026-01-01T00:00:00.000Z')
      }
    ];
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('field_tracker_demo_mode');
      return saved !== 'false'; // Defaults to true
    }
    return true;
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>('emp-1');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Live employee status tracked in real-time
  const [activeTracking, setActiveTracking] = useState<{ [key: string]: GPSLog }>({});
  const [historyPaths, setHistoryPaths] = useState<{ [key: string]: GPSLog[] }>({});
  const [offlineBuffers, setOfflineBuffers] = useState<{ [key: string]: GPSLog[] }>({});
  const [isOffline, setIsOffline] = useState<{ [key: string]: boolean }>({});
  const isOfflineRef = useRef<{ [key: string]: boolean }>({});
  const [gpsSource, setGpsSource] = useState<{ [key: string]: 'route' | 'real' }>({});
  const gpsSourceRef = useRef<{ [key: string]: 'route' | 'real' }>({});
  const isDemoModeRef = useRef(isDemoMode);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeShiftIndex, setActiveShiftIndex] = useState<{ [key: string]: number }>({});
  const [insideGeofences, setInsideGeofences] = useState<{ [key: string]: { [geoId: string]: boolean } }>({});

  // Collections
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [draftTaskLocation, setDraftTaskLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task-1',
      employeeId: 'emp-1',
      employeeName: 'Rahul Sharma',
      title: 'Present RFP to Apex Corp',
      description: 'Meet with CTO of Apex Corp and present the field operations tracking solution RFP.',
      priority: 'High',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours from now
      status: 'Pending'
    },
    {
      id: 'task-2',
      employeeId: 'emp-1',
      employeeName: 'Rahul Sharma',
      title: 'Store Inspection Apex Retail',
      description: 'Take photographs of promotional posters placed at the storefront.',
      priority: 'Medium',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 8),
      status: 'Pending'
    },
    {
      id: 'task-3',
      employeeId: 'emp-2',
      employeeName: 'Sarah Jenkins',
      title: 'Deliver Ortho Implants to Gen Hospital',
      description: 'Courier the requested surgical knee orthopedic templates to Dr. Carter.',
      priority: 'High',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 2),
      status: 'Pending'
    }
  ]);

  // Initial geofences compiled from mock employees
  const [geofences, setGeofences] = useState<Geofence[]>(() => {
    const list: Geofence[] = [];
    mockEmployees.forEach(emp => {
      emp.geofences.forEach(gf => {
        list.push({
          id: gf.id,
          employeeId: emp.id,
          name: gf.name,
          lat: gf.lat,
          lng: gf.lng,
          radius: gf.radius,
          type: gf.type
        });
      });
    });
    return list;
  });

  // Track timer refs per active employee shift
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Cleanup simulation timers on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, []);

  // Hydrate session on mount (supports tab refreshes and session restore via refresh cookie)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('field_tracker_user');
      const token = getAccessToken();

      const handleExpiredSession = () => {
        clearSession();
        setCurrentUser(null);
        localStorage.removeItem('field_tracker_user');
        const path = window.location.pathname;
        if (path !== '/' && path !== '/signin' && !path.startsWith('/signup') && !path.startsWith('/api')) {
          window.location.href = '/signin?reason=expired';
        }
      };

      if (token) {
        try {
          if (savedUser) {
            const user = JSON.parse(savedUser) as User;
            setCurrentUser(user);
            if (user.role === 'employee' && user.employeeId) {
              setSelectedEmployeeId(user.employeeId);
            }
          }
          scheduleAutoRefresh(
            (newToken) => { storeAccessToken(newToken); },
            handleExpiredSession
          );
        } catch {
          handleExpiredSession();
        }
      } else if (savedUser) {
        // Attempt to restore session using HTTPOnly refresh token cookie
        fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
          .then(async (res) => {
            if (res.ok) {
              const { accessToken, user } = await res.json();
              storeAccessToken(accessToken);
              
              const authedUser: User = {
                id:               user.id,
                name:             user.name,
                email:            user.email,
                role:             user.role,
                employeeId:       user.employeeId,
                organizationId:   user.organizationId,
                organizationName: user.organizationName,
              };
              setCurrentUser(authedUser);
              localStorage.setItem('field_tracker_user', JSON.stringify(authedUser));
              
              if (authedUser.role === 'employee' && authedUser.employeeId) {
                setSelectedEmployeeId(authedUser.employeeId);
              }

              scheduleAutoRefresh(
                (newToken) => { storeAccessToken(newToken); },
                handleExpiredSession
              );
            } else {
              handleExpiredSession();
            }
          })
          .catch(() => {
            handleExpiredSession();
          });
      }
    }
  }, []);

  // Save demo mode changes
  useEffect(() => {
    isDemoModeRef.current = isDemoMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('field_tracker_demo_mode', String(isDemoMode));
    }
  }, [isDemoMode]);

  // Auto-start ALL employee shifts in Demo mode so the map shows all live locations on cold load
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!isDemoMode || employees.length === 0 || autoStartedRef.current) return;
    // Wait until no shifts are running yet
    if (Object.keys(activeTracking).length > 0) return;

    autoStartedRef.current = true;
    // Stagger each employee start by 200ms so state updates don't collide
    employees.forEach((emp, i) => {
      setTimeout(() => {
        if (!intervalRefs.current[emp.id]) {
          startShift(emp.id);
        }
      }, 500 + i * 200);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, employees.length]);

  // Ref to track if the last state update came from a broadcast message to prevent feedback loops
  const isMessageUpdateRef = useRef(false);
  const stateRef = useRef({
    activeTracking,
    historyPaths,
    attendance,
    visits,
    alerts,
    tasks,
    geofences,
    isOffline,
    gpsSource,
    activeShiftIndex,
    employees,
    organizations,
    isDemoMode
  });

  // Keep stateRef updated with the latest state
  useEffect(() => {
    stateRef.current = {
      activeTracking,
      historyPaths,
      attendance,
      visits,
      alerts,
      tasks,
      geofences,
      isOffline,
      gpsSource,
      activeShiftIndex,
      employees,
      organizations,
      isDemoMode
    };
  }, [
    activeTracking,
    historyPaths,
    attendance,
    visits,
    alerts,
    tasks,
    geofences,
    isOffline,
    gpsSource,
    activeShiftIndex,
    employees,
    organizations,
    isDemoMode
  ]);

  // 1. Listen for incoming broadcasts from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('field_tracker_channel');

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'SYNC_STATE') {
        isMessageUpdateRef.current = true;
        if (payload.activeTracking) setActiveTracking(payload.activeTracking);
        if (payload.historyPaths) setHistoryPaths(payload.historyPaths);
        if (payload.attendance) setAttendance(payload.attendance);
        if (payload.visits) setVisits(payload.visits);
        if (payload.alerts) setAlerts(payload.alerts);
        if (payload.tasks) setTasks(payload.tasks);
        if (payload.geofences) setGeofences(payload.geofences);
        if (payload.isOffline) setIsOffline(payload.isOffline);
        if (payload.gpsSource) setGpsSource(payload.gpsSource);
        if (payload.activeShiftIndex) setActiveShiftIndex(payload.activeShiftIndex);
        if (payload.employees) setEmployees(payload.employees);
        if (payload.organizations) setOrganizations(payload.organizations);
        if (payload.isDemoMode !== undefined) setIsDemoMode(payload.isDemoMode);

        // Clear the message update flag after all state updates and renders have finished.
        // A 100ms timeout safely spans across asynchronous React rendering microtasks.
        setTimeout(() => {
          isMessageUpdateRef.current = false;
        }, 100);
      } else if (type === 'REQUEST_SYNC') {
        // Send our latest state back to the requesting tab
        channel.postMessage({
          type: 'SYNC_STATE',
          payload: stateRef.current
        });
      }
    };

    channel.addEventListener('message', handleMessage);
    
    // Request initial state synchronization from any active tabs
    channel.postMessage({ type: 'REQUEST_SYNC' });

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // 2. Broadcast local changes to other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isMessageUpdateRef.current) {
      // Do not reset it here anymore since it is managed by the setTimeout in handleMessage
      return;
    }

    const channel = new BroadcastChannel('field_tracker_channel');
    channel.postMessage({
      type: 'SYNC_STATE',
      payload: {
        activeTracking,
        historyPaths,
        attendance,
        visits,
        alerts,
        tasks,
        geofences,
        isOffline,
        gpsSource,
        activeShiftIndex,
        employees,
        organizations,
        isDemoMode
      }
    });
    channel.close();
  }, [
    activeTracking,
    historyPaths,
    attendance,
    visits,
    alerts,
    tasks,
    geofences,
    isOffline,
    gpsSource,
    activeShiftIndex,
    employees,
    organizations,
    isDemoMode
  ]);

  // 3. Server-side State Synchronization (Syncs cross-device in real-time)
  const lastSyncHashRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    const syncState = async () => {
      if (isMessageUpdateRef.current) return;
      
      try {
        const payload = {
          activeTracking: stateRef.current.activeTracking,
          historyPaths: stateRef.current.historyPaths,
          attendance: stateRef.current.attendance,
          visits: stateRef.current.visits,
          alerts: stateRef.current.alerts,
          tasks: stateRef.current.tasks,
          geofences: stateRef.current.geofences,
          isOffline: stateRef.current.isOffline,
          gpsSource: stateRef.current.gpsSource,
          isDemoMode: stateRef.current.isDemoMode,
        };

        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok || !active) return;
        const serverState = await res.json();

        const currentHash = JSON.stringify({
          activeTracking: serverState.activeTracking,
          attendanceCount: serverState.attendance?.length,
          visitsCount: serverState.visits?.length,
          alertsCount: serverState.alerts?.length,
          tasksCount: serverState.tasks?.length,
          geofencesCount: serverState.geofences?.length,
          isDemoMode: serverState.isDemoMode,
        });

        if (currentHash === lastSyncHashRef.current) return;
        lastSyncHashRef.current = currentHash;

        isMessageUpdateRef.current = true;
        
        const parseDates = (arr: any[]) => {
          if (!arr) return [];
          return arr.map(item => {
            const parsed = { ...item };
            if (parsed.timestamp) parsed.timestamp = new Date(parsed.timestamp);
            if (parsed.checkIn) parsed.checkIn = new Date(parsed.checkIn);
            if (parsed.checkOut) parsed.checkOut = new Date(parsed.checkOut);
            if (parsed.deadline) parsed.deadline = new Date(parsed.deadline);
            if (parsed.completedAt) parsed.completedAt = new Date(parsed.completedAt);
            if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
            return parsed;
          });
        };

        const parseActiveTracking = (obj: any) => {
          if (!obj) return {};
          const parsed: any = {};
          for (const [key, val] of Object.entries(obj) as any[]) {
            parsed[key] = {
              ...val,
              timestamp: new Date(val.timestamp)
            };
          }
          return parsed;
        };

        const parseHistoryPaths = (obj: any) => {
          if (!obj) return {};
          const parsed: any = {};
          for (const [key, val] of Object.entries(obj) as any[]) {
            parsed[key] = parseDates(val);
          }
          return parsed;
        };

        if (serverState.activeTracking) {
          setActiveTracking(parseActiveTracking(serverState.activeTracking));
        }
        if (serverState.historyPaths) {
          setHistoryPaths(parseHistoryPaths(serverState.historyPaths));
        }
        if (serverState.attendance) {
          setAttendance(parseDates(serverState.attendance));
        }
        if (serverState.visits) {
          setVisits(parseDates(serverState.visits));
        }
        if (serverState.alerts) {
          setAlerts(parseDates(serverState.alerts));
        }
        if (serverState.tasks) {
          setTasks(parseDates(serverState.tasks));
        }
        if (serverState.geofences) {
          setGeofences(parseDates(serverState.geofences));
        }
        if (serverState.isOffline) {
          setIsOffline(serverState.isOffline);
          isOfflineRef.current = serverState.isOffline;
        }
        if (serverState.gpsSource) {
          setGpsSource(serverState.gpsSource);
          gpsSourceRef.current = serverState.gpsSource;
        }
        if (serverState.isDemoMode !== undefined) {
          setIsDemoMode(serverState.isDemoMode);
          isDemoModeRef.current = serverState.isDemoMode;
        }

        setTimeout(() => {
          isMessageUpdateRef.current = false;
        }, 100);

      } catch (err) {
        console.error('State sync error:', err);
      }
    };

    syncState();
    const interval = setInterval(syncState, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const setGPSSource = (employeeId: string, source: 'route' | 'real') => {
    if (gpsSourceRef.current[employeeId] === source) return;
    gpsSourceRef.current[employeeId] = source;
    setGpsSource(prev => ({ ...prev, [employeeId]: source }));
  };

  // ── Secure login via POST /api/auth/login ──────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
        credentials: 'include', // Needed for the httpOnly refresh cookie
      });

      if (!res.ok) return false;

      const { accessToken, user } = await res.json();

      // Store the JWT in sessionStorage (auto-cleared on tab close)
      storeAccessToken(accessToken);
      ensureSessionId();

      // Decode the user profile from the token payload (no sensitive data)
      const tokenPayload = decodeTokenUnsafe(accessToken);

      const authedUser: User = {
        id:               user.id,
        name:             user.name,
        email:            user.email,
        role:             user.role,
        employeeId:       user.employeeId,
        organizationId:   user.organizationId,
        organizationName: user.organizationName,
      };

      setCurrentUser(authedUser);

      // Persist non-sensitive user profile to localStorage for page refresh recovery
      if (typeof window !== 'undefined') {
        localStorage.setItem('field_tracker_user', JSON.stringify(authedUser));
      }

      if (user.role === 'employee' && user.employeeId) {
        setSelectedEmployeeId(user.employeeId);
      }

      // Schedule auto-refresh 60s before token expiry
      scheduleAutoRefresh(
        (newToken) => { storeAccessToken(newToken); },
        () => {
          // Token expired and refresh failed — force logout
          clearSession();
          setCurrentUser(null);
          if (typeof window !== 'undefined') localStorage.removeItem('field_tracker_user');
          window.location.href = '/signin?reason=expired';
        }
      );

      void tokenPayload; // suppress unused warning
      return true;
    } catch {
      return false;
    }
  };

  // ── Secure logout via POST /api/auth/logout ────────────────────────────────
  const logout = () => {
    // Revoke the refresh token on the server (fires & forgets)
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

    // Clear client-side session
    clearSession();
    setCurrentUser(null);
    setSelectedEmployeeId('emp-1');

    if (typeof window !== 'undefined') {
      localStorage.removeItem('field_tracker_user');
    }
  };

  // ── Staff registration via POST /api/auth/register/staff ──────────────────
  const registerEmployee = async (
    name: string,
    email: string,
    pass: string,
    department: string,
    phone: string,
    organizationId: string,
    employeeCode?: string,
    assignedManagerId?: string,
    isManager?: boolean
  ): Promise<{ success: boolean; error?: string; otpCode?: string }> => {
    try {
      const res = await fetch('/api/auth/register/staff', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name,
          email,
          password: pass,
          department,
          phone,
          organizationId,
          employeeCode,
          assignedManagerId,
          isManager
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to register employee.' };
      }

      const { employeeId, otpCode } = await res.json();

      // Add to local state so UI reflects immediately
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
      const AVATAR_POOL = [
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
      ];
      const idx = employees.length % colors.length;

      const newEmp: EmployeeRoute = {
        id:             employeeId,
        name:           name.trim(),
        role:           isManager ? 'Field Operations Manager' : `${department} Representative`,
        department,
        phone,
        avatar:         AVATAR_POOL[idx % AVATAR_POOL.length],
        color:          colors[idx],
        batteryStart:   100,
        baseSpeed:      0,
        email:          email.trim().toLowerCase(),
        password:       pass,
        organizationId,
        employeeCode:   employeeCode || `EMP-${Math.floor(Math.random()*9000)+1000}`,
        assignedManagerId: assignedManagerId || undefined,
        isManager:      isManager || false,
        isActive:       true,
        points:         [],
        geofences:      [],
      };

      setEmployees(prev => {
        const next = [...prev, newEmp];
        if (typeof window !== 'undefined') {
          localStorage.setItem('field_tracker_employees', JSON.stringify(next));
        }
        return next;
      });

      return { success: true, otpCode };
    } catch {
      return { success: false, error: 'Network error or invalid server response.' };
    }
  };

  // ── Org registration via POST /api/auth/register/org ──────────────────────
  const registerOrganization = async (
    name: string,
    email: string,
    pass: string,
    phone: string,
    industry: string,
    subscriptionPlan: string = 'FREE_TRIAL'
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register/org', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password: pass, phone, industry, subscriptionPlan }),
      });

      if (res.status === 409) return false; // Email already exists
      if (!res.ok) return false;

      const { orgId } = await res.json();

      // Add to local state so Staff Sign Up dropdown reflects immediately
      const newOrg: Organization = {
        id:       orgId,
        name:     name.trim(),
        adminEmail: email.trim().toLowerCase(),
        phone,
        industry,
        createdAt: new Date(),
      };

      setOrganizations(prev => {
        const next = [...prev, newOrg];
        if (typeof window !== 'undefined') {
          localStorage.setItem('field_tracker_organizations', JSON.stringify(next));
        }
        return next;
      });

      return true;
    } catch {
      return false;
    }
  };

  // START SHIFT
  const startShift = (employeeId: string, initialLat?: number, initialLng?: number) => {
    if (intervalRefs.current[employeeId]) return; // Already running

    // Read from ref so we always get the latest employees list, not a stale closure
    const employee = stateRef.current.employees.find(e => e.id === employeeId);
    if (!employee) return;

    // Reset simulator indices and values
    setActiveShiftIndex(prev => ({ ...prev, [employeeId]: 0 }));
    setIsOffline(prev => { const next = { ...prev, [employeeId]: false }; isOfflineRef.current = next; return next; });

    const latitude = initialLat !== undefined ? initialLat : (employee.points[0]?.lat ?? 37.7749);
    const longitude = initialLng !== undefined ? initialLng : (employee.points[0]?.lng ?? -122.4194);
    const locationName = initialLat !== undefined ? "Current Device Location" : (employee.points[0]?.name ?? "HQ Office");

    if (initialLat !== undefined && initialLng !== undefined) {
      gpsSourceRef.current[employeeId] = 'real';
      setGpsSource(prev => ({ ...prev, [employeeId]: 'real' }));

      // Dynamically add a real local geofence centered on their physical coordinates so they can test geofencing!
      const localGeofence = {
        id: `geo-local-${employeeId}-${Date.now()}`,
        employeeId,
        name: 'Current Hub (Device GPS)',
        lat: initialLat,
        lng: initialLng,
        radius: 50, // 50 meters
        type: 'client' as const
      };
      setGeofences(prev => {
        const filtered = prev.filter(g => !g.id.startsWith(`geo-local-${employeeId}`));
        return [...filtered, localGeofence];
      });
    }

    // Create Initial GPS Ping
    const initialPing: GPSLog = {
      latitude,
      longitude,
      speed: 0,
      batteryLevel: employee.batteryStart,
      accuracy: 5,
      timestamp: new Date(),
      status: 'active'
    };

    setActiveTracking(prev => ({ ...prev, [employeeId]: initialPing }));
    setHistoryPaths(prev => ({ ...prev, [employeeId]: [initialPing] }));

    // 1. Mark Attendance Check-In
    const isLate = new Date().getHours() >= 10; // Late after 10 AM
    const newAttendance: AttendanceRecord = {
      id: `att-${Date.now()}-${employeeId}`,
      employeeId,
      employeeName: employee.name,
      checkIn: new Date(),
      workingHours: 0,
      status: isLate ? 'Late' : 'Present'
    };
    setAttendance(prev => [newAttendance, ...prev]);

    // 2. Add System Alert
    addSystemAlert(
      employeeId,
      employee.name,
      'geofence_entry',
      `Shift Started & Checked-in at ${locationName}`,
      'low'
    );

    // If using simulated route, run evaluation; otherwise evaluate geofence for real device location
    if (initialLat !== undefined && initialLng !== undefined) {
      evaluateGeofenceCrossings(employee, { lat: latitude, lng: longitude, name: 'Browser GPS Point', isStop: true });
    }

    // Only start simulated coordinates ticking if isDemoMode is active
    if (isDemoModeRef.current && employee.points.length > 0) {
      // 3. Start Shift Loop (coordinate tick every 5 seconds)
      const tickTime = 5000;
      let currIndex = 0;
      let battery = employee.batteryStart;

      const timer = setInterval(() => {
        currIndex += 1;
        
        // If we reach the end of coordinates, stop or loop back
        if (currIndex >= employee.points.length && gpsSourceRef.current[employeeId] === 'route') {
          clearInterval(timer);
          delete intervalRefs.current[employeeId];
          endShift(employeeId);
          return;
        }

        const source = gpsSourceRef.current[employeeId] || 'route';
        if (source === 'route') {
          setActiveShiftIndex(prev => {
            const nextIdx = (prev[employeeId] ?? 0) + 1;
            simulateGPSPing(employee, nextIdx, battery);
            return { ...prev, [employeeId]: nextIdx };
          });
        }

        // Slowly drain battery (0.2% per update)
        battery = Math.max(0, battery - 0.2);
      }, tickTime);

      intervalRefs.current[employeeId] = timer;
    }
  };

  // END SHIFT
  const endShift = (employeeId: string) => {
    if (intervalRefs.current[employeeId]) {
      clearInterval(intervalRefs.current[employeeId]);
      delete intervalRefs.current[employeeId];
    }

    setGPSSource(employeeId, 'route');

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    setActiveTracking(prev => {
      if (!prev[employeeId]) return prev;
      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          status: 'offline',
          timestamp: new Date()
        }
      };
    });

    // Mark Attendance Check-Out
    setAttendance(prev =>
      prev.map(att => {
        if (att.employeeId === employeeId && !att.checkOut) {
          const checkOutTime = new Date();
          const hours = parseFloat(((checkOutTime.getTime() - att.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
          return {
            ...att,
            checkOut: checkOutTime,
            workingHours: hours > 0 ? hours : 0.05
          };
        }
        return att;
      })
    );

    // Close any active client visits that are pending check-out
    setVisits(prev =>
      prev.map(v => {
        if (v.employeeId === employeeId && !v.checkOut) {
          const outTime = new Date();
          const duration = Math.round((outTime.getTime() - v.checkIn.getTime()) / (1000 * 60));
          return {
            ...v,
            checkOut: outTime,
            timeSpent: `${duration}m`
          };
        }
        return v;
      })
    );

    addSystemAlert(
      employeeId,
      employee.name,
      'geofence_exit',
      `Shift ended and checked-out. Total hours logged.`,
      'low'
    );
  };

  // OFFLINE MODE TOGGLE
  const toggleOfflineMode = (employeeId: string) => {
    setIsOffline(prev => {
      const nextOffline = !prev[employeeId];
      const employee = employees.find(e => e.id === employeeId);

      if (!nextOffline && employee) {
        // Syncing Offline logs
        const cached = offlineBuffers[employeeId] || [];
        if (cached.length > 0) {
          setHistoryPaths(history => ({
            ...history,
            [employeeId]: [...(history[employeeId] || []), ...cached]
          }));
          
          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_entry',
            `Back Online! Synchronized ${cached.length} cached offline GPS logs successfully.`,
            'medium'
          );

          setOfflineBuffers(buffers => ({ ...buffers, [employeeId]: [] }));
        }
      } else if (nextOffline && employee) {
        addSystemAlert(
          employeeId,
          employee.name,
          'gps_disabled',
          `Network offline. GPS logs will be cached locally on the device.`,
          'medium'
        );
      }

      const next = { ...prev, [employeeId]: nextOffline };
      isOfflineRef.current = next;
      return next;
    });
  };

  // TRIGGER GPS SPOOF
  const triggerSpoof = (employeeId: string, spoofIndex: number) => {
    const employee = employees.find(e => e.id === employeeId);
    const destination = spoofingDestinations[spoofIndex];
    if (!employee || !destination) return;

    const currentGPS = activeTracking[employeeId];
    if (!currentGPS) return;

    // Simulate direct teleport to the spoof coordinates
    const spoofedPing: GPSLog = {
      latitude: destination.lat,
      longitude: destination.lng,
      speed: 280, // Flag highly suspicious speed (280 km/h)
      batteryLevel: currentGPS.batteryLevel,
      accuracy: 1, // High precision
      timestamp: new Date(),
      status: 'active',
      isSpoofed: true
    };

    setActiveTracking(prev => ({ ...prev, [employeeId]: spoofedPing }));
    setHistoryPaths(prev => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] || []), spoofedPing]
    }));

    addSystemAlert(
      employeeId,
      employee.name,
      'gps_spoof',
      `CRITICAL: Fake GPS Spoofing / Suspicious movement detected! Employee jumped to ${destination.name} at impossible speeds.`,
      'critical'
    );
  };

  // BATTERY ADJUSTMENT
  const adjustSimulatorBattery = (employeeId: string, value: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    setActiveTracking(prev => {
      if (!prev[employeeId]) return prev;
      const updated = { ...prev[employeeId], batteryLevel: value };

      if (value < 15) {
        addSystemAlert(
          employeeId,
          employee.name,
          'low_battery',
          `Warning: Critical Battery alert! Employee device is at ${value}%. Background tracking may shut off soon.`,
          'high'
        );
      }

      return { ...prev, [employeeId]: updated };
    });
  };

  // PROOF UPLOAD (Photo)
  const uploadVisitProof = (employeeId: string, clientName: string, imageBase64: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const currentGPS = activeTracking[employeeId];
    const loc = currentGPS ? { lat: currentGPS.latitude, lng: currentGPS.longitude } : { lat: 37.7749, lng: -122.4194 };

    // Find active visit or create new
    setVisits(prev => {
      const idx = prev.findIndex(v => v.employeeId === employeeId && v.clientName === clientName && !v.checkOut);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          photoProof: imageBase64
        };
        return updated;
      } else {
        const newRecord: VisitRecord = {
          id: `visit-${Date.now()}-${employeeId}`,
          employeeId,
          employeeName: employee.name,
          clientName,
          checkIn: new Date(),
          photoProof: imageBase64,
          location: loc
        };
        return [newRecord, ...prev];
      }
    });

    addSystemAlert(
      employeeId,
      employee.name,
      'geofence_entry',
      `Uploaded photo visit proof for ${clientName} (GPS Tagged & Verified).`,
      'low'
    );
  };

  // PROOF UPLOAD (Voice Note)
  const uploadVoiceNote = (employeeId: string, clientName: string, text: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const currentGPS = activeTracking[employeeId];
    const loc = currentGPS ? { lat: currentGPS.latitude, lng: currentGPS.longitude } : { lat: 37.7749, lng: -122.4194 };

    setVisits(prev => {
      const idx = prev.findIndex(v => v.employeeId === employeeId && v.clientName === clientName && !v.checkOut);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          voiceNoteUrl: '#', // mock audio file
          voiceTranscript: text
        };
        return updated;
      } else {
        const newRecord: VisitRecord = {
          id: `visit-${Date.now()}-${employeeId}`,
          employeeId,
          employeeName: employee.name,
          clientName,
          checkIn: new Date(),
          voiceNoteUrl: '#',
          voiceTranscript: text,
          location: loc
        };
        return [newRecord, ...prev];
      }
    });

    // Auto complete tasks that match this visit if any
    setTasks(prev =>
      prev.map(t => {
        if (t.employeeId === employeeId && t.title.toLowerCase().includes(clientName.toLowerCase()) && t.status === 'Pending') {
          return {
            ...t,
            status: 'Completed',
            completedAt: new Date()
          };
        }
        return t;
      })
    );

    addSystemAlert(
      employeeId,
      employee.name,
      'geofence_entry',
      `Voice summary uploaded for ${clientName}. AI Speech-to-Text completed.`,
      'low'
    );
  };

  // ADMIN OPERATIONS
  const assignTask = (newTask: Omit<Task, 'id' | 'status' | 'employeeName'>) => {
    const employee = employees.find(e => e.id === newTask.employeeId);
    const taskRecord: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      employeeName: employee ? employee.name : 'Unknown',
      status: 'Pending'
    };
    setTasks(prev => [taskRecord, ...prev]);
  };

  const completeTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'Completed', completedAt: new Date() } : t))
    );
  };

  const addGeofence = (newGf: Omit<Geofence, 'id'>) => {
    const newRecord: Geofence = {
      ...newGf,
      id: `geo-custom-${Date.now()}`
    };
    setGeofences(prev => [...prev, newRecord]);
  };

  const deleteGeofence = (id: string) => {
    setGeofences(prev => prev.filter(g => g.id !== id));
  };

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  // GPS TICK LOGIC
  const simulateGPSPing = (employee: EmployeeRoute, pointIndex: number, currentBattery: number) => {
    const point = employee.points[pointIndex];
    if (!point) return;

    const employeeId = employee.id;
    const offline = isOfflineRef.current[employeeId] || false;

    // Calculate simulated speed and jitter
    let computedSpeed = employee.baseSpeed;
    if (point.isStop) {
      computedSpeed = 0;
    } else {
      computedSpeed = Math.round(employee.baseSpeed + (Math.random() * 8 - 4));
    }

    const ping: GPSLog = {
      latitude: point.lat,
      longitude: point.lng,
      speed: computedSpeed,
      batteryLevel: Math.round(currentBattery),
      accuracy: point.isStop ? 3 : Math.round(4 + Math.random() * 6),
      timestamp: new Date(),
      status: point.isStop ? 'idle' : 'active'
    };

    if (offline) {
      // Store in buffer
      setOfflineBuffers(prev => ({
        ...prev,
        [employeeId]: [...(prev[employeeId] || []), ping]
      }));
      return;
    }

    // Direct Live Sync
    setActiveTracking(prev => ({ ...prev, [employeeId]: ping }));
    setHistoryPaths(prev => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] || []), ping]
    }));

    // Perform Geofence testing (intersection tests)
    evaluateGeofenceCrossings(employee, point);
  };

  // GEOFENCE MATCH ENGINE
  const evaluateGeofenceCrossings = (employee: EmployeeRoute, point: RoutePoint) => {
    const employeeId = employee.id;
    const currentInside = insideGeofences[employeeId] || {};
    const nextInside: { [geoId: string]: boolean } = { ...currentInside };

    // Search matches in geofences
    geofences.forEach(gf => {
      // Test globally, or test if employee-specific
      if (gf.employeeId && gf.employeeId !== employeeId) return;

      const dist = getHaversineDistance(point.lat, point.lng, gf.lat, gf.lng);
      const isInside = dist <= gf.radius;

      const wasInside = !!currentInside[gf.id];

      if (isInside && !wasInside) {
        // Just entered a geofence
        nextInside[gf.id] = true;

        if (gf.type === 'client') {
          // Check-In visit
          const newVisit: VisitRecord = {
            id: `visit-${Date.now()}-${gf.id}`,
            employeeId,
            employeeName: employee.name,
            clientName: gf.name,
            checkIn: new Date(),
            location: { lat: gf.lat, lng: gf.lng }
          };
          setVisits(prev => [newVisit, ...prev]);

          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_entry',
            `Entered Client Zone: checked-in to ${gf.name}`,
            'low'
          );
        } else if (gf.type === 'restricted') {
          // Geofence breach alarm
          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_breach',
            `ALERT: Employee entered restricted zone: ${gf.name}!`,
            'high'
          );
        } else {
          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_entry',
            `Entered Territory Zone: ${gf.name}`,
            'low'
          );
        }
      } else if (!isInside && wasInside) {
        // Just exited a geofence
        nextInside[gf.id] = false;

        if (gf.type === 'client') {
          // Check-Out visit
          setVisits(prev =>
            prev.map(v => {
              if (v.employeeId === employeeId && v.clientName === gf.name && !v.checkOut) {
                const checkOutTime = new Date();
                const duration = Math.round((checkOutTime.getTime() - v.checkIn.getTime()) / (1000 * 60));
                return {
                  ...v,
                  checkOut: checkOutTime,
                  timeSpent: `${duration > 0 ? duration : 1}m`
                };
              }
              return v;
            })
          );

          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_exit',
            `Exited Client Zone: checked-out from ${gf.name}`,
            'low'
          );
        } else if (gf.type === 'restricted') {
          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_exit',
            `Exited restricted territory: ${gf.name}`,
            'medium'
          );
        } else {
          addSystemAlert(
            employeeId,
            employee.name,
            'geofence_exit',
            `Exited Territory Zone: ${gf.name}`,
            'low'
          );
        }
      }
    });

    setInsideGeofences(prev => ({ ...prev, [employeeId]: nextInside }));
  };

  const addSystemAlert = (
    employeeId: string,
    employeeName: string,
    type: AlertLog['type'],
    message: string,
    severity: AlertLog['severity']
  ) => {
    const alertRecord: AlertLog = {
      id: `alert-${Date.now()}-${Math.random()}`,
      employeeId,
      employeeName,
      type,
      message,
      timestamp: new Date(),
      severity,
      resolved: false
    };
    setAlerts(prev => [alertRecord, ...prev]);
  };

  const injectGPSPing = (employeeId: string, lat: number, lng: number, speed: number = -1) => {
    const employee = stateRef.current.employees.find(e => e.id === employeeId);
    if (!employee) return;

    if (gpsSourceRef.current[employeeId] !== 'real') {
      gpsSourceRef.current[employeeId] = 'real';
      setGpsSource(prev => ({ ...prev, [employeeId]: 'real' }));
    }

    const offline     = isOfflineRef.current[employeeId] || false;
    const currentGPS  = stateRef.current.activeTracking[employeeId];
    const prevBattery = currentGPS ? currentGPS.batteryLevel : employee.batteryStart;

    // Auto-calculate speed from consecutive GPS positions when not explicitly provided
    let computedSpeed = speed >= 0 ? speed : 0;
    if (speed < 0 && currentGPS) {
      const distMeters   = getHaversineDistance(currentGPS.latitude, currentGPS.longitude, lat, lng);
      const timeDeltaSec = (Date.now() - new Date(currentGPS.timestamp).getTime()) / 1000;
      if (timeDeltaSec > 0) {
        computedSpeed = Math.round((distMeters / timeDeltaSec) * 3.6);
        computedSpeed = Math.min(computedSpeed, 200);
      }
    }

    // Drain battery 0.15% per ping
    const newBattery = Math.max(0, prevBattery - 0.15);

    const ping: GPSLog = {
      latitude:     lat,
      longitude:    lng,
      speed:        computedSpeed,
      batteryLevel: parseFloat(newBattery.toFixed(1)),
      accuracy:     5,
      timestamp:    new Date(),
      status:       computedSpeed > 0 ? 'active' : 'idle',
    };

    if (offline) {
      setOfflineBuffers(prev => ({
        ...prev,
        [employeeId]: [...(prev[employeeId] || []), ping],
      }));
      return;
    }

    setActiveTracking(prev => ({ ...prev, [employeeId]: ping }));
    setHistoryPaths(prev => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] || []), ping],
    }));

    evaluateGeofenceCrossings(employee, { lat, lng, name: 'Live GPS Ping', isStop: computedSpeed === 0 });
  };

  return (
    <AppStateContext.Provider
      value={{
        employees,
        organizations,
        activeTracking,
        historyPaths,
        attendance,
        visits,
        alerts,
        tasks,
        geofences,
        selectedEmployeeId,
        setSelectedEmployeeId,
        isOffline,
        gpsSource,
        setGPSSource,
        currentUser,
        login,
        logout,
        registerEmployee,
        registerOrganization,
        isDemoMode,
        setIsDemoMode,
        startShift,
        endShift,
        toggleOfflineMode,
        triggerSpoof,
        adjustSimulatorBattery,
        uploadVisitProof,
        uploadVoiceNote,
        injectGPSPing,
        assignTask,
        draftTaskLocation,
        setDraftTaskLocation,
        completeTask,
        addGeofence,
        deleteGeofence,
        resolveAlert,
        clearAllAlerts,
        playbackSpeed,
        setPlaybackSpeed
      }}

    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
