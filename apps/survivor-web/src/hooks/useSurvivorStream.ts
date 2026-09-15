'use client';

import { useEffect, useRef, useState } from 'react';
import type { IncidentResponse, SurvivorSSEEvent } from '@/lib/validation';

export type SurvivorStreamStatus = 'connecting' | 'live' | 'unavailable';

interface UseSurvivorStreamOptions {
  incidentId: string;
  isLocal: boolean;
  onUpdate: (incident: IncidentResponse, broadcastMessage?: string) => void;
}

export function useSurvivorStream({
  incidentId,
  isLocal,
  onUpdate,
}: UseSurvivorStreamOptions) {
  const [streamStatus, setStreamStatus] = useState<SurvivorStreamStatus>('connecting');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    // Local offline incidents cannot connect to server stream
    if (!incidentId || isLocal || incidentId.startsWith('local-')) {
      setStreamStatus('unavailable');
      return;
    }

    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      setStreamStatus('unavailable');
      return;
    }

    let source: EventSource | null = null;
    let cancelled = false;

    try {
      source = new EventSource('/api/events');
    } catch {
      setStreamStatus('unavailable');
      return;
    }

    source.addEventListener('open', () => {
      if (!cancelled) setStreamStatus('live');
    });

    source.addEventListener('incident', (event: MessageEvent) => {
      if (cancelled) return;
      try {
        const raw = JSON.parse(event.data);
        // Supports both raw Incident and wrapped SSEEvent
        const sseEvent = raw as SurvivorSSEEvent;
        const incomingIncident: IncidentResponse = sseEvent.incident || (raw as IncidentResponse);

        if (incomingIncident && incomingIncident.id === incidentId) {
          onUpdateRef.current(incomingIncident, sseEvent.message);
        }
      } catch {
        // Safe degrade on malformed push
      }
    });

    source.addEventListener('error', () => {
      if (cancelled) return;
      setStreamStatus('unavailable');
      source?.close();
    });

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [incidentId, isLocal]);

  return { streamStatus };
}
