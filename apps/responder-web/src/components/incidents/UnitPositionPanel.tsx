'use client';

import { useState } from 'react';
import { useUnitPositions } from '@/hooks/useUnitPositions';
import { haversineDistanceMeters, estimateEtaMinutes, formatDistance } from '@/lib/geo';
import type { IncidentResponse } from '@/lib/schema';

interface UnitPositionPanelProps {
  incident: IncidentResponse;
}

/**
 * There's no GPS telemetry from field units yet (see README). This lets a
 * dispatcher manually log "last known position" per assigned unit so the
 * map/distance display has something real to show instead of nothing.
 */
export function UnitPositionPanel({ incident }: UnitPositionPanelProps) {
  const units = (incident.assignedTo ? [incident.assignedTo] : []);
  const { getPosition, reportPosition } = useUnitPositions();
  const [drafts, setDrafts] = useState<Record<string, { lat: string; lng: string }>>({});

  if (units.length === 0) return null;

  async function handleSave(unitName: string) {
    const draft = drafts[unitName];
    const lat = Number(draft?.lat);
    const lng = Number(draft?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    await reportPosition(unitName, lat, lng);
  }

  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink-900">Field unit positions</h2>
      <p className="mt-1 text-xs text-ink-500">
        Manually-logged last-known position, stored on this device only until real unit telemetry exists.
      </p>

      <ul className="mt-3 space-y-3">
        {units.map((unitName) => {
          const position = getPosition(unitName);
          const distance = position
            ? haversineDistanceMeters(position, incident.location)
            : null;

          return (
            <li key={unitName} className="rounded border border-line p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-900">{unitName}</span>
                {distance !== null ? (
                  <span className="text-xs text-ink-500">
                    {formatDistance(distance)} · ~{estimateEtaMinutes(distance)} min ETA
                  </span>
                ) : (
                  <span className="text-xs text-ink-300">No position logged</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="lat"
                  value={drafts[unitName]?.lat ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [unitName]: { ...prev[unitName], lat: e.target.value, lng: prev[unitName]?.lng ?? '' } }))
                  }
                  className="w-24 rounded border border-line px-2 py-1 text-xs focus:border-action focus:outline-none focus:ring-1 focus:ring-action"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="lng"
                  value={drafts[unitName]?.lng ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [unitName]: { ...prev[unitName], lng: e.target.value, lat: prev[unitName]?.lat ?? '' } }))
                  }
                  className="w-24 rounded border border-line px-2 py-1 text-xs focus:border-action focus:outline-none focus:ring-1 focus:ring-action"
                />
                <button
                  type="button"
                  onClick={() => handleSave(unitName)}
                  className="rounded border border-line px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-canvas"
                >
                  Log position
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
