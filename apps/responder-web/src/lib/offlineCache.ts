'use client';

import { openDB, type IDBPDatabase } from 'idb';
import type { IncidentResponse, PendingBroadcast, UnitPosition } from '@/lib/schema';

const DB_NAME = 'rescue-link-responder';
const DB_VERSION = 1;

const STORE_INCIDENT_CACHE = 'incidentCache';
const STORE_BROADCAST_OUTBOX = 'broadcastOutbox';
const STORE_UNIT_POSITIONS = 'unitPositions';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('offlineCache is only available in the browser.'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_INCIDENT_CACHE)) {
          db.createObjectStore(STORE_INCIDENT_CACHE);
        }
        if (!db.objectStoreNames.contains(STORE_BROADCAST_OUTBOX)) {
          db.createObjectStore(STORE_BROADCAST_OUTBOX, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_UNIT_POSITIONS)) {
          db.createObjectStore(STORE_UNIT_POSITIONS, { keyPath: 'unitName' });
        }
      },
    });
  }
  return dbPromise;
}

const INCIDENT_LIST_KEY = 'latest-incident-list';
const INCIDENT_LIST_TIMESTAMP_KEY = 'latest-incident-list-timestamp';

/** Persists the most recent successful incident list fetch for offline read access. */
export async function cacheIncidentList(incidents: IncidentResponse[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_INCIDENT_CACHE, 'readwrite');
    await tx.store.put(incidents, INCIDENT_LIST_KEY);
    await tx.store.put(Date.now(), INCIDENT_LIST_TIMESTAMP_KEY);
    await tx.done;
  } catch {
    // Offline caching is a nice-to-have; a failure here should never block
    // the live dashboard from rendering fresh data.
  }
}

export async function getCachedIncidentList(): Promise<{
  incidents: IncidentResponse[];
  cachedAt: number;
} | null> {
  try {
    const db = await getDb();
    const incidents = (await db.get(STORE_INCIDENT_CACHE, INCIDENT_LIST_KEY)) as
      | IncidentResponse[]
      | undefined;
    const cachedAt = (await db.get(STORE_INCIDENT_CACHE, INCIDENT_LIST_TIMESTAMP_KEY)) as
      | number
      | undefined;
    if (!incidents) return null;
    return { incidents, cachedAt: cachedAt ?? 0 };
  } catch {
    return null;
  }
}

// --- Broadcast outbox (see lib/api.ts broadcastIncident) ---

export async function queueBroadcast(entry: PendingBroadcast): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_BROADCAST_OUTBOX, entry);
  } catch {
    // Best-effort; if idb is unavailable there is nothing more to do.
  }
}

export async function updateBroadcastStatus(
  id: string,
  status: PendingBroadcast['status']
): Promise<void> {
  try {
    const db = await getDb();
    const existing = (await db.get(STORE_BROADCAST_OUTBOX, id)) as PendingBroadcast | undefined;
    if (!existing) return;
    await db.put(STORE_BROADCAST_OUTBOX, { ...existing, status });
  } catch {
    // Best-effort.
  }
}

export async function listPendingBroadcasts(): Promise<PendingBroadcast[]> {
  try {
    const db = await getDb();
    const all = (await db.getAll(STORE_BROADCAST_OUTBOX)) as PendingBroadcast[];
    return all.filter((entry) => entry.status === 'pending');
  } catch {
    return [];
  }
}

// --- Manually-reported unit positions (see lib/schema.ts UnitPosition) ---

export async function setUnitPosition(position: UnitPosition): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_UNIT_POSITIONS, position);
  } catch {
    // Best-effort.
  }
}

export async function getUnitPositions(): Promise<UnitPosition[]> {
  try {
    const db = await getDb();
    return (await db.getAll(STORE_UNIT_POSITIONS)) as UnitPosition[];
  } catch {
    return [];
  }
}
