'use client';

import React, { useState, useCallback } from 'react';
import { useAppState } from '../context/AppState';
import {
  optimizeRoute,
  type OptimizationStop,
  type OptimizedRoute,
  type OptimizationMode,
} from '../utils/routeOptimizer';
import {
  Route, Fuel, Zap, ListOrdered, Play, Loader2,
  CheckCircle2, MapPin, Clock, TrendingDown, Navigation,
  ChevronRight, AlertCircle, Info,
} from 'lucide-react';

const MODE_CONFIG: Record<OptimizationMode, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  shortest: {
    label: 'Shortest Route',
    desc:  'Minimise total distance using nearest-neighbour TSP',
    icon:  Route,
    color: 'indigo',
  },
  fuel: {
    label: 'Fuel-Efficient',
    desc:  'Reduce fuel cost by avoiding long detours & high-speed legs',
    icon:  Fuel,
    color: 'emerald',
  },
  smart: {
    label: 'Smart Client Order',
    desc:  'Prioritise High → Medium → Low priority stops first',
    icon:  ListOrdered,
    color: 'amber',
  },
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  google:  { label: 'Google Directions API', color: '#4285F4' },
  mapbox:  { label: 'Mapbox Optimization API', color: '#00b4d8' },
  local:   { label: 'Local AI (Haversine TSP)', color: '#8b5cf6' },
};

