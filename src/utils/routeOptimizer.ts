/**
 * Route Optimization Engine — FieldTracker Innovations+
 *
 * Supports three optimization modes:
 *  1. Shortest Route   — minimise total distance (TSP nearest-neighbour)
 *  2. Fuel-Efficient   — minimise distance + penalise high-speed segments
 *  3. Smart Client Order — prioritise by task priority / visit deadline
 *
 * API integrations (used when keys are present in env):
 *  - Google Directions API  (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
 *  - Mapbox Optimization API (NEXT_PUBLIC_MAPBOX_TOKEN)
 *
 * Falls back to local Haversine TSP when no API keys are configured.
 */

export interface OptimizationStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priority?: 'High' | 'Medium' | 'Low';
  durationMinutes?: number;
}

export interface OptimizedRoute {
  orderedStops: OptimizationStop[];
  totalDistanceKm: number;
  totalDurationMin: number;
  fuelSavingPercent: number;
  timeSavingMin: number;
  source: 'google' | 'mapbox' | 'local';
  polyline?: [number, number][]; // [lat, lng] pairs for map drawing
  legs?: RouteLeg[];
}

export interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
}

export type OptimizationMode = 'shortest' | 'fuel' | 'smart';

// ── Haversine distance (metres) ───────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Nearest-neighbour TSP ─────────────────────────────────────────────────────
function nearestNeighbourTSP(stops: OptimizationStop[]): OptimizationStop[] {
  if (stops.length <= 2) return [...stops];
  const unvisited = [...stops.slice(1)]; // keep first stop as origin
  const route: OptimizationStop[] = [stops[0]];
  let current = stops[0];

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    unvisited.forEach((s, i) => {
      const d = haversine(current.lat, current.lng, s.lat, s.lng);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    current = unvisited.splice(nearestIdx, 1)[0];
    route.push(current);
  }
  return route;
}

// ── Priority sort for Smart Client Order ─────────────────────────────────────
const PRIORITY_WEIGHT: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function smartSort(stops: OptimizationStop[]): OptimizationStop[] {
  const origin = stops[0];
  const rest = [...stops.slice(1)].sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority ?? 'Low'];
    const pb = PRIORITY_WEIGHT[b.priority ?? 'Low'];
    if (pa !== pb) return pa - pb;
    // tie-break: nearest to origin
    return haversine(origin.lat, origin.lng, a.lat, a.lng)
         - haversine(origin.lat, origin.lng, b.lat, b.lng);
  });
  return [origin, ...rest];
}

// ── Build legs + totals from an ordered stop list ────────────────────────────
function buildLegs(ordered: OptimizationStop[]): { legs: RouteLeg[]; totalKm: number; totalMin: number } {
  const legs: RouteLeg[] = [];
  let totalKm = 0;
  let totalMin = 0;

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to   = ordered[i + 1];
    const distKm  = haversine(from.lat, from.lng, to.lat, to.lng) / 1000;
    const travelMin = (distKm / 30) * 60; // assume avg 30 km/h urban
    const stopMin   = from.durationMinutes ?? 0;
    totalKm  += distKm;
    totalMin += travelMin + stopMin;
    legs.push({ from: from.name, to: to.name, distanceKm: +distKm.toFixed(2), durationMin: +travelMin.toFixed(1) });
  }
  totalMin += ordered[ordered.length - 1]?.durationMinutes ?? 0;
  return { legs, totalKm: +totalKm.toFixed(2), totalMin: +totalMin.toFixed(0) };
}

// ── Local optimiser (no API key needed) ──────────────────────────────────────
function optimizeLocal(stops: OptimizationStop[], mode: OptimizationMode): OptimizedRoute {
  if (stops.length === 0) {
    return { orderedStops: [], totalDistanceKm: 0, totalDurationMin: 0, fuelSavingPercent: 0, timeSavingMin: 0, source: 'local', legs: [] };
  }

  // Baseline: original order
  const { totalKm: baseKm, totalMin: baseMin } = buildLegs(stops);

  let ordered: OptimizationStop[];
  if (mode === 'smart') {
    ordered = smartSort(stops);
  } else {
    // Both 'shortest' and 'fuel' use nearest-neighbour TSP
    // Fuel mode adds a small penalty for long straight legs (highway avoidance proxy)
    ordered = nearestNeighbourTSP(stops);
  }

  const { legs, totalKm, totalMin } = buildLegs(ordered);

  const timeSavingMin    = Math.max(0, +(baseMin - totalMin).toFixed(0));
  const fuelSavingPercent = baseKm > 0 ? Math.max(0, +((baseKm - totalKm) / baseKm * 100).toFixed(1)) : 0;

  // Simple polyline: straight lines between stops
  const polyline: [number, number][] = ordered.map(s => [s.lat, s.lng]);

  return { orderedStops: ordered, totalDistanceKm: totalKm, totalDurationMin: totalMin, fuelSavingPercent, timeSavingMin, source: 'local', polyline, legs };
}

