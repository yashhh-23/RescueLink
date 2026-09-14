'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { IncidentResponse, Priority } from '@/lib/schema';
import { CATEGORY_LABELS } from '@/lib/schema';

const FALLBACK_CENTER: [number, number] = [20.5937, 78.9629];
const FALLBACK_ZOOM = 5;
const FOCUSED_ZOOM = 13;

// Per the task spec: critical=red, high=orange, medium=yellow, low=green.
// pending_triage isn't in the spec's four-color scheme; given a neutral
// slate so it's visibly distinct from a triaged "low" incident.
const PRIORITY_COLOR: Record<Priority, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#16A34A',
  pending_triage: '#64748B',
};

function markerIcon(priority: Priority, isSelected: boolean) {
  const size = isSelected ? 18 : 14;
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${PRIORITY_COLOR[priority]};
      border:2px solid #FFFFFF;
      box-shadow:0 0 0 1px rgba(18,22,31,0.15);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface IncidentMapProps {
  incidents: IncidentResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function IncidentMap({ incidents, selectedId, onSelect }: IncidentMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Location is a required field in the schema, so every incident is
  // plottable once it exists at all.
  const plottable = incidents;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    plottable.forEach((incident) => {
      const { lat, lng, label } = incident.location;
      const isSelected = incident.id === selectedId;

      const marker = L.marker([lat, lng], { icon: markerIcon(incident.priority, isSelected) }).addTo(map);

      const category = CATEGORY_LABELS[incident.category];
      const locationLabel = label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:160px;">
           <strong>${incident.id}</strong><br/>
           ${category} · ${incident.priority.toUpperCase()}<br/>
           ${locationLabel}<br/>
           <a href="/incidents/${incident.id}" style="color:#1D4ED8;">View details</a>
         </div>`
      );

      marker.on('click', () => onSelect(incident.id));
      markersRef.current.set(incident.id, marker);
    });

    if (plottable.length > 0) {
      const bounds = L.latLngBounds(
        plottable.map((incident) => [incident.location.lat, incident.location.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
    } else {
      map.setView(FALLBACK_CENTER, FALLBACK_ZOOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plottable]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), FOCUSED_ZOOM));
      marker.openPopup();
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Map of active incidents"
      className="h-full min-h-[320px] w-full rounded-md border border-line"
    />
  );
}
