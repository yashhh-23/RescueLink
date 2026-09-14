'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getIncident } from '@/lib/api';
import type { IncidentResponse } from '@/lib/schema';

interface UseIncidentState {
  incident: IncidentResponse | null;
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
  refresh: () => void;
  setIncident: (incident: IncidentResponse) => void;
}

export function useIncident(id: string): UseIncidentState {
  const [incident, setIncidentState] = useState<IncidentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const latestRequestId = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequestId.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    getIncident(id, controller.signal)
      .then((data) => {
        if (latestRequestId.current !== requestId) return;
        setIncidentState(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (latestRequestId.current !== requestId) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load this incident.');
        }
      })
      .finally(() => {
        if (latestRequestId.current === requestId) setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { incident, isLoading, error, notFound, refresh: load, setIncident: setIncidentState };
}
