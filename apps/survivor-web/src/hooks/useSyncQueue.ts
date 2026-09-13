'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPendingIncidents,
  flushPendingIncidents,
} from '@/lib/offlineQueue';

export interface SyncResult {
  syncedIncidents: Array<{ localId: string; serverId: string }>;
  failedCount: number;
}

export function useSyncQueue(onIncidentSynced?: (mapping: { localId: string; serverId: string }) => void) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const onIncidentSyncedRef = useRef(onIncidentSynced);

  useEffect(() => {
    onIncidentSyncedRef.current = onIncidentSynced;
  }, [onIncidentSynced]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await getPendingIncidents();
      setPendingCount(items.length);
    } catch {
      // Ignore IndexedDB read errors during hydration/teardown
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (typeof window === 'undefined' || isSyncing) {
      return { syncedIncidents: [], failedCount: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await flushPendingIncidents();
      if (result.syncedIncidents.length > 0) {
        result.syncedIncidents.forEach((item) => {
          if (onIncidentSyncedRef.current) {
            onIncidentSyncedRef.current(item);
          }
        });
      }
      await refreshPendingCount();
      return result;
    } catch (err) {
      return { syncedIncidents: [], failedCount: 1 };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic retry loop every 10 seconds
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        syncNow();
      } else {
        refreshPendingCount();
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [syncNow, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    refreshPendingCount,
  };
}
