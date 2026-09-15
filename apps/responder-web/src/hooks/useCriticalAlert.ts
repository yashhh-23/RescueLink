'use client';

import { useEffect, useRef, useState } from 'react';
import { playCriticalAlertChime } from '@/lib/alertSound';
import { getCategory } from '@/lib/schema';
import type { IncidentResponse } from '@/lib/schema';

const ALERT_VISIBLE_MS = 8000;

function isAlertWorthy(incident: IncidentResponse): boolean {
  return incident.priority === 'critical' || getCategory(incident) === 'fire';
}

interface CriticalAlertState {
  /** True while a just-arrived critical/fire incident should be visually flagged. */
  isActive: boolean;
  /** The most recent alert-worthy incident that triggered the beacon, if any. */
  latestIncident: IncidentResponse | null;
  dismiss: () => void;
}

/**
 * Compares each new incident snapshot against the previous one by id. Any
 * incident id that's new AND alert-worthy triggers a chime + pulsing beacon
 * for a few seconds. Does not fire on the very first load (there's nothing
 * to compare against yet), only on incidents that arrive after that.
 */
export function useCriticalAlert(incidents: IncidentResponse[] | null): CriticalAlertState {
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [latestIncident, setLatestIncident] = useState<IncidentResponse | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!incidents) return;

    if (knownIdsRef.current === null) {
      // First snapshot: just record what exists, don't alert retroactively.
      knownIdsRef.current = new Set(incidents.map((i) => i.id));
      return;
    }

    const newlyArrived = incidents.filter((i) => !knownIdsRef.current!.has(i.id));
    knownIdsRef.current = new Set(incidents.map((i) => i.id));

    const alertWorthy = newlyArrived.find(isAlertWorthy);
    if (!alertWorthy) return;

    setLatestIncident(alertWorthy);
    setIsActive(true);
    playCriticalAlertChime();

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setIsActive(false), ALERT_VISIBLE_MS);
  }, [incidents]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return {
    isActive,
    latestIncident,
    dismiss: () => setIsActive(false),
  };
}
