'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getIncidents } from '@/lib/api';
import { cacheIncidentList, getCachedIncidentList } from '@/lib/offlineCache';
import type { IncidentResponse } from '@/lib/schema';

const POLL_INTERVAL_MS = 15_000;

interface UseIncidentsState {
  incidents: IncidentResponse[] | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  refreshError: string | null;
  /** True when the current `incidents` came from the offline cache, not a live fetch. */
  isServingCachedData: boolean;
  refresh: () => void;
  /** Upsert a single incident into local state (e.g. from an SSE push). */
  applyIncidentUpdate: (incident: IncidentResponse) => void;
}

export function useIncidents(): UseIncidentsState {
  const [incidents, setIncidents] = useState<IncidentResponse[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isServingCachedData, setIsServingCachedData] = useState(false);

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
        setIsServingCachedData(false);
        setLastRefreshedAt(new Date());
        void cacheIncidentList(data);
      })
      .catch(async (err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (latestRequestId.current !== requestId) return;

        setRefreshError(err instanceof ApiError ? err.message : 'Unable to load incidents.');

        // Offline-first fallback (Phase 2): if we have nothing on screen yet,
        // or the live fetch just failed, fall back to the last successfully
        // cached list so a field tablet that's lost connectivity still shows
        // something usable instead of a blank error state.
        const cached = await getCachedIncidentList();
        if (cached && latestRequestId.current === requestId) {
          setIncidents((current) => current ?? cached.incidents);
          setIsServingCachedData(true);
        }
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

  const applyIncidentUpdate = useCallback((incident: IncidentResponse) => {
    setIncidents((current) => {
      if (!current) return [incident];
      const index = current.findIndex((i) => i.id === incident.id);
      if (index === -1) return [incident, ...current];
      const next = [...current];
      next[index] = incident;
      return next;
    });
    setIsServingCachedData(false);
  }, []);

  return {
    incidents,
    isInitialLoading,
    isRefreshing,
    lastRefreshedAt,
    refreshError,
    isServingCachedData,
    refresh: load,
    applyIncidentUpdate,
  };
}
