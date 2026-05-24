import { GPSLog, AttendanceRecord, VisitRecord, AlertLog, Task } from '../context/AppState';
import { EmployeeRoute } from './mockRoutes';

export interface AIChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export function generateRouteInsights(
  employee: EmployeeRoute,
  tracking: GPSLog | undefined,
  history: GPSLog[],
  visits: VisitRecord[],
  alerts: AlertLog[]
) {
  const employeeId = employee.id;
  const employeeAlerts = alerts.filter(a => a.employeeId === employeeId);
  const employeeVisits = visits.filter(v => v.employeeId === employeeId);

  // Compute stats
  const totalStops = employeeVisits.length;
  const hasSpoofed = employeeAlerts.some(a => a.type === 'gps_spoof');
  const geofenceBreaches = employeeAlerts.filter(a => a.type === 'geofence_breach').length;
  const lowBatteryAlerts = employeeAlerts.filter(a => a.type === 'low_battery').length;

  let productivityScore = 85; // baseline
  let efficiencyLoss = 0;
  const insightsList: string[] = [];

  // Deduct for alerts
  if (hasSpoofed) {
    productivityScore -= 45;
    insightsList.push(`CRITICAL: Fake GPS detection triggered for ${employee.name}. Productivity audit required.`);
  }
  if (geofenceBreaches > 0) {
    productivityScore -= 10 * geofenceBreaches;
    insightsList.push(`Restricted zone breaches: ${geofenceBreaches} detected. Possible unauthorized stops.`);
  }
  if (lowBatteryAlerts > 0) {
    insightsList.push(`Critical battery alerts logged: ${lowBatteryAlerts}. Advise employee to charge device.`);
  }

  // Calculate simulated travel optimization
  if (employee.id === 'emp-1') {
    productivityScore = Math.max(20, productivityScore - 5);
    insightsList.push('Rahul spent 10 minutes in Restricted Industrial Zone. Route overlap at SOMA detected.');
    insightsList.push('Suggested a 14% shorter alternate route available by bypassing SOMA traffic.');
  } else if (employee.id === 'emp-2') {
    productivityScore = 94;
    insightsList.push('Excellent route compliance today. Sarah completed client visits 12 minutes ahead of schedule.');
    insightsList.push('Smart client ordering saved 0.8 gallons of fuel today.');
  } else if (employee.id === 'emp-3') {
    productivityScore = 88;
    insightsList.push('High volume deliveries. Amit covered 18.5 miles today with high accuracy.');
    insightsList.push('Traffic congestion near Fisherman\'s wharf increased idle time by 14 minutes.');
  } else if (employee.id === 'emp-4') {
    if (hasSpoofed) {
      insightsList.push('Carlos Ruiz marked offline following abnormal location teleportation to Golden Gate Bridge.');
    } else {
      insightsList.push('Carlos is currently conducting inspection tasks at Western Power Grid.');
    }
  }

  return {
    productivityScore: Math.max(10, Math.min(100, productivityScore)),
    efficiencyLoss,
    insights: insightsList
  };
}

