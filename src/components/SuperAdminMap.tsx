'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, Navigation, ZoomIn, Radio } from 'lucide-react';

interface SuperAdminMapProps {
  organizations: any[];
  activeTracking: Record<string, any>;
  employees: any[];
  selectedOrgFilter: string;
  historyPaths: Record<string, any>;
}

const SuperAdminMap: React.FC<SuperAdminMapProps> = ({
  organizations,
  activeTracking,
  employees,
  selectedOrgFilter,
  historyPaths
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const routesRef = useRef<Record<string, any>>({});
  const [ready, setReady] = useState(false);
  const [layer, setLayer] = useState<'light' | 'dark' | 'sat'>('light');

  // Leaflet Bootsrap
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.textContent = `
        .leaflet-container { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; }
        .leaflet-popup-content-wrapper { background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; color: #1e293b; }
        .leaflet-popup-tip { background: white; }
        .leaflet-marker-icon {
          border: none !important;
          background: transparent !important;
          transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        .super-map-pulse {
          position: absolute;
          top: -6px; left: -6px; right: -6px; bottom: -6px;
          border-radius: 50%;
          border: 2px solid var(--pulse-color, #3b82f6);
          opacity: 0.6;
          animation: map-ping 1.5s ease-out infinite;
        }
        @keyframes map-ping {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        LRef.current = L;

        const map = L.map(containerRef.current!, {
          center: [37.7749, -122.4194],
          zoom: 12,
          zoomControl: false
        });
        mapRef.current = map;

        // Dynamically center map on Super Admin's live browser location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.setView([latitude, longitude], 12);
            },
            (err) => console.log('SuperAdmin map dynamic centering failed:', err.message),
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
          );
        }

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          keepBuffer: 4,
          updateWhenIdle: false
        }).addTo(map);

        setReady(true);
      } catch (err) {
        console.error('Failed to init Leaflet Map in Super Admin:', err);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Layer Style
  useEffect(() => {
    if (!ready || !mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Clear existing layers
    map.eachLayer((l: any) => {
      if (l instanceof L.TileLayer) {
        map.removeLayer(l);
      }
    });

    let url = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    if (layer === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (layer === 'sat') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    L.tileLayer(url, { maxZoom: 19, keepBuffer: 4, updateWhenIdle: false }).addTo(map);
  }, [ready, layer]);

  // Update Markers based on Active Telemetry
  useEffect(() => {
    if (!ready || !mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Remove old markers and routes
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    Object.values(routesRef.current).forEach(r => map.removeLayer(r));
    routesRef.current = {};

    // Group active employees
    const activeStaff = employees.filter(emp => {
      if (!activeTracking[emp.id]) return false;
      if (selectedOrgFilter !== 'all' && emp.organizationId !== selectedOrgFilter) return false;
      return true;
    });

    const bounds: any[] = [];

    activeStaff.forEach(emp => {
      const ping = activeTracking[emp.id];
      const org = organizations.find(o => o.id === emp.organizationId);
      const orgName = org ? org.name : 'Unknown Platform Org';
      const color = emp.color || '#3b82f6';
      
      const pinHtml = `
        <div style="position:relative; width:44px; height:44px;">
          <div class="super-map-pulse" style="--pulse-color: ${color}"></div>
          <svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15))">
            <circle cx="50" cy="50" r="40" fill="white" stroke="${color}" stroke-width="8" />
            <circle cx="50" cy="50" r="30" fill="${color}20" />
            <text x="50" y="58" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="${color}" text-anchor="middle">
              ${emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </text>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-emp-marker',
        html: pinHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const popupHtml = `
        <div class="p-1 space-y-1">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p class="font-extrabold text-xs text-slate-800">${emp.name}</p>
          </div>
          <p class="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">${orgName}</p>
          <div class="border-t border-slate-100 my-1 pt-1 text-[11px] text-slate-500 space-y-0.5">
            <p>⚡ Battery: <b>${ping.batteryLevel}%</b></p>
            <p>🚗 Current Speed: <b>${ping.speed} km/h</b></p>
            <p>📍 Status: <span class="capitalize text-slate-700 font-semibold">${ping.status}</span></p>
            <p>🕒 Last Ping: <b>${new Date(ping.timestamp).toLocaleTimeString()}</b></p>
          </div>
        </div>
      `;

      const marker = L.marker([ping.latitude, ping.longitude], { icon })
        .bindPopup(popupHtml)
        .addTo(map);

      markersRef.current[emp.id] = marker;
      bounds.push([ping.latitude, ping.longitude]);

      // Movement trails drawing disabled so traveled lines do not show
      if (routesRef.current[emp.id]) {
        map.removeLayer(routesRef.current[emp.id]);
        delete routesRef.current[emp.id];
      }
    });

    // Center map on markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [ready, activeTracking, employees, selectedOrgFilter, organizations, historyPaths]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={containerRef} className="w-full h-full min-h-[450px] bg-slate-100" />

      {/* Map layers selector */}
      <div className="absolute bottom-4 right-4 z-[999] bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-2 flex flex-col gap-1.5">
        <button
          onClick={() => setLayer('light')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition ${layer === 'light' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Light Map
        </button>
        <button
          onClick={() => setLayer('dark')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition ${layer === 'dark' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Dark Map
        </button>
        <button
          onClick={() => setLayer('sat')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition ${layer === 'sat' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Satellite
        </button>
      </div>

      {/* Status banner */}
      <div className="absolute top-4 left-4 z-[999] bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl px-3 py-2 flex items-center gap-2">
        <div className="flex-shrink-0 relative">
          <span className="flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Global Telemetry</h4>
          <p className="text-[11px] text-slate-700 font-extrabold mt-0.5">
            {Object.keys(markersRef.current).length} Active Field Employees Online
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminMap;
