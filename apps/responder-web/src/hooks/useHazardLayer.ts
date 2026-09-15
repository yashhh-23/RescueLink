'use client';

import { useEffect, useState } from 'react';
import { getHazardZones, getSensors } from '@/lib/api';
import type { HazardZone, SensorReading } from '@/lib/schema';

const POLL_INTERVAL_MS = 60_000;

interface UseHazardLayerState {
  sensors: SensorReading[];
  hazardZones: HazardZone[];
  /** True once at least one poll attempt has completed, so the UI can tell
   * "no sensors configured yet" apart from "still loading". */
  hasLoaded: boolean;
}

/**
 * GET /api/sensors and /api/hazard-zones don't exist in apps/api yet (see
 * lib/api.ts). Both calls already resolve to `[]` instead of throwing, so
 * this hook is safe to mount unconditionally today — it will just show an
 * empty layer until the backend adds these routes, then start working
 * without any frontend change.
 */
export function useHazardLayer(): UseHazardLayerState {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const [sensorData, zoneData] = await Promise.all([
          getSensors(controller.signal),
          getHazardZones(controller.signal),
        ]);
        if (cancelled) return;
        setSensors(sensorData);
        setHazardZones(zoneData);
        setHasLoaded(true);
      } catch (err: unknown) {
        if (cancelled || (err as { name?: string })?.name === 'AbortError') {
          return;
        }
        // Non-abort errors are ignored so the UI gracefully shows empty layers
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return { sensors, hazardZones, hasLoaded };
}
