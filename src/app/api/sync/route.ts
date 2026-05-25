import { NextResponse } from 'next/server';

// Server-side global state store
declare global {
  var __ftiGlobalAppState: {
    activeTracking: { [key: string]: any };
    historyPaths: { [key: string]: any[] };
    attendance: any[];
    visits: any[];
    alerts: any[];
    tasks: any[];
    geofences: any[];
    isOffline: { [key: string]: boolean };
  } | undefined;
}

if (!globalThis.__ftiGlobalAppState) {
  globalThis.__ftiGlobalAppState = {
    activeTracking: {},
    historyPaths: {},
    attendance: [],
    visits: [],
    alerts: [],
    tasks: [],
    geofences: [],
    isOffline: {},
  };
}

const state = globalThis.__ftiGlobalAppState;

export async function GET() {
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      activeTracking: clientActive,
      historyPaths: clientHistory,
      attendance: clientAttendance,
      visits: clientVisits,
      alerts: clientAlerts,
      tasks: clientTasks,
      geofences: clientGeofences,
      isOffline: clientOffline,
    } = body;

    // 1. Merge activeTracking
    if (clientActive) {
      for (const [empId, clientPing] of Object.entries(clientActive) as [string, any][]) {
        const serverPing = state.activeTracking[empId];
        if (!serverPing || new Date(clientPing.timestamp) > new Date(serverPing.timestamp)) {
          state.activeTracking[empId] = clientPing;
        }
      }
    }

    // 2. Merge historyPaths
    if (clientHistory) {
      for (const [empId, clientPings] of Object.entries(clientHistory) as [string, any[]][]) {
        const serverPings = state.historyPaths[empId] || [];
        const mergedMap = new Map();
        
        // Add server pings to map
        serverPings.forEach(p => mergedMap.set(new Date(p.timestamp).getTime(), p));
        // Add client pings to map (overwriting or adding new ones)
        clientPings.forEach(p => mergedMap.set(new Date(p.timestamp).getTime(), p));

        // Sort by timestamp
        const sortedPings = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        state.historyPaths[empId] = sortedPings;
      }
    }

    // 3. Merge collections (union by unique id)
    const mergeCollection = (serverCol: any[], clientCol: any[]): any[] => {
      if (!clientCol) return serverCol;
      const mergedMap = new Map();
      serverCol.forEach(item => mergedMap.set(item.id, item));
      clientCol.forEach(item => {
        const existing = mergedMap.get(item.id);
        if (!existing) {
          mergedMap.set(item.id, item);
        } else {
          // If the item has updates (e.g. checkOut, completedAt, status), merge them
          mergedMap.set(item.id, { ...existing, ...item });
        }
      });
      return Array.from(mergedMap.values());
    };

    if (clientAttendance) state.attendance = mergeCollection(state.attendance, clientAttendance);
    if (clientVisits) state.visits = mergeCollection(state.visits, clientVisits);
    if (clientAlerts) state.alerts = mergeCollection(state.alerts, clientAlerts);
    if (clientTasks) state.tasks = mergeCollection(state.tasks, clientTasks);
    if (clientGeofences) state.geofences = mergeCollection(state.geofences, clientGeofences);

    // 4. Merge offline state
    if (clientOffline) {
      state.isOffline = { ...state.isOffline, ...clientOffline };
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error syncing state:', error);
    return NextResponse.json({ error: 'Failed to sync state' }, { status: 500 });
  }
}
