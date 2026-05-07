import { useEffect, useRef } from 'react';
import type { Technician, Job } from '../types';
import { initials } from '../components/StatusBadge';

// Dynamically import Leaflet to avoid SSR issues
let L: typeof import('leaflet') | null = null;

const TC = [
  { bg: '#EDE9FE', tx: '#5B21B6' },
  { bg: '#D1FAE5', tx: '#065F46' },
  { bg: '#FEF3C7', tx: '#92400E' },
  { bg: '#DBEAFE', tx: '#1E40AF' },
  { bg: '#FCE7F3', tx: '#9D174D' },
  { bg: '#E0F2FE', tx: '#0C4A6E' },
];

const PIN_COLORS = ['#E8371B', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

interface Props {
  technicians: Technician[];
  jobs: Job[];
  onRefresh: () => void;
}

export function GPSTracking({ technicians, jobs, onRefresh }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').Marker[]>([]);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!mapRef.current) return;

      // Lazy-load Leaflet + CSS
      if (!L) {
        const leaflet = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        L = leaflet.default ?? (leaflet as any);
      }

      if (!mounted) return;

      if (!leafletMap.current) {
        // Centre on Gauteng, South Africa
        leafletMap.current = L!.map(mapRef.current, {
          center: [-26.2041, 28.0473],
          zoom: 10,
          zoomControl: true,
        });

        L!.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(leafletMap.current);
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add technician markers
      technicians.forEach((tech, i) => {
        if (!leafletMap.current || !L) return;
        const color = PIN_COLORS[i % PIN_COLORS.length];
        const col = TC[i % TC.length];
        const opacity = tech.status === 'offline' ? 0.4 : 1;
        const pulse = tech.status === 'active' ? ' class="pulse"' : '';

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="opacity:${opacity};text-align:center;">
              <div${pulse} style="
                width:34px;height:34px;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                background:${color};
                border:2px solid white;
                display:flex;align-items:center;justify-content:center;
              ">
                <span style="transform:rotate(45deg);font-size:10px;font-weight:700;color:white;font-family:Rajdhani,sans-serif;">
                  ${initials(tech.name)}
                </span>
              </div>
              <div style="
                background:white;border:0.5px solid #e2e6ec;
                border-radius:4px;padding:2px 6px;font-size:10px;
                font-weight:500;white-space:nowrap;margin-top:2px;
                font-family:'DM Sans',sans-serif;
              ">${tech.name.split(' ')[0]}</div>
            </div>`,
          iconAnchor: [17, 50],
          iconSize: [60, 60],
        });

        const activeJob = jobs.find(j => j.tech === tech.name && (j.status === 'in progress' || j.status === 'new'));
        const statusLabel = tech.status === 'active' ? 'On Site' : tech.status === 'enroute' ? 'En Route' : 'Offline';

        const popup = `
          <div style="font-family:'DM Sans',sans-serif;min-width:160px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="width:30px;height:30px;border-radius:50%;background:${col.bg};color:${col.tx};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${initials(tech.name)}</div>
              <div>
                <div style="font-weight:500;font-size:13px;">${tech.name}</div>
                <div style="font-size:11px;color:#6b7280;">${tech.role}</div>
              </div>
            </div>
            <div style="font-size:11px;color:#6b7280;">Status: <strong>${statusLabel}</strong></div>
            <div style="font-size:11px;color:#6b7280;">Phone: ${tech.phone}</div>
            ${activeJob ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">Job: <strong>${activeJob.title}</strong></div>` : ''}
            <div style="font-size:10px;color:#9ca3af;margin-top:4px;">
              ${tech.lat.toFixed(4)}°S, ${tech.lng.toFixed(4)}°E
            </div>
          </div>`;

        const marker = L!.marker([tech.lat, tech.lng], { icon })
          .addTo(leafletMap.current!)
          .bindPopup(popup);

        markersRef.current.push(marker);
      });
    };

    initMap();
    return () => { mounted = false; };
  }, [technicians, jobs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, []);

  const now = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-ttl">Live GPS Tracking</div>
        <button className="btn btn-primary btn-sm" onClick={onRefresh}>Refresh Locations</button>
      </div>

      <div className="map-wrap">
        <div ref={mapRef} className="map-canvas" style={{ height: 400 }} />
        <div style={{ display: 'flex', gap: 12, padding: '10px 14px', borderTop: '0.5px solid var(--bdr)', flexWrap: 'wrap' }}>
          {technicians.map((t, i) => {
            const color = PIN_COLORS[i % PIN_COLORS.length];
            const label = t.status === 'active' ? 'On Site' : t.status === 'enroute' ? 'En Route' : 'Offline';
            return (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span>{t.name.split(' ')[0]} — {label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sec-ttl" style={{ marginBottom: '.75rem' }}>Technician Locations</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
        {technicians.map((t, i) => {
          const col = TC[i % TC.length];
          const statusLabel = t.status === 'active' ? 'On Site' : t.status === 'enroute' ? 'En Route' : 'Offline';
          const statusColor = t.status === 'active' ? 'var(--success-tx)' : t.status === 'enroute' ? 'var(--warn-tx)' : 'var(--muted)';
          const activeJob = jobs.find(j => j.tech === t.name && (j.status === 'in progress' || j.status === 'new'));

          return (
            <div key={t.name} style={{
              background: 'var(--surf)', border: '0.5px solid var(--bdr)',
              borderRadius: 'var(--rl)', padding: '.875rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: col.bg, color: col.tx,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {initials(t.name)}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: statusColor }}>{statusLabel}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {activeJob
                  ? <>Active job: <span style={{ color: 'var(--txt)' }}>{activeJob.title}</span></>
                  : <span style={{ color: 'var(--hint)' }}>No active job</span>
                }
              </div>
              <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
                {t.lat.toFixed(4)}°S, {t.lng.toFixed(4)}°E · Last ping: {now}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
