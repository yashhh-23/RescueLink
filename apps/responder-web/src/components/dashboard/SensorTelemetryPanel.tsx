import type { HazardZone, SensorReading } from '@/lib/schema';

interface SensorTelemetryPanelProps {
  sensors: SensorReading[];
  hazardZones: HazardZone[];
  hasLoaded: boolean;
  visible: boolean;
}

const STATUS_STYLE: Record<SensorReading['status'], string> = {
  normal: 'bg-success/10 text-success border-success/30',
  watch: 'bg-priority-mediumBg text-priority-medium border-priority-medium/30',
  critical: 'bg-priority-criticalBg text-priority-critical border-priority-critical/30',
};

const SEVERITY_STYLE: Record<HazardZone['severity'], string> = {
  watch: 'bg-priority-mediumBg text-priority-medium border-priority-medium/30',
  warning: 'bg-priority-highBg text-priority-high border-priority-high/30',
  critical: 'bg-priority-criticalBg text-priority-critical border-priority-critical/30',
};

const SENSOR_KIND_LABEL: Record<SensorReading['kind'], string> = {
  water_level: 'Water level gauge',
  seismic: 'Seismic sensor',
  weather: 'Weather station',
  fire_perimeter: 'Fire perimeter sensor',
};

/**
 * Satisfies the brief's "sensor telemetry cards" example directly
 * ("River Sensor #4: Critical Level (92% flood threshold)") as a real list
 * a coordinator can scan, not just something buried in a map popup —
 * useful even before opening the map, and works fine on narrow screens
 * where the map is scrolled below the fold.
 */
export function SensorTelemetryPanel({ sensors, hazardZones, hasLoaded, visible }: SensorTelemetryPanelProps) {
  if (!visible) return null;

  if (hasLoaded && sensors.length === 0 && hazardZones.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-surface px-3 py-2.5 text-xs text-ink-500">
        No sensor or hazard-zone data available yet — GET /api/sensors and /api/hazard-zones
        aren&rsquo;t implemented on the backend. This panel will populate automatically once
        they are.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sensors.map((sensor) => (
        <div
          key={sensor.id}
          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${STATUS_STYLE[sensor.status]}`}
        >
          <div>
            <p className="font-semibold">{sensor.label}</p>
            <p className="opacity-80">{SENSOR_KIND_LABEL[sensor.kind]}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">
              {sensor.value}
              {sensor.unit}
            </p>
            <p className="opacity-80">{sensor.thresholdPercent}% of threshold</p>
          </div>
        </div>
      ))}

      {hazardZones.map((zone) => (
        <div
          key={zone.id}
          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${SEVERITY_STYLE[zone.severity]}`}
        >
          <div>
            <p className="font-semibold">{zone.label}</p>
            <p className="opacity-80 capitalize">{zone.kind} zone</p>
          </div>
          <p className="font-semibold uppercase">{zone.severity}</p>
        </div>
      ))}
    </div>
  );
}