export const RouteOptimizer: React.FC = () => {
  const { employees, activeTracking, geofences, tasks, currentUser } = useAppState();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [mode, setMode]                   = useState<OptimizationMode>('shortest');
  const [result, setResult]               = useState<OptimizedRoute | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const tenantEmployees = employees.filter(
    e => e && currentUser && e.organizationId === currentUser.organizationId
  );

  // Build stops from employee's geofences + tasks
  const buildStops = useCallback((empId: string): OptimizationStop[] => {
    const emp = tenantEmployees.find(e => e.id === empId);
    if (!emp) return [];

    const tracking = activeTracking[empId];
    const origin: OptimizationStop = {
      id:   'origin',
      name: 'Current Position',
      lat:  tracking?.latitude  ?? emp.points[0]?.lat ?? 37.7749,
      lng:  tracking?.longitude ?? emp.points[0]?.lng ?? -122.4194,
    };

    // Employee's geofences as stops
    const gfStops: OptimizationStop[] = geofences
      .filter(gf => gf.employeeId === empId || !gf.employeeId)
      .filter(gf => gf.type === 'client')
      .map(gf => ({
        id:   gf.id,
        name: gf.name,
        lat:  gf.lat,
        lng:  gf.lng,
      }));

    // Merge task priorities into stops
    const empTasks = tasks.filter(t => t.employeeId === empId && t.status === 'Pending');
    const stopsWithPriority = gfStops.map(stop => {
      const matchedTask = empTasks.find(t =>
        t.title.toLowerCase().includes(stop.name.toLowerCase().split(' ')[0].toLowerCase())
      );
      return { ...stop, priority: matchedTask?.priority ?? ('Low' as const) };
    });

    // Fall back to mock route points if no geofences
    if (stopsWithPriority.length === 0) {
      const pts = emp.points.filter(p => p.isStop).map((p, i) => ({
        id:       `pt-${i}`,
        name:     p.stopName ?? p.name,
        lat:      p.lat,
        lng:      p.lng,
        durationMinutes: p.durationMinutes,
        priority: ('Medium' as const),
      }));
      return pts.length > 0 ? pts : [origin];
    }

    return [origin, ...stopsWithPriority];
  }, [tenantEmployees, activeTracking, geofences, tasks]);

  const handleOptimize = async () => {
    if (!selectedEmpId) { setError('Please select an employee first.'); return; }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const stops = buildStops(selectedEmpId);
      if (stops.length < 2) { setError('Not enough stops to optimise. Add geofences or tasks for this employee.'); setLoading(false); return; }
      const res = await optimizeRoute(stops, mode);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? 'Optimisation failed.');
    } finally {
      setLoading(false);
    }
  };

  const modeColor = MODE_CONFIG[mode].color;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
          <Navigation size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-black text-stone-100">AI Route Optimization</h3>
          <p className="text-[10.5px] text-stone-500 mt-0.5">
            Suggest shortest, fuel-efficient, or priority-ordered routes for field operatives.
          </p>
        </div>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Employee picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Select Operative</label>
          <select
            value={selectedEmpId}
            onChange={e => { setSelectedEmpId(e.target.value); setResult(null); }}
            className="w-full bg-stone-900 border border-white/10 text-stone-200 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">— Choose employee —</option>
            {tenantEmployees.map(e => (
              <option key={e.id} value={e.id} className="bg-stone-900">
                {e.name} · {e.role.split(' ')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* API source info */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Optimization Engine</label>
          <div className="bg-stone-900 border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Info size={13} className="text-stone-500 flex-shrink-0" />
            <p className="text-[10.5px] text-stone-400 leading-relaxed">
              Uses <span className="text-yellow-400 font-bold">Google Directions</span> or{' '}
              <span className="text-cyan-400 font-bold">Mapbox</span> when API keys are set in{' '}
              <code className="text-amber-300 bg-stone-800 px-1 rounded">.env.local</code>.
              Falls back to local Haversine TSP.
            </p>
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Optimization Mode</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.entries(MODE_CONFIG) as [OptimizationMode, typeof MODE_CONFIG[OptimizationMode]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = mode === key;
            return (
              <button
                key={key}
                onClick={() => { setMode(key); setResult(null); }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? `bg-${cfg.color}-500/10 border-${cfg.color}-500/40 shadow-lg`
                    : 'bg-stone-900/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${active ? `bg-${cfg.color}-500/20 text-${cfg.color}-400` : 'bg-stone-800 text-stone-500'}`}>
                  <Icon size={14} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${active ? `text-${cfg.color}-300` : 'text-stone-300'}`}>{cfg.label}</p>
                  <p className="text-[9.5px] text-stone-500 mt-0.5 leading-relaxed">{cfg.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleOptimize}
        disabled={loading || !selectedEmpId}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Optimising Route…</>
          : <><Play size={13} /> Run {MODE_CONFIG[mode].label}</>
        }
      </button>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-400">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Distance', value: `${result.totalDistanceKm} km`, icon: Route,       color: 'indigo' },
              { label: 'Est. Duration',  value: `${result.totalDurationMin} min`, icon: Clock,      color: 'blue'   },
              { label: 'Fuel Saving',    value: `${result.fuelSavingPercent}%`,   icon: Fuel,       color: 'emerald'},
              { label: 'Time Saving',    value: `${result.timeSavingMin} min`,    icon: TrendingDown,color: 'amber'  },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`bg-${card.color}-500/5 border border-${card.color}-500/20 rounded-xl p-3 text-center`}>
                  <Icon size={16} className={`text-${card.color}-400 mx-auto mb-1.5`} />
                  <p className={`text-base font-black text-${card.color}-300`}>{card.value}</p>
                  <p className="text-[9px] text-stone-500 uppercase font-bold tracking-wider mt-0.5">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Source badge */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-wider">Powered by</span>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
              style={{ color: SOURCE_BADGE[result.source].color, borderColor: SOURCE_BADGE[result.source].color + '40', background: SOURCE_BADGE[result.source].color + '15' }}
            >
              {SOURCE_BADGE[result.source].label}
            </span>
          </div>

          {/* Optimised stop order */}
          <div className="space-y-2">
            <h4 className="text-[10px] text-stone-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <ListOrdered size={12} /> Optimised Stop Sequence
            </h4>
            <div className="space-y-1.5">
              {result.orderedStops.map((stop, idx) => {
                const leg = result.legs?.[idx];
                const priorityColor = stop.priority === 'High' ? 'rose' : stop.priority === 'Medium' ? 'amber' : 'slate';
                return (
                  <div key={stop.id} className="flex items-start gap-3">
                    {/* Step number */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
                        idx === 0 ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-900 border-white/10 text-stone-400'
                      }`}>
                        {idx === 0 ? '▶' : idx}
                      </div>
                      {idx < result.orderedStops.length - 1 && (
                        <div className="w-px h-6 bg-white/10 mt-1" />
                      )}
                    </div>

                    {/* Stop info */}
                    <div className="flex-grow bg-stone-900/50 border border-white/5 rounded-xl p-2.5 mb-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={11} className="text-amber-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-stone-200 truncate">{stop.name}</span>
                        </div>
                        {stop.priority && stop.priority !== 'Low' && (
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 bg-${priorityColor}-500/10 text-${priorityColor}-400 border border-${priorityColor}-500/20`}>
                            {stop.priority}
                          </span>
                        )}
                      </div>
                      {leg && (
                        <p className="text-[9.5px] text-stone-500 mt-1 flex items-center gap-2">
                          <ChevronRight size={9} />
                          <span>Next: <strong className="text-stone-400">{leg.distanceKm} km</strong></span>
                          <span>·</span>
                          <span>~<strong className="text-stone-400">{leg.durationMin} min</strong> drive</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings callout */}
          {(result.fuelSavingPercent > 0 || result.timeSavingMin > 0) && (
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-300 leading-relaxed">
                <strong>Optimisation complete.</strong> This route saves{' '}
                {result.timeSavingMin > 0 && <><strong>{result.timeSavingMin} minutes</strong> of travel time</>}
                {result.timeSavingMin > 0 && result.fuelSavingPercent > 0 && ' and '}
                {result.fuelSavingPercent > 0 && <><strong>{result.fuelSavingPercent}% fuel cost</strong></>}
                {' '}compared to the original stop order.
              </div>
            </div>
          )}

          {/* API key setup hint */}
          {result.source === 'local' && (
            <div className="bg-stone-900/60 border border-white/5 rounded-xl p-3 flex items-start gap-2 text-[10.5px] text-stone-500">
              <Zap size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Add <code className="text-amber-300 bg-stone-800 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> or{' '}
                <code className="text-cyan-300 bg-stone-800 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{' '}
                <code className="text-stone-300 bg-stone-800 px-1 rounded">.env.local</code> for real-time traffic-aware routing.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
