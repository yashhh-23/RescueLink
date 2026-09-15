'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { getCategory, CATEGORY_LABELS } from '@/lib/schema';
import type { HazardZone, IncidentResponse, Priority, SensorReading, UnitPosition } from '@/lib/schema';
import { haversineDistanceMeters, estimateEtaMinutes, formatDistance } from '@/lib/geo';

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

const SENSOR_STATUS_COLOR: Record<SensorReading['status'], string> = {
  normal: '#16A34A',
  watch: '#CA8A04',
  critical: '#DC2626',
};

const HAZARD_SEVERITY_COLOR: Record<HazardZone['severity'], string> = {
  watch: '#CA8A04',
  warning: '#EA580C',
  critical: '#DC2626',
};

// Defensive guard against Leaflet internal race condition when DOM elements detach during animations
if (typeof window !== 'undefined' && typeof L !== 'undefined' && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: HTMLElement) {
    if (!el) {
      return new L.Point(0, 0);
    }
    try {
      return originalGetPosition.call(this, el);
    } catch {
      return new L.Point(0, 0);
    }
  };
}

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

function sensorIcon(status: SensorReading['status']) {
  return L.divIcon({
    className: '',
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:16px;height:16px;border-radius:4px;
      background:${SENSOR_STATUS_COLOR[status]};
      border:2px solid #FFFFFF;
      box-shadow:0 0 0 1px rgba(18,22,31,0.15);
      color:#fff;font-size:10px;font-weight:700;line-height:1;
    ">S</span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function unitIcon() {
  return L.divIcon({
    className: '',
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:18px;height:18px;border-radius:4px;
      background:#1D4ED8;
      border:2px solid #FFFFFF;
      box-shadow:0 0 0 1px rgba(18,22,31,0.15);
      color:#fff;font-size:10px;font-weight:700;line-height:1;
      transform:rotate(45deg);
    "><span style="transform:rotate(-45deg);">U</span></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export type GeofenceShape =
  | { kind: 'circle'; center: { lat: number; lng: number }; radiusMeters: number }
  | { kind: 'polygon'; points: { lat: number; lng: number }[] };

interface IncidentMapProps {
  incidents: IncidentResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Phase 2 layers — all optional so existing callers keep working untouched. */
  sensors?: SensorReading[];
  hazardZones?: HazardZone[];
  unitPositions?: UnitPosition[];
  showSensors?: boolean;
  showHazardZones?: boolean;
  showUnits?: boolean;
  /** Enables the leaflet-draw geofence toolbar; fires whenever the drawn shape changes or is cleared (null). */
  geofenceEnabled?: boolean;
  onGeofenceChange?: (shape: GeofenceShape | null) => void;
}

export function IncidentMap({
  incidents,
  selectedId,
  onSelect,
  sensors = [],
  hazardZones = [],
  unitPositions = [],
  showSensors = false,
  showHazardZones = false,
  showUnits = false,
  geofenceEnabled = false,
  onGeofenceChange,
}: IncidentMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const sensorLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);
  const unitLayerRef = useRef<L.LayerGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<any | null>(null);
  const onGeofenceChangeRef = useRef(onGeofenceChange);
  onGeofenceChangeRef.current = onGeofenceChange;

  // Location is a required field in the schema, so every incident is
  // plottable once it exists at all.
  const plottable = incidents;

  const unitsByName = useMemo(() => {
    const map = new Map<string, UnitPosition>();
    unitPositions.forEach((p) => map.set(p.unitName, p));
    return map;
  }, [unitPositions]);

  // Map init (once)
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

    sensorLayerRef.current = L.layerGroup().addTo(map);
    hazardLayerRef.current = L.layerGroup().addTo(map);
    unitLayerRef.current = L.layerGroup().addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    mapRef.current = map;

    return () => {
      try {
        map.stop();
        map.closePopup();
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, []);

  // Incident markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      map.closePopup();
    } catch {}

    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch {}
    });
    markersRef.current.clear();

    plottable.forEach((incident) => {
      const { lat, lng, label } = incident.location;
      const isSelected = incident.id === selectedId;

      const marker = L.marker([lat, lng], { icon: markerIcon(incident.priority, isSelected) }).addTo(map);

      const category = CATEGORY_LABELS[getCategory(incident)];
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
      try {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12, animate: false });
      } catch {}
    } else {
      try {
        map.setView(FALLBACK_CENTER, FALLBACK_ZOOM, { animate: false });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plottable]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      try {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), FOCUSED_ZOOM), { animate: false });
        marker.openPopup();
      } catch {}
    }
  }, [selectedId]);

  // Sensor layer
  useEffect(() => {
    const layer = sensorLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showSensors) return;

    sensors.forEach((sensor) => {
      const pct = sensor.thresholdPercent ?? (sensor as any).percentOfThreshold ?? 0;
      const statusStr = (sensor.status || 'normal').toString();
      const marker = L.marker([sensor.location.lat, sensor.location.lng], {
        icon: sensorIcon(sensor.status),
      });
      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:170px;">
           <strong>${sensor.label}</strong><br/>
           ${sensor.value}${sensor.unit} · ${pct}% of threshold<br/>
           Status: ${statusStr.toUpperCase()}
         </div>`
      );
      layer.addLayer(marker);
    });
  }, [sensors, showSensors]);

  // Hazard zone layer
  useEffect(() => {
    const layer = hazardLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showHazardZones) return;

    hazardZones.forEach((zone) => {
      const label = zone.label || (zone as any).name || 'Hazard Zone';
      const kind = (zone.kind || (zone as any).hazardType || 'hazard').toString();
      const severity = (zone.severity || 'warning').toString();
      const color = HAZARD_SEVERITY_COLOR[zone.severity] || '#f59e0b';

      const circle = L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 2,
      });
      circle.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;">
           <strong>${label}</strong><br/>
           ${kind.toUpperCase()} · ${severity.toUpperCase()}
         </div>`
      );
      layer.addLayer(circle);
    });
  }, [hazardZones, showHazardZones]);

  // Field unit layer, with distance/ETA to the incident they're assigned to
  useEffect(() => {
    const layer = unitLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showUnits) return;

    plottable.forEach((incident) => {
      const assignedUnits = (incident.assignedTo ? [incident.assignedTo] : []);
      assignedUnits.forEach((unitName) => {
        const position = unitsByName.get(unitName);
        if (!position) return;

        const marker = L.marker([position.lat, position.lng], { icon: unitIcon() });
        const distance = haversineDistanceMeters(position, incident.location);
        const eta = estimateEtaMinutes(distance);

        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:180px;">
             <strong>${unitName}</strong><br/>
             ${formatDistance(distance)} from incident ${incident.id}<br/>
             ~${eta} min ETA (straight-line estimate)
           </div>`
        );
        layer.addLayer(marker);
      });
    });
  }, [plottable, unitsByName, showUnits]);

  // Geofence drawing (leaflet-draw)
  useEffect(() => {
    const map = mapRef.current;
    const drawnItems = drawnItemsRef.current;
    if (!map || !drawnItems) return;

    if (!geofenceEnabled) {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
      return;
    }

    const drawControl = new (L.Control as any).Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: false },
        circle: {},
        rectangle: false,
        marker: false,
        circlemarker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    function emitShape() {
      const layers = drawnItems!.getLayers();
      const first = layers[0];
      if (!first) {
        onGeofenceChangeRef.current?.(null);
        return;
      }
      if (first instanceof L.Circle) {
        const center = first.getLatLng();
        onGeofenceChangeRef.current?.({
          kind: 'circle',
          center: { lat: center.lat, lng: center.lng },
          radiusMeters: first.getRadius(),
        });
      } else if (first instanceof L.Polygon) {
        const latlngs = (first.getLatLngs()[0] as L.LatLng[]) ?? [];
        onGeofenceChangeRef.current?.({
          kind: 'polygon',
          points: latlngs.map((p) => ({ lat: p.lat, lng: p.lng })),
        });
      }
    }

    function handleCreated(e: L.LeafletEvent) {
      drawnItems!.clearLayers(); // one geofence at a time
      drawnItems!.addLayer((e as any).layer);
      emitShape();
    }
    function handleEditedOrDeleted() {
      emitShape();
    }

    const drawEvents = (L as any).Draw?.Event || {};
    map.on(drawEvents.CREATED || 'draw:created', handleCreated as L.LeafletEventHandlerFn);
    map.on(drawEvents.EDITED || 'draw:edited', handleEditedOrDeleted);
    map.on(drawEvents.DELETED || 'draw:deleted', handleEditedOrDeleted);

    return () => {
      map.off(drawEvents.CREATED || 'draw:created', handleCreated as L.LeafletEventHandlerFn);
      map.off(drawEvents.EDITED || 'draw:edited', handleEditedOrDeleted);
      map.off(drawEvents.DELETED || 'draw:deleted', handleEditedOrDeleted);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [geofenceEnabled]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Map of active incidents"
      className="h-full min-h-[320px] w-full rounded-md border border-line"
    />
  );
}
