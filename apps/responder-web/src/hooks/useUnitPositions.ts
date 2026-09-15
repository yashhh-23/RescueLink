'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUnitPositions, setUnitPosition } from '@/lib/offlineCache';
import type { UnitPosition } from '@/lib/schema';

interface UseUnitPositionsState {
  positions: UnitPosition[];
  /** Looks up a position by exact unit callsign, e.g. "Boat Unit-4". */
  getPosition: (unitName: string) => UnitPosition | undefined;
  reportPosition: (unitName: string, lat: number, lng: number) => Promise<void>;
}

/**
 * There is no GPS telemetry pipeline from field units yet — see
 * lib/schema.ts UnitPosition and README "Phase 2 assumptions". Positions
 * are whatever a dispatcher has manually logged, stored locally (idb) on
 * this browser only; they are not shared across responder workstations
 * until a real telemetry/backend sync exists.
 */
export function useUnitPositions(): UseUnitPositionsState {
  const [positions, setPositions] = useState<UnitPosition[]>([]);

  const reload = useCallback(async () => {
    const stored = await getUnitPositions();
    setPositions(stored);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getPosition = useCallback(
    (unitName: string) => positions.find((p) => p.unitName === unitName),
    [positions]
  );

  const reportPosition = useCallback(
    async (unitName: string, lat: number, lng: number) => {
      await setUnitPosition({ unitName, lat, lng, reportedAt: Date.now() });
      await reload();
    },
    [reload]
  );

  return { positions, getPosition, reportPosition };
}
