'use client';

import { useState } from 'react';
import { batchUpdateStatus } from '@/lib/api';
import { isPointInCircle, isPointInPolygon } from '@/lib/geo';
import type { GeofenceShape } from '@/components/map/IncidentMap';
import type { IncidentResponse, IncidentStatus } from '@/lib/schema';

interface GeofencePanelProps {
  shape: GeofenceShape | null;
  incidents: IncidentResponse[];
  onClear: () => void;
  /** Called after a batch action so the caller can refresh its incident list. */
  onBatchComplete: () => void;
}

const BULK_ACTIONS: { label: string; status: IncidentStatus }[] = [
  { label: 'Acknowledge all', status: 'acknowledged' },
  { label: 'Start Rescue for all', status: 'in_progress' },
  { label: 'Resolve all', status: 'resolved' },
];

export function GeofencePanel({ shape, incidents, onClear, onBatchComplete }: GeofencePanelProps) {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!shape) return null;

  const matched = incidents.filter((incident) => {
    const point = { lat: incident.location.lat, lng: incident.location.lng };
    if (shape.kind === 'circle') return isPointInCircle(point, shape.center, shape.radiusMeters);
    return isPointInPolygon(point, shape.points);
  });

  async function runBatch(status: IncidentStatus) {
    setIsPending(true);
    setResult(null);
    try {
      const { succeeded, failed } = await batchUpdateStatus(
        matched.map((i) => i.id),
        status
      );
      setResult(
        failed.length === 0
          ? `Updated ${succeeded.length} incident${succeeded.length === 1 ? '' : 's'}.`
          : `Updated ${succeeded.length}, ${failed.length} failed.`
      );
      onBatchComplete();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-lg border border-line bg-surface/95 p-3 shadow-panel backdrop-blur-sm sm:right-auto sm:max-w-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-900">
          {matched.length} incident{matched.length === 1 ? '' : 's'} in zone
        </p>
        <button type="button" onClick={onClear} className="text-xs text-ink-500 hover:text-ink-700">
          Clear zone
        </button>
      </div>

      {matched.length === 0 ? (
        <p className="mt-1 text-xs text-ink-500">Draw a circle or polygon over the map to select incidents.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BULK_ACTIONS.map((action) => (
            <button
              key={action.status}
              type="button"
              onClick={() => runBatch(action.status)}
              disabled={isPending}
              className="rounded border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Working…' : action.label}
            </button>
          ))}
        </div>
      )}

      {result ? <p className="mt-2 text-xs text-ink-500">{result}</p> : null}

      <p className="mt-2 text-[11px] text-ink-300">
        No batch endpoint exists on the backend yet — this sends the real per-incident PATCH
        request once for each incident in the zone.
      </p>
    </div>
  );
}
