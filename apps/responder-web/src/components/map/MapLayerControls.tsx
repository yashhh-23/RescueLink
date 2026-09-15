'use client';

interface MapLayerControlsProps {
  showSensors: boolean;
  onToggleSensors: () => void;
  showHazardZones: boolean;
  onToggleHazardZones: () => void;
  showUnits: boolean;
  onToggleUnits: () => void;
  geofenceEnabled: boolean;
  onToggleGeofence: () => void;
}

function ToggleChip({
  label,
  active,
  onClick,
  dotColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-action bg-action-soft text-action'
          : 'border-line bg-surface text-ink-500 hover:bg-canvas'
      }`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: active ? dotColor : '#CDD1D8' }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}

/**
 * Sits over the top-right of the map. Every layer here defaults off so the
 * map stays clean until a dispatcher opts in — matches the brief's ask for
 * a "toggle", not an always-on overlay.
 */
export function MapLayerControls({
  showSensors,
  onToggleSensors,
  showHazardZones,
  onToggleHazardZones,
  showUnits,
  onToggleUnits,
  geofenceEnabled,
  onToggleGeofence,
}: MapLayerControlsProps) {
  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-[1000] flex flex-wrap justify-end gap-1.5 rounded-lg border border-line bg-surface/95 p-2 shadow-panel backdrop-blur-sm">
      <ToggleChip label="Sensors" active={showSensors} onClick={onToggleSensors} dotColor="#CA8A04" />
      <ToggleChip
        label="Hazard zones"
        active={showHazardZones}
        onClick={onToggleHazardZones}
        dotColor="#DC2626"
      />
      <ToggleChip label="Field units" active={showUnits} onClick={onToggleUnits} dotColor="#1D4ED8" />
      <ToggleChip label="Draw zone" active={geofenceEnabled} onClick={onToggleGeofence} dotColor="#333A46" />
    </div>
  );
}
