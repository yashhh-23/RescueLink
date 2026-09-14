'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getIncidents } from '@/lib/api';
import type { IncidentResponse } from '@/lib/schema';

const POLL_INTERVAL_MS = 15_000;

interface UseIncidentsState {
  incidents: IncidentResponse[] | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  refreshError: string | null;
  refresh: () => void;
}

export function useIncidents(): UseIncidentsState {
  const [incidents, setIncidents] = useState<IncidentResponse[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const latestRequestId = useRef(0);
  const isFetchingRef = useRef(false);

  const load = useCallback(() => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const requestId = ++latestRequestId.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRefreshing(true);

    getIncidents(controller.signal)
      .then((data) => {
        if (latestRequestId.current !== requestId) return;
        setIncidents(data);
        setRefreshError(null);
        setLastRefreshedAt(new Date());
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (latestRequestId.current !== requestId) return;
        setRefreshError(err instanceof ApiError ? err.message : 'Unable to load incidents.');
      })
      .finally(() => {
        if (latestRequestId.current === requestId) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
        isFetchingRef.current = false;
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [load]);

  return { incidents, isInitialLoading, isRefreshing, lastRefreshedAt, refreshError, refresh: load };
}