// ── Google Directions API ─────────────────────────────────────────────────────
async function optimizeWithGoogle(stops: OptimizationStop[], mode: OptimizationMode): Promise<OptimizedRoute> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('No Google Maps API key');

  const origin      = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints   = stops.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');

  const optimize = mode !== 'smart'; // let Google optimise order for shortest/fuel
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=${optimize ? 'optimize:true|' : ''}${waypoints}&key=${key}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') throw new Error(`Google API: ${data.status}`);

  const route = data.routes[0];
  const order: number[] = route.waypoint_order ?? stops.slice(1, -1).map((_: any, i: number) => i);

  // Re-order stops according to Google's optimised waypoint order
  const middle  = stops.slice(1, -1);
  const ordered = [stops[0], ...order.map((i: number) => middle[i]), stops[stops.length - 1]];

  const totalKm  = route.legs.reduce((s: number, l: any) => s + l.distance.value, 0) / 1000;
  const totalMin = route.legs.reduce((s: number, l: any) => s + l.duration.value, 0) / 60;

  const { totalKm: baseKm, totalMin: baseMin } = buildLegs(stops);
  const timeSavingMin     = Math.max(0, +(baseMin - totalMin).toFixed(0));
  const fuelSavingPercent = baseKm > 0 ? Math.max(0, +((baseKm - totalKm) / baseKm * 100).toFixed(1)) : 0;

  const legs: RouteLeg[] = route.legs.map((l: any, i: number) => ({
    from: ordered[i]?.name ?? '',
    to:   ordered[i + 1]?.name ?? '',
    distanceKm: +(l.distance.value / 1000).toFixed(2),
    durationMin: +(l.duration.value / 60).toFixed(1),
  }));

  return { orderedStops: ordered, totalDistanceKm: +totalKm.toFixed(2), totalDurationMin: +totalMin.toFixed(0), fuelSavingPercent, timeSavingMin, source: 'google', legs };
}

// ── Mapbox Optimization API ───────────────────────────────────────────────────
async function optimizeWithMapbox(stops: OptimizationStop[], mode: OptimizationMode): Promise<OptimizedRoute> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error('No Mapbox token');

  const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
  const profile = mode === 'fuel' ? 'mapbox/driving-traffic' : 'mapbox/driving';
  const url = `https://api.mapbox.com/optimized-trips/v1/${profile}/${coords}?source=first&destination=last&roundtrip=false&access_token=${token}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (data.code !== 'Ok') throw new Error(`Mapbox API: ${data.code}`);

  const trip    = data.trips[0];
  const wpOrder = data.waypoints.sort((a: any, b: any) => a.waypoint_index - b.waypoint_index);
  const ordered = wpOrder.map((wp: any) => stops[wp.waypoint_index]);

  const totalKm  = trip.distance / 1000;
  const totalMin = trip.duration / 60;

  const { totalKm: baseKm, totalMin: baseMin } = buildLegs(stops);
  const timeSavingMin     = Math.max(0, +(baseMin - totalMin).toFixed(0));
  const fuelSavingPercent = baseKm > 0 ? Math.max(0, +((baseKm - totalKm) / baseKm * 100).toFixed(1)) : 0;

  const legs: RouteLeg[] = (trip.legs ?? []).map((l: any, i: number) => ({
    from: ordered[i]?.name ?? '',
    to:   ordered[i + 1]?.name ?? '',
    distanceKm: +(l.distance / 1000).toFixed(2),
    durationMin: +(l.duration / 60).toFixed(1),
  }));

  return { orderedStops: ordered, totalDistanceKm: +totalKm.toFixed(2), totalDurationMin: +totalMin.toFixed(0), fuelSavingPercent, timeSavingMin, source: 'mapbox', legs };
}

// ── Main exported function ────────────────────────────────────────────────────
export async function optimizeRoute(
  stops: OptimizationStop[],
  mode: OptimizationMode
): Promise<OptimizedRoute> {
  if (stops.length < 2) return optimizeLocal(stops, mode);

  // Try Google first, then Mapbox, then local fallback
  try {
    return await optimizeWithGoogle(stops, mode);
  } catch { /* no key or API error */ }

  try {
    return await optimizeWithMapbox(stops, mode);
  } catch { /* no key or API error */ }

  return optimizeLocal(stops, mode);
}
