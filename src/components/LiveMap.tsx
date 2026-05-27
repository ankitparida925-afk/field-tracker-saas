'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppState';
import { Layers, Navigation, ZoomIn, ShieldAlert, Users, Zap, Radio, Flame, ClipboardList, MapPin, Building, Settings } from 'lucide-react';

/* ─── SVG marker builders ─────────────────────────────────────────────────── */
function empPinHtml(color: string, statusColor: string, initials: string, fresh: boolean) {
  const s = initials.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const pulse = fresh
    ? `<div style="position:absolute;top:-6px;left:-6px;right:-6px;bottom:-6px;border-radius:50%;border:2px solid ${color};opacity:0.5;animation:lm-pulse 1.5s ease-out infinite"></div>`
    : '';
  return `<div style="position:relative;width:52px;height:62px">
    ${pulse}
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="62" viewBox="0 0 52 62" style="filter:drop-shadow(0 4px 10px ${color}55)">
      <circle cx="26" cy="26" r="23" fill="#1e293b" stroke="${color}" stroke-width="2.5"/>
      <circle cx="26" cy="26" r="17" fill="${color}25"/>
      <text x="26" y="31" font-family="system-ui,sans-serif" font-size="13" font-weight="800" fill="${color}" text-anchor="middle">${s}</text>
      <circle cx="42" cy="11" r="6" fill="${statusColor}" stroke="#120c08" stroke-width="2"/>
      <polygon points="26,52 19,38 33,38" fill="${color}"/>
      <rect x="3" y="47" width="46" height="12" rx="5" fill="rgba(9,13,22,0.95)"/>
      <text x="26" y="56.5" font-family="system-ui,sans-serif" font-size="7" font-weight="700" fill="#f1f5f9" text-anchor="middle">${initials.substring(0,10)}</text>
    </svg>
  </div>`;
}

function meSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="rgba(59,130,246,0.18)" stroke="#3b82f6" stroke-width="2.2"/>
    <circle cx="18" cy="18" r="8" fill="#3b82f6" stroke="white" stroke-width="2.5"/>
  </svg>`;
}

const LiveMap: React.FC = () => {
  const {
    employees: allEmployees, activeTracking, historyPaths, geofences: allGeofences, visits: allVisits,
    selectedEmployeeId, setSelectedEmployeeId, addGeofence,
    tasks: allTasks, setDraftTaskLocation, draftTaskLocation,
    currentUser, theme
  } = useAppState();

  // Tenant-scoped isolation for map markers
  const isSuper = currentUser?.role === 'superadmin';
  const orgId = currentUser?.organizationId;

  const currentUserEmployeeProfile = allEmployees.find(e => e.id === currentUser?.employeeId);
  const isCurrentUserManager = currentUser?.role === 'employee' && currentUserEmployeeProfile?.isManager === true;

  const employees = allEmployees.filter(e => {
    if (!e) return false;
    if (isSuper) return true;
    if (!orgId || e.organizationId !== orgId) return false;
    if (isCurrentUserManager) {
      return e.assignedManagerId === currentUser?.employeeId;
    }
    return true;
  });

  const tenantEmployeeIds = employees.map(e => e.id);
  const geofences = allGeofences.filter(g => isSuper || !g.employeeId || tenantEmployeeIds.includes(g.employeeId));
  const tasks = allTasks.filter(t => isSuper || tenantEmployeeIds.includes(t.employeeId));
  const visits = allVisits.filter(v => isSuper || tenantEmployeeIds.includes(v.employeeId));

  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const LRef          = useRef<any>(null);
  const markersRef    = useRef<Record<string, any>>({});
  const routesRef     = useRef<Record<string, any>>({});
  const gfLayersRef   = useRef<Record<string, any>>({});
  const meMarkerRef   = useRef<any>(null);
  const draftMarkerRef = useRef<any>(null);
  const watchRef      = useRef<number | null>(null);
  const hasFitRef     = useRef(false);
  const gfTypeRef     = useRef<'client'|'territory'|'restricted'>('client');
  const gfRadiusRef   = useRef(100);
  const drawModeRef   = useRef(false);
  const pingTimesRef  = useRef<Record<string, Date>>({});
  const heatLayerRef  = useRef<any>(null);

  const [ready,    setReady]    = useState(false);
  const [layer,    setLayer]    = useState<'light'|'dark'|'sat'>('dark');
  const [locating, setLocating] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [taskDropMode, setTaskDropMode] = useState(false);
  const taskDropModeRef = useRef(false);
  const [gfType,   setGfType]   = useState<'client'|'territory'|'restricted'>('client');
  const [gfRadius, setGfRadius] = useState(100);
  const [mapMode,  setMapMode]  = useState<'live'|'heatmap'>('live');
  const [, setTick]             = useState(0); // force 1s re-render for timers

  // Map Search States & Handlers
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [searchError, setSearchError] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchedMarkerRef = useRef<any>(null);

  // Commercial keys configuration (Google / Mapbox) for hyper-local search like Swiggy/Zomato
  const [mapboxToken, setMapboxToken] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMapboxToken(localStorage.getItem('fti_mapbox_token') || '');
      setGoogleKey(localStorage.getItem('fti_google_key') || '');
    }
  }, []);

  const saveSettingsKeys = (mb: string, gg: string) => {
    setMapboxToken(mb);
    setGoogleKey(gg);
    localStorage.setItem('fti_mapbox_token', mb);
    localStorage.setItem('fti_google_key', gg);
    setShowSettingsModal(false);
  };

  // Debounced search suggestions fetch
  useEffect(() => {
    if (!mapSearchQuery.trim() || mapSearchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(mapSearchQuery.trim())}`, {
          headers: {
            'x-mapbox-token': mapboxToken,
            'x-google-key': googleKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
          setShowSuggestions(true);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.warn('Suggestions fetch failed', err);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [mapSearchQuery, mapboxToken, googleKey]);

  const selectSuggestion = (item: any) => {
    if (!mapRef.current) return;
    const latitude = parseFloat(item.lat);
    const longitude = parseFloat(item.lon);

    setMapSearchQuery(item.display_name);
    setShowSuggestions(false);
    setSuggestions([]);

    mapRef.current.setView([latitude, longitude], 16, { animate: true });

    // Place elegant Bouncing Search Pin!
    const L = LRef.current;
    if (L) {
      if (searchedMarkerRef.current) {
        mapRef.current.removeLayer(searchedMarkerRef.current);
      }

      // Swiggy/Zomato style premium red/amber pin
      const iconHtml = `<div class="animate-bounce" style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
        <div style="position:absolute;top:10px;left:10px;right:10px;bottom:10px;border-radius:50%;background:#ef4444;opacity:0.3;animation:lm-pulse 1.2s ease-out infinite"></div>
        <div style="background:#dc2626;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(220,38,38,0.5);border:3px solid #fff;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>`;
      
      const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [44, 44], iconAnchor: [22, 44] });

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '190px';
      popupContent.style.padding = '6px 2px';
      popupContent.innerHTML = `
        <div style="font-weight:800;font-size:12.5px;color:#ef4444;margin-bottom:4px;line-height:1.3">📍 Pinned Location</div>
        <div style="color:${theme === 'light' ? '#334155' : '#cbd5e1'};font-size:10.5px;line-height:1.4;margin-bottom:10px;">${item.display_name}</div>
        <div style="display:flex;gap:6px;">
          <button id="search-pin-create-task" style="flex:1;background:#d97706;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:10px;font-weight:750;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.2s;">
            📋 Create Task Here
          </button>
        </div>
      `;

      const marker = L.marker([latitude, longitude], { icon })
        .bindPopup(popupContent, { maxWidth: 240 })
        .addTo(mapRef.current);

      marker.on('popupopen', () => {
        const createTaskBtn = document.getElementById('search-pin-create-task');
        if (createTaskBtn) {
          createTaskBtn.addEventListener('click', () => {
            setDraftTaskLocation({ lat: latitude, lng: longitude });
            marker.closePopup();
            alert('Location snapped! Please fill out the Task Assignment form in the sidebar.');
          });
        }
      });

      searchedMarkerRef.current = marker;
      marker.openPopup();
    }

    // Auto snap if in Task Drop Mode
    if (taskDropModeRef.current) {
      setDraftTaskLocation({ lat: latitude, lng: longitude });
    }
  };

  const handleSearchLocation = async () => {
    if (!mapSearchQuery.trim() || !mapRef.current) return;
    setSearchLoading(true);
    setSearchError(false);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(mapSearchQuery.trim())}`, {
        headers: {
          'x-mapbox-token': mapboxToken,
          'x-google-key': googleKey
        }
      });
      if (!res.ok) {
        setSearchError(true);
        return;
      }
      const data = await res.json();
      if (data && data.length > 0) {
        selectSuggestion(data[0]);
        setSearchError(false);
      } else {
        setSearchError(true);
      }
    } catch (err) {
      console.error('Location search failed:', err);
      setSearchError(true);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => { gfTypeRef.current   = gfType;   }, [gfType]);
  useEffect(() => { gfRadiusRef.current = gfRadius; }, [gfRadius]);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { taskDropModeRef.current = taskDropMode; }, [taskDropMode]);

  // Tick every second for live "X seconds ago" timers
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── 1. Bootstrap Leaflet ─────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const style = document.createElement('style');
      style.id = cssId;
      style.textContent = `
        .leaflet-container{background:#140d0a;outline:0;font-family:system-ui,sans-serif}
        .leaflet-tile-pane{opacity:1}
        .leaflet-tile{will-change:transform}
        .leaflet-zoom-animated{transition:transform .25s cubic-bezier(0,0,0.25,1)}
        .leaflet-control-zoom{display:none!important}
        .leaflet-control-attribution{display:none!important}
        .leaflet-popup-content-wrapper{background:rgba(9,13,22,0.97);border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:#f1f5f9;box-shadow:0 8px 32px rgba(0,0,0,0.7)}
        .leaflet-popup-tip{background:rgba(9,13,22,0.97)}
        .leaflet-popup-close-button{color:#94a3b8!important}
        .leaflet-marker-icon{border:none!important;background:transparent!important;transition:transform 1.2s cubic-bezier(0.25, 1, 0.5, 1) !important;}
        .leaflet-marker-shadow{display:none!important}
      `;
      document.head.appendChild(style);
    }

    const init = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      (window as any).L = L;
      await import('leaflet.heat');
      LRef.current = L;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '' });

      const map = L.map(containerRef.current!, {
        center:            [37.7749, -122.4194],
        zoom:              13,
        zoomControl:       false,
        attributionControl: false,
      });

      // Dynamically center map on the Admin's live browser location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 13);
          },
          (err) => console.log('Dynamic map centering geolocation denied/failed:', err.message),
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
      }

      const dark = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 20, keepBuffer: 4, updateWhenIdle: false }
      ).addTo(map);

      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, keepBuffer: 4, updateWhenIdle: false }
      );

      const light = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 20, keepBuffer: 4, updateWhenIdle: false }
      );

      (map as any)._darkLayer = dark;
      (map as any)._satLayer  = sat;
      (map as any)._lightLayer = light;

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
      new ResizeObserver(() => map.invalidateSize()).observe(containerRef.current!);
      setReady(true);
    };

    init().catch(e => console.error('Leaflet init failed:', e));

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (searchedMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(searchedMarkerRef.current);
      }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  /* ── 2. Layer toggle ─────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L || !ready) return;
    const dark = (map as any)._darkLayer;
    const sat  = (map as any)._satLayer;
    const light = (map as any)._lightLayer;

    if (map.hasLayer(dark)) map.removeLayer(dark);
    if (map.hasLayer(sat))  map.removeLayer(sat);
    if (light && map.hasLayer(light)) map.removeLayer(light);

    if (layer === 'dark') {
      dark.addTo(map);
    } else if (layer === 'sat') {
      sat.addTo(map);
    } else if (layer === 'light' && light) {
      light.addTo(map);
    }
  }, [layer, ready]);

  // Sync map layer when global theme changes
  useEffect(() => {
    if (theme === 'light') {
      setLayer('light');
    } else {
      setLayer('dark');
    }
  }, [theme]);

  /* ── 3. Fit all active agents ────────────────────────────────────────── */
  const fitAll = () => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L) return;
    const pts = employees
      .map(e => activeTracking[e.id])
      .filter(t => t && t.status !== 'offline')
      .map(t => [t!.latitude, t!.longitude] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView(pts[0], 15, { animate: true }); }
    else { map.fitBounds(L.latLngBounds(pts).pad(0.3), { animate: true, maxZoom: 15 }); }
  };

  /* ── 4. Auto-fit on first tracking data ──────────────────────────────── */
  useEffect(() => {
    if (!ready || hasFitRef.current) return;
    const active = employees.filter(e => activeTracking[e.id] && activeTracking[e.id].status !== 'offline');
    if (active.length === 0) return;
    hasFitRef.current = true;
    fitAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeTracking, employees]);

  /* ── 5. Employee markers + route trails ──────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L || !ready) return;

    employees.forEach(emp => {
      const t = activeTracking[emp.id];

      if (!t || t.status === 'offline') {
        if (markersRef.current[emp.id]) { map.removeLayer(markersRef.current[emp.id]); delete markersRef.current[emp.id]; delete pingTimesRef.current[emp.id]; }
        if (routesRef.current[emp.id])  { map.removeLayer(routesRef.current[emp.id]);  delete routesRef.current[emp.id]; }
        return;
      }

      // Track ping freshness for pulsing ring
      const newPingTime = new Date(t.timestamp);
      const prev = pingTimesRef.current[emp.id];
      if (!prev || newPingTime > prev) pingTimesRef.current[emp.id] = newPingTime;
      const secondsSincePing = (Date.now() - (pingTimesRef.current[emp.id]?.getTime() ?? Date.now())) / 1000;
      const fresh = secondsSincePing < 8;

      const statusColor = t.speed > 0 ? '#10b981' : '#f59e0b';
      const initials    = emp.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
      const icon = L.divIcon({
        html:        empPinHtml(emp.color, statusColor, initials, fresh),
        iconSize:    [52, 62],
        iconAnchor:  [26, 62],
        popupAnchor: [0, -64],
        className:   '',
      });

      const secsAgo = Math.round(secondsSincePing);
      const popup = `
        <div style="min-width:170px;font-size:12px;padding:4px 2px">
          <div style="font-weight:800;font-size:14px;color:${emp.color};margin-bottom:2px">${emp.name.replace(/</g,'&lt;')}</div>
          <div style="color:#94a3b8;margin-bottom:8px;font-size:11px">${emp.role.replace(/</g,'&lt;')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
            <div><span style="color:#64748b">Battery</span><br/><b>${t.batteryLevel}%</b></div>
            <div><span style="color:#64748b">Speed</span><br/><b>${t.speed} km/h</b></div>
          </div>
          <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:10px;color:${statusColor};font-weight:700;text-transform:uppercase">${t.status}</span>
            <span style="font-size:9.5px;color:${secsAgo<=7?'#10b981':'#94a3b8'}">&#9679; ${secsAgo}s ago</span>
          </div>
          <div style="margin-top:4px;font-family:monospace;font-size:9.5px;color:#64748b">${t.latitude.toFixed(6)}, ${t.longitude.toFixed(6)}</div>
        </div>`;

      if (!markersRef.current[emp.id]) {
        const m = L.marker([t.latitude, t.longitude], { icon })
          .bindPopup(popup, { maxWidth: 230 })
          .addTo(map)
          .on('click', () => setSelectedEmployeeId(emp.id));
        markersRef.current[emp.id] = m;
      } else {
        markersRef.current[emp.id].setLatLng([t.latitude, t.longitude]);
        markersRef.current[emp.id].setIcon(icon);
        markersRef.current[emp.id].setPopupContent(popup);
      }

      // Swiggy/Zomato style thin, solid movement trails
      const pts = (historyPaths[emp.id] || []).map((p: any) => [p.latitude, p.longitude] as [number, number]);
      if (pts.length > 1) {
        if (!routesRef.current[emp.id]) {
          routesRef.current[emp.id] = L.polyline(pts, {
            color: emp.color,
            weight: 2.2,
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
        } else {
          routesRef.current[emp.id].setLatLngs(pts);
        }
      }
    });

    // Pan to selected employee (disabled in taskDropMode, drawMode, or when a draftTaskLocation is set, to prevent camera snaps away from user)
    if (selectedEmployeeId && !taskDropMode && !drawMode && !draftTaskLocation) {
      const t = activeTracking[selectedEmployeeId];
      if (t && t.status !== 'offline' && mapRef.current) {
        mapRef.current.panTo([t.latitude, t.longitude], {
          animate: true,
          duration: 1.2,
          easeLinearity: 0.15
        });
      }
    }
  }, [activeTracking, historyPaths, selectedEmployeeId, employees, ready, setSelectedEmployeeId, taskDropMode, drawMode, draftTaskLocation]);

  /* ── 6. Geofence circles ─────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L || !ready) return;

    Object.keys(gfLayersRef.current).forEach(id => {
      if (!geofences.some(g => g.id === id)) { map.removeLayer(gfLayersRef.current[id]); delete gfLayersRef.current[id]; }
    });

    geofences.forEach(gf => {
      const color = gf.type === 'client' ? '#10b981' : gf.type === 'restricted' ? '#ef4444' : '#3b82f6';
      const opts  = { color, weight: 1.8, opacity: 0.9, fillColor: color, fillOpacity: 0.1, dashArray: gf.type === 'restricted' ? '5 5' : undefined };
      if (!gfLayersRef.current[gf.id]) {
        gfLayersRef.current[gf.id] = L.circle([gf.lat, gf.lng], { radius: gf.radius, ...opts })
          .bindTooltip(gf.name, { permanent: false, direction: 'center' })
          .addTo(map);
      } else {
        gfLayersRef.current[gf.id].setStyle(opts);
        gfLayersRef.current[gf.id].setLatLng([gf.lat, gf.lng]);
        gfLayersRef.current[gf.id].setRadius(gf.radius);
      }
    });
  }, [geofences, ready]);

  /* ── 7. Geofence draw mode ───────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!drawMode && !taskDropMode) {
      map.off('click');
      map.getContainer().style.cursor = '';
      return;
    }
    map.getContainer().style.cursor = 'crosshair';
    const handler = (e: any) => {
      if (taskDropModeRef.current) {
        setDraftTaskLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        setTaskDropMode(false);
        return;
      }
      if (!drawModeRef.current) return;
      const name = window.prompt('Geofence name:', `Zone ${Math.floor(Math.random()*900)+100}`);
      if (!name) return;
      addGeofence({ name, lat: e.latlng.lat, lng: e.latlng.lng, radius: gfRadiusRef.current, type: gfTypeRef.current });
      setDrawMode(false);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); map.getContainer().style.cursor = ''; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode, taskDropMode, ready]);

  /* ── 8. Task markers ─────────────────────────────────────────────────── */
  const taskMarkersRef = useRef<Record<string, any>>({});
  useEffect(() => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L || !ready) return;

    Object.keys(taskMarkersRef.current).forEach(id => {
      const exists = tasks.find(t => t.id === id);
      if (!exists || exists.status !== 'Pending' || !exists.location) {
        map.removeLayer(taskMarkersRef.current[id]);
        delete taskMarkersRef.current[id];
      }
    });

    tasks.forEach(task => {
      if (task.status !== 'Pending' || !task.location) return;
      if (!taskMarkersRef.current[task.id]) {
        const iconHtml = `<div style="background:#ea580c;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 6px rgba(0,0,0,0.3);border:2px solid #fff;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg></div>`;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 30] });
        const marker = L.marker([task.location.lat, task.location.lng], { icon }).addTo(map);
        marker.bindPopup(`<div style="padding:4px;color:#1e293b;"><b>${task.title}</b><br/><span style="color:#64748b;font-size:11px">Assigned to: ${task.employeeName}</span></div>`);
        taskMarkersRef.current[task.id] = marker;
      } else {
        taskMarkersRef.current[task.id].setLatLng([task.location.lat, task.location.lng]);
      }
    });
  }, [tasks, ready]);

  /* ── Locate Me ───────────────────────────────────────────────────────── */
  const handleLocateMe = () => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 16, { animate: true });
        if (!meMarkerRef.current) {
          meMarkerRef.current = L.marker([latitude, longitude], {
            icon: L.divIcon({ html: meSvg(), iconSize: [36,36], iconAnchor: [18,18], className: '' }),
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          meMarkerRef.current.setLatLng([latitude, longitude]);
        }
        if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = navigator.geolocation.watchPosition(
          (p) => meMarkerRef.current?.setLatLng([p.coords.latitude, p.coords.longitude]),
          (e) => console.warn('Watch error:', e),
          { enableHighAccuracy: true }
        );
      },
      (err) => { setLocating(false); alert(`Location error: ${err.message}`); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const activeCount = employees.filter(e => activeTracking[e.id] && activeTracking[e.id].status !== 'offline').length;
  // ─── Heatmap rendering ───────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;

    // Toggle markers & routes
    Object.values(markersRef.current).forEach((m: any) => m.setOpacity(mapMode === 'heatmap' ? 0 : 1));
    Object.values(routesRef.current).forEach((r: any) => r.setStyle({ opacity: mapMode === 'heatmap' ? 0 : 0.8 }));

    if (mapMode === 'heatmap') {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      
      const points: any[] = [];
      Object.values(historyPaths).forEach(path => {
        path.forEach(p => points.push([p.latitude, p.longitude, 0.5]));
      });
      visits.forEach(v => {
        if (v.location) {
          points.push([v.location.lat, v.location.lng, 2]); // higher weight for actual visits
        }
      });

      if ((L as any).heatLayer && points.length > 0) {
        heatLayerRef.current = (L as any).heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: { 0.4: '#fbbf24', 0.6: '#f59e0b', 0.8: '#ea580c', 1.0: '#dc2626' }
        }).addTo(map);
      }
    } else {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    }
  }, [mapMode, ready, historyPaths, visits]);

  /* ── 9. Draft Task Location Marker ───────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current; const L = LRef.current;
    if (!map || !L || !ready) return;

    if (!draftTaskLocation) {
      if (draftMarkerRef.current) {
        map.removeLayer(draftMarkerRef.current);
        draftMarkerRef.current = null;
      }
      return;
    }

    const iconHtml = `<div class="animate-bounce" style="background:#ea580c;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(234,88,12,0.6);border:2.5px solid #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`;
    const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [34, 34], iconAnchor: [17, 34] });

    if (!draftMarkerRef.current) {
      draftMarkerRef.current = L.marker([draftTaskLocation.lat, draftTaskLocation.lng], { icon })
        .addTo(map)
        .bindPopup('<div style="padding:4px;color:#1e293b;font-weight:bold;font-size:11px;">📍 Draft Task Location<br/><span style="color:#64748b;font-weight:normal;font-size:9.5px;">Fill out the form in the Tasks tab to confirm</span></div>')
        .openPopup();
    } else {
      draftMarkerRef.current.setLatLng([draftTaskLocation.lat, draftTaskLocation.lng]);
    }
  }, [draftTaskLocation, ready]);

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ position:'relative', width:'100%', height:'100%', minHeight:'460px', background:'#140d0a', borderRadius:'14px', overflow:'hidden' }}>

      <div ref={containerRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:1 }} />

      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#140d0a', zIndex:40, gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:'50%', border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', animation:'lm-spin 0.8s linear infinite' }} />
          <span style={{ color:'#94a3b8', fontSize:13, fontWeight:600 }}>Loading map…</span>
        </div>
      )}

      {/* Layer switcher */}
      <div className="glass-panel" style={{ position:'absolute', top:14, left:14, zIndex:30, display:'flex', gap:3, borderRadius:12, padding:4 }}>
        {(['light','dark','sat'] as const).map(l => (
          <button key={l} onClick={() => setLayer(l)}
            style={{ padding:'4px 14px', fontSize:11, fontWeight:700, borderRadius:8, border:'none', cursor:'pointer', transition:'all 0.2s', background: layer===l ? '#d97706' : 'transparent', color: layer===l ? '#fff' : '#64748b' }}>
            {l === 'light' ? 'Light Map' : l === 'dark' ? 'Dark Map' : 'Satellite'}
          </button>
        ))}
      </div>

      {/* Map Mode switcher */}
      <div className="glass-panel" style={{ position:'absolute', top:14, left:250, zIndex:30, display:'flex', gap:3, borderRadius:12, padding:4 }}>
        {(['live','heatmap'] as const).map(m => (
          <button key={m} onClick={() => setMapMode(m)}
            style={{ padding:'4px 14px', fontSize:11, fontWeight:700, borderRadius:8, border:'none', cursor:'pointer', transition:'all 0.2s', background: mapMode===m ? '#ea580c' : 'transparent', color: mapMode===m ? '#fff' : '#64748b', display:'flex', alignItems:'center', gap:4 }}>
            {m === 'live' ? <Radio size={12}/> : <Flame size={12}/>}
            {m === 'live' ? 'Live GPS' : 'Heatmap'}
          </button>
        ))}
      </div>

      {/* Location Search Bar */}
      <div className="glass-panel" style={{ position:'absolute', top:14, left:440, zIndex:100, display:'flex', flexDirection:'column', borderRadius:14, padding:4, minWidth:200 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', width:'100%' }}>
          <input 
            type="text"
            placeholder="Search location..."
            value={mapSearchQuery}
            onChange={e => setMapSearchQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
                  selectSuggestion(suggestions[activeSuggestionIndex]);
                } else {
                  handleSearchLocation();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            style={{ background:'transparent', border:'none', color: theme === 'light' ? '#0f172a' : '#f1f5f9', fontSize:11, fontWeight:600, outline:'none', padding:'6px 8px', width:140 }}
          />
          <button
            onClick={handleSearchLocation}
            disabled={searchLoading}
            style={{ background:'#d97706', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:10, fontWeight:750, cursor:'pointer', transition:'all 0.2s' }}
          >
            {searchLoading ? '...' : 'Search'}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Search Engine Settings"
            style={{ background: 'transparent', color: '#64748b', border: 'none', borderRadius: 8, padding: '4px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
          >
            <Settings size={14} style={{ transition: 'all 0.3s' }} />
          </button>
          {searchError && (
            <span style={{ fontSize:9, color:'#ef4444', fontWeight:800, paddingRight:6 }}>Not Found</span>
          )}
        </div>

        {/* Swiggy/Zomato style Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="glass-panel" style={{
            position: 'absolute',
            top: '105%',
            left: 0,
            width: '100%',
            minWidth: '290px',
            maxHeight: '260px',
            overflowY: 'auto',
            background: theme === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(9, 13, 22, 0.98)',
            border: theme === 'light' ? '1px solid rgba(15, 23, 42, 0.12)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 100
          }}>
            {suggestions.map((item, idx) => {
              const isActive = idx === activeSuggestionIndex;
              const isLandmark = item.type === 'landmark';
              const isCity = item.type === 'city';
              return (
                <div
                  key={idx}
                  onClick={() => selectSuggestion(item)}
                  onMouseEnter={() => setActiveSuggestionIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isActive ? (theme === 'light' ? '#f1f5f9' : '#1e293b') : 'transparent',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 5,
                    borderRadius: 6,
                    background: isLandmark ? 'rgba(217, 119, 6, 0.15)' : isCity ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: isLandmark ? '#d97706' : isCity ? '#3b82f6' : '#94a3b8'
                  }}>
                    {isLandmark ? <Building size={12}/> : <MapPin size={12}/>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: theme === 'light' ? '#0f172a' : '#f1f5f9',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      width: '200px'
                    }}>
                      {item.display_name}
                    </span>
                    <span style={{ fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginTop: 1 }}>
                      {isLandmark ? 'Enterprise Client' : isCity ? 'City Bounds' : 'Geocoded Address'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HUD — bottom right */}
      <div style={{ position:'absolute', bottom:14, right:14, zIndex:30, pointerEvents:'none' }}>
        <div style={{ background:'rgba(9,13,22,0.92)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background: activeCount>0 ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', border:`1px solid ${activeCount>0?'rgba(16,185,129,0.35)':'rgba(99,102,241,0.35)'}`, padding:7, borderRadius:9, color:activeCount>0?'#34d399':'#818cf8', display:'flex' }}>
            {activeCount > 0 ? <Radio size={15} style={{ animation:'lm-spin 3s linear infinite' }}/> : <Zap size={15}/>}
          </div>
          <div>
            <div style={{ fontSize:9, textTransform:'uppercase', fontWeight:700, color:'#475569', letterSpacing:'0.07em' }}>Live GPS Tracking</div>
            <div style={{ fontSize:12, fontWeight:800, color:activeCount>0?'#10b981':'#64748b', marginTop:1 }}>
              {activeCount > 0 ? `${activeCount} agent${activeCount>1?'s':''} on duty · 5s pings` : 'No agents on duty'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ position:'absolute', bottom:14, left:14, zIndex:30, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>

        {/* Geofence draw */}
        <div style={{ background:'rgba(9,13,22,0.92)', backdropFilter:'blur(10px)', border:`1px solid ${drawMode?'rgba(251,191,36,0.4)':'rgba(255,255,255,0.1)'}`, borderRadius:12, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
          {drawMode ? (
            <>
              <span style={{ fontSize:10, color:'#fbbf24', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                <ShieldAlert size={11}/> CLICK MAP TO PLACE
              </span>
              <select value={gfType} onChange={e => setGfType(e.target.value as any)}
                style={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', fontSize:10, borderRadius:6, padding:'2px 6px', outline:'none' }}>
                <option value="client">Client</option>
                <option value="territory">Territory</option>
                <option value="restricted">Restricted</option>
              </select>
              <select value={gfRadius} onChange={e => setGfRadius(Number(e.target.value))}
                style={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', fontSize:10, borderRadius:6, padding:'2px 6px', outline:'none' }}>
                <option value="50">50m</option><option value="100">100m</option><option value="200">200m</option><option value="500">500m</option>
              </select>
              <button onClick={() => setDrawMode(false)}
                style={{ background:'#dc2626', color:'#fff', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer' }}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setDrawMode(true)}
              style={{ background:'transparent', color:'#94a3b8', fontSize:11, fontWeight:700, padding:0, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Layers size={13}/> Draw Geofence
            </button>
          )}
        </div>

        {/* Task Drop Mode */}
        <div style={{ background:'rgba(9,13,22,0.92)', backdropFilter:'blur(10px)', border:`1px solid ${taskDropMode?'rgba(234,88,12,0.4)':'rgba(255,255,255,0.1)'}`, borderRadius:12, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
          {taskDropMode ? (
            <>
              <span style={{ fontSize:10, color:'#ea580c', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                <ClipboardList size={11}/> CLICK MAP FOR TASK
              </span>
              <button onClick={() => setTaskDropMode(false)}
                style={{ background:'#dc2626', color:'#fff', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer' }}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setTaskDropMode(true)}
              style={{ background:'transparent', color:'#94a3b8', fontSize:11, fontWeight:700, padding:0, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <ClipboardList size={13}/> Drop Task Location
            </button>
          )}
        </div>

        {/* Locate me */}
        <button onClick={handleLocateMe} disabled={locating} title="Show my location"
          style={{ background:'rgba(9,13,22,0.92)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:10, color:'#34d399', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Navigation size={15} style={{ animation:locating?'lm-spin 1s linear infinite':'none' }}/>
        </button>

        {/* Recenter on selected */}
        {selectedEmployeeId && activeTracking[selectedEmployeeId] && (
          <button onClick={() => {
            const t = activeTracking[selectedEmployeeId];
            if (t && mapRef.current) mapRef.current.setView([t.latitude, t.longitude], 16, { animate:true });
          }} title="Re-center on selected employee"
            style={{ background:'rgba(9,13,22,0.92)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:10, color:'#818cf8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ZoomIn size={15}/>
          </button>
        )}

        {/* Fit all */}
        <button onClick={fitAll} title="Zoom to all active agents"
          style={{ background:'rgba(16,185,129,0.12)', backdropFilter:'blur(10px)', border:'1px solid rgba(16,185,129,0.35)', borderRadius:12, padding:'8px 14px', color:'#34d399', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700 }}>
          <Users size={13}/> Fit All Agents
        </button>
      </div>

      {/* No agents message */}
      {ready && activeCount === 0 && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:20, textAlign:'center', pointerEvents:'none' }}>
          <div style={{ background:'rgba(9,13,22,0.92)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px 28px' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📍</div>
            <p style={{ color:'#f1f5f9', fontWeight:800, fontSize:13, margin:0 }}>No agents on duty</p>
            <p style={{ color:'#64748b', fontSize:11, marginTop:4, lineHeight:1.5 }}>
              Ask employees to open the app<br/>and tap <b style={{color:'#10b981'}}>"Go On Duty"</b>
            </p>
          </div>
        </div>
      )}

      {/* Search Engine Config Gear Modal Overlay */}
      {showSettingsModal && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '380px',
            padding: '20px',
            background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.96)',
            border: theme === 'light' ? '1px solid rgba(15, 23, 42, 0.12)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>
            <div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings size={14} style={{ color: '#d97706' }} /> Map Search Engine Settings
              </h3>
              <p style={{ fontSize: '10.5px', color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>
                Configure professional commercial geocoders for hyper-local addresses and landmarks, just like Swiggy and Zomato.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: theme === 'light' ? '#475569' : '#94a3b8', textTransform: 'uppercase' }}>
                  Mapbox Access Token
                </label>
                <input
                  type="text"
                  placeholder="pk.eyJ1Ijoi..."
                  defaultValue={mapboxToken}
                  id="settings-mapbox-token"
                  style={{
                    background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: theme === 'light' ? '#0f172a' : '#f1f5f9',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: theme === 'light' ? '#475569' : '#94a3b8', textTransform: 'uppercase' }}>
                  Google Maps API Key
                </label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  defaultValue={googleKey}
                  id="settings-google-key"
                  style={{
                    background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: theme === 'light' ? '#0f172a' : '#f1f5f9',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <p style={{ fontSize: '9px', color: '#ea580c', margin: 0, fontWeight: 700 }}>
              * Leave blank to gracefully fall back to the community-driven geocoding engine (Photon).
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: 'transparent',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const mb = (document.getElementById('settings-mapbox-token') as HTMLInputElement)?.value || '';
                  const gg = (document.getElementById('settings-google-key') as HTMLInputElement)?.value || '';
                  saveSettingsKeys(mb, gg);
                }}
                style={{
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lm-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes lm-pulse { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.8);opacity:0} }
      `}</style>
    </div>
  );
};

export { LiveMap };
export default LiveMap;
