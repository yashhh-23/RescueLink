'use client';

import { useEffect, useRef, useState } from 'react';
import type { IncidentResponse } from '@/lib/schema';

export type StreamStatus = 'connecting' | 'live' | 'unavailable';

interface UseIncidentStreamOptions {
  /** Called with a created/updated incident the instant it arrives over SSE. */
  onIncident: (incident: IncidentResponse) => void;
}

/**
 * Assumed contract: GET /api/events, a Server-Sent Events stream emitting
 * `event: incident` messages whose `data` is a JSON-encoded Incident. This
 * endpoint does not exist in apps/api yet (confirmed — only /api/health and
 * /api/incidents are mounted in app.ts), so this hook is built to degrade
 * completely safely: if the connection fails or the endpoint 404s, status
 * flips to "unavailable" and the caller's existing 15s polling (useIncidents)
 * remains the source of truth. Nothing breaks either way.
 */
export function useIncidentStream({ onIncident }: UseIncidentStreamOptions): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const onIncidentRef = useRef(onIncident);
  onIncidentRef.current = onIncident;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      setStatus('unavailable');
      return;
    }

    let source: EventSource | null = null;
    let cancelled = false;

    try {
      source = new EventSource('/api/events');
    } catch {
      setStatus('unavailable');
      return;
    }

    source.addEventListener('open', () => {
      if (!cancelled) setStatus('live');
    });

    source.addEventListener('incident', (event) => {
      if (cancelled) return;
      try {
        const raw = JSON.parse((event as MessageEvent).data);
        const incoming: IncidentResponse = raw && raw.incident ? raw.incident : (raw as IncidentResponse);
        if (incoming && incoming.id) {
          onIncidentRef.current(incoming);
        }
      } catch {
        // Malformed push — ignore this event, polling will still catch up.
      }
    });

    source.addEventListener('error', () => {
      if (cancelled) return;
      setStatus('unavailable');
      source?.close();
    });

    return () => {
      cancelled = true;
      source?.close();
    };
  }, []);

  return status;
}