export function parseAIChatQuery(
  query: string,
  employees: EmployeeRoute[],
  activeTracking: { [key: string]: GPSLog },
  attendance: AttendanceRecord[],
  visits: VisitRecord[],
  alerts: AlertLog[],
  tasks: Task[]
): string {
  const lowerQuery = query.toLowerCase();

  // Query: Who is online?
  if (lowerQuery.includes('online') || lowerQuery.includes('who is active') || lowerQuery.includes('active employees')) {
    const active = employees.filter(e => activeTracking[e.id] && activeTracking[e.id].status !== 'offline');
    if (active.length === 0) {
      return 'No employees are currently online. All devices show offline or shifts have not started yet.';
    }
    return `There are currently ${active.length} employee(s) online:\n` +
      active.map(e => `• **${e.name}** (${e.role}) - Speed: ${activeTracking[e.id].speed} km/h, Battery: ${activeTracking[e.id].batteryLevel}%`).join('\n');
  }

  // Query: Alerts or Warnings
  if (lowerQuery.includes('alert') || lowerQuery.includes('warning') || lowerQuery.includes('spoof') || lowerQuery.includes('violation')) {
    const unres = alerts.filter(a => !a.resolved);
    if (unres.length === 0) {
      return 'All system alerts are currently clear. No geofence breaches, battery issues, or GPS spoof anomalies detected.';
    }
    return `⚠️ **Active Alerts Panel (${unres.length} unresolved):**\n` +
      unres.map(a => `• [${a.severity.toUpperCase()}] **${a.employeeName}**: ${a.message} (${new Date(a.timestamp).toLocaleTimeString()})`).join('\n');
  }

  // Query: Route Optimization or Route efficiency
  if (lowerQuery.includes('optimize') || lowerQuery.includes('efficiency') || lowerQuery.includes('fuel')) {
    return `🚗 **AI Route Optimization Recommendations:**\n` +
      `1. **Rahul Sharma**: Re-route via Pine St. Bypassing the Union Square construction saves **18% travel time** and **0.4 gal of fuel**.\n` +
      `2. **Amit Patel**: High gridlock at Fisherman's Wharf. Smart client sequencing suggests visiting *Marina Distribution* first, then *Gourmet Foods* to shave **3.2 miles** off the path.`;
  }

  // Query: Performance summary
  if (lowerQuery.includes('summary') || lowerQuery.includes('report') || lowerQuery.includes('performance')) {
    return `📊 **AI Organization Summary (Today):**\n` +
      `• **HQ Attendance**: ${attendance.length} checked-in today.\n` +
      `• **Total Visits Logged**: ${visits.length} customer visits verified.\n` +
      `• **Alerts Triggered**: ${alerts.length} system notices.\n` +
      `• **Top Performer**: **Sarah Jenkins** (Productivity Score: 94%, Route Efficiency: 96%)\n` +
      `• **Needs Audit**: **Carlos Ruiz** / **Rahul Sharma** (Suspicious activity alerts detected).`;
  }

  // Querying individual employee e.g., "Rahul"
  for (const emp of employees) {
    if (lowerQuery.includes(emp.name.toLowerCase().split(' ')[0])) {
      const tracking = activeTracking[emp.id];
      const empVisits = visits.filter(v => v.employeeId === emp.id);
      const empTasks = tasks.filter(t => t.employeeId === emp.id);
      
      const statusStr = tracking ? `Online (${tracking.status})` : 'Offline';
      const batteryStr = tracking ? `${tracking.batteryLevel}%` : 'N/A';
      const speedStr = tracking ? `${tracking.speed} km/h` : 'N/A';

      return `👤 **AI Performance Audit for ${emp.name}:**\n` +
        `• **Current Status**: ${statusStr} (Speed: ${speedStr}, Battery: ${batteryStr})\n` +
        `• **Today's Visits**: ${empVisits.length} check-ins completed.\n` +
        `• **Task Status**: ${empTasks.filter(t => t.status === 'Completed').length} / ${empTasks.length} tasks completed.\n` +
        `• **Route Inefficiencies**: ${emp.id === 'emp-1' ? 'Overlap in SOMA zone detected. Spend at client exceeded schedule by 15m.' : 'None detected. Excellent compliance.'}`;
    }
  }

  // Default response
  return `Hi! I am your AI Field Tracking Assistant. I can help you analyze employee routes, track compliance, optimize travel paths, and discover operational anomalies.\n\n` +
    `**Try asking me:**\n` +
    `• *"Who is online right now?"*\n` +
    `• *"Are there any active alerts?"*\n` +
    `• *"Show me the performance summary"* \n` +
    `• *"How can we optimize routes?"*\n` +
    `• *"Give me an audit for Rahul"*`;
}
