import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  enqueueIncident,
  getPendingIncidents,
  removePendingIncident,
  flushPendingIncidents,
  isLocalIncidentId,
} from '@/lib/offlineQueue';
import type { SOSSubmission } from '@/lib/validation';

describe('offlineQueue unit tests', () => {
  const samplePayload: SOSSubmission = {
    category: 'flood',
    description: 'Trapped on second floor, rapidly rising water level',
    location: {
      lat: 37.7749,
      lng: -122.4194,
      label: 'GPS Auto-Detected',
    },
    peopleAffected: 4,
    urgentNeeds: ['boat', 'medical', 'clean_water'],
    reporter: {
      contactMethod: 'phone',
      contactValue: '+1 555-0199',
    },
  };

  beforeEach(async () => {
    // Clear all existing pending records before each test
    const existing = await getPendingIncidents();
    for (const item of existing) {
      await removePendingIncident(item.localId);
    }
    vi.restoreAllMocks();
  });

  it('correctly identifies temporary local IDs vs server UUIDs', () => {
    expect(isLocalIncidentId('local-1726233400-abc1234')).toBe(true);
    expect(isLocalIncidentId('local-test')).toBe(true);
    expect(isLocalIncidentId('srv-99999')).toBe(false);
    expect(isLocalIncidentId('c9256ca1-28fb-4fef-b7d5-b56f2704e437')).toBe(false);
    expect(isLocalIncidentId(null)).toBe(false);
    expect(isLocalIncidentId(undefined)).toBe(false);
  });

  it('enqueues an incident into IndexedDB with a local ID and queued status', async () => {
    const queued = await enqueueIncident(samplePayload);

    expect(queued).toBeDefined();
    expect(queued.localId).toMatch(/^local-\d+-[a-z0-9]+$/);
    expect(queued.status).toBe('queued');
    expect(queued.payload.category).toBe('flood');
    expect(queued.payload.peopleAffected).toBe(4);
    expect(queued.payload.location.lng).toBe(-122.4194);
    expect(queued.payload.reporter?.contactMethod).toBe('phone');
    expect(queued.payload.reporter?.contactValue).toBe('+1 555-0199');

    const pendingList = await getPendingIncidents();
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].localId).toBe(queued.localId);
  });

  it('retrieves all pending incidents from IndexedDB', async () => {
    const p1 = await enqueueIncident(samplePayload);
    const p2 = await enqueueIncident({
      ...samplePayload,
      category: 'fire',
      description: 'Fire approaching ridge',
    });

    const pendingList = await getPendingIncidents();
    expect(pendingList.length).toBe(2);

    const ids = pendingList.map((item) => item.localId);
    expect(ids).toContain(p1.localId);
    expect(ids).toContain(p2.localId);
  });

  it('removes a pending incident by localId from IndexedDB', async () => {
    const item = await enqueueIncident(samplePayload);
    let pending = await getPendingIncidents();
    expect(pending.length).toBe(1);

    await removePendingIncident(item.localId);
    pending = await getPendingIncidents();
    expect(pending.length).toBe(0);
  });

  it('flushes pending records on successful HTTP 201 and deletes them from IndexedDB', async () => {
    const queued = await enqueueIncident(samplePayload);

    // Mock fetch for POST /api/incidents
    const mockFetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ id: 'srv-server-uuid-12345' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await flushPendingIncidents();

    expect(result.syncedIncidents.length).toBe(1);
    expect(result.syncedIncidents[0].localId).toBe(queued.localId);
    expect(result.syncedIncidents[0].serverId).toBe('srv-server-uuid-12345');
    expect(result.failedCount).toBe(0);

    // Queue in IndexedDB should now be drained
    const remaining = await getPendingIncidents();
    expect(remaining.length).toBe(0);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/incidents',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      })
    );
  });

  it('retains records in IndexedDB if backend returns error during flush', async () => {
    const queued = await enqueueIncident(samplePayload);

    const mockFetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ error: 'Internal Server Error' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await flushPendingIncidents();

    expect(result.syncedIncidents.length).toBe(0);
    expect(result.failedCount).toBe(1);

    // Record must still persist in IndexedDB
    const remaining = await getPendingIncidents();
    expect(remaining.length).toBe(1);
    expect(remaining[0].localId).toBe(queued.localId);
  });
});
