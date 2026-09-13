import { openDB, type IDBPDatabase } from 'idb';
import type { SOSSubmission, PendingIncident } from './validation';

const DB_NAME = 'rescue-link-survivor';
const DB_VERSION = 1;
const STORE_NAME = 'pendingIncidents';

export interface SurvivorDB {
  pendingIncidents: {
    key: string;
    value: PendingIncident;
    indexes: { 'by-status': string; 'by-createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<SurvivorDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SurvivorDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SurvivorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'localId',
          });
          store.createIndex('by-status', 'status');
          store.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Generate a unique local ID prefixed with 'local-' for panic resilience
 */
export function generateLocalId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `local-${timestamp}-${random}`;
}

/**
 * Check whether an incident ID is a temporary local ID
 */
export function isLocalIncidentId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.startsWith('local-');
}

/**
 * Enqueue an incident payload into IndexedDB
 */
export async function enqueueIncident(payload: SOSSubmission): Promise<PendingIncident> {
  const db = await getDB();
  const pendingRecord: PendingIncident = {
    localId: generateLocalId(),
    createdAt: Date.now(),
    status: 'queued',
    retryCount: 0,
    payload,
  };

  await db.put(STORE_NAME, pendingRecord);
  return pendingRecord;
}

/**
 * Retrieve all pending records from IndexedDB
 */
export async function getPendingIncidents(): Promise<PendingIncident[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * Remove a single pending record by localId after successful sync
 */
export async function removePendingIncident(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, localId);
}

/**
 * Flush pending records to backend API /api/incidents
 */
export async function flushPendingIncidents(
  apiBase: string = ''
): Promise<{ syncedIncidents: Array<{ localId: string; serverId: string }>; failedCount: number }> {
  const pending = await getPendingIncidents();
  const syncedIncidents: Array<{ localId: string; serverId: string }> = [];
  let failedCount = 0;

  for (const item of pending) {
    try {
      const response = await fetch(`${apiBase}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.payload),
      });

      if (response.status === 201 || response.status === 200) {
        const data = (await response.json()) as { id?: string; incident?: { id?: string } };
        const serverId = data.id || data.incident?.id || `srv-${Date.now()}`;
        await removePendingIncident(item.localId);
        syncedIncidents.push({ localId: item.localId, serverId });
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return { syncedIncidents, failedCount };
}
