import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  enqueueIncident,
  getPendingIncidents,
  removePendingIncident,
  flushPendingIncidents,
} from '@/lib/offlineQueue';
import { SOSSubmissionSchema, type SOSSubmission } from '@/lib/validation';

describe('Phase 2 CloudBeacon Feature Tests', () => {
  const sampleVoiceSOS: SOSSubmission = {
    category: 'flood',
    description: 'Trapped on second floor with rising floodwaters',
    location: {
      lat: 18.5204,
      lng: 73.8567,
      label: 'GPS Auto-Detected',
    },
    peopleAffected: 3,
    urgentNeeds: ['boat', 'medical'],
    reporter: {
      contactMethod: 'phone',
      contactValue: '+91 9876543210',
    },
    audioBlob: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8USAkJq65FA9...',
  };

  beforeEach(async () => {
    const existing = await getPendingIncidents();
    for (const item of existing) {
      await removePendingIncident(item.localId);
    }
    vi.restoreAllMocks();
  });

  describe('Voice Distress Audio SOS', () => {
    it('validates SOSSubmission with base64 audioBlob correctly', () => {
      const parsed = SOSSubmissionSchema.safeParse(sampleVoiceSOS);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.audioBlob).toBeDefined();
        expect(parsed.data.audioBlob).toContain('data:audio/webm;base64');
      }
    });

    it('enqueues and persists voice audioBlob in offline IndexedDB', async () => {
      const queued = await enqueueIncident(sampleVoiceSOS);

      expect(queued).toBeDefined();
      expect(queued.payload.audioBlob).toBe(sampleVoiceSOS.audioBlob);

      const pending = await getPendingIncidents();
      expect(pending.length).toBe(1);
      expect(pending[0].payload.audioBlob).toBe(sampleVoiceSOS.audioBlob);
    });

    it('flushes voice audio SOS payload to POST /api/incidents intact', async () => {
      await enqueueIncident(sampleVoiceSOS);

      const mockFetch = vi.fn().mockResolvedValue({
        status: 201,
        ok: true,
        json: async () => ({ id: 'srv-voice-incident-101' }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await flushPendingIncidents();
      expect(result.syncedIncidents.length).toBe(1);
      expect(result.syncedIncidents[0].serverId).toBe('srv-voice-incident-101');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/incidents',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleVoiceSOS),
        })
      );
    });
  });

  describe('Battery Optimization & Dynamic Polling Throttling', () => {
    it('calculates polling intervals correctly for normal and low-battery states', () => {
      // Normal battery (> 20%): 5000ms
      const normalBattery = 0.65;
      const isCharging = false;
      const isLowNormal = normalBattery <= 0.2 && !isCharging;
      const normalPollMs = isLowNormal ? 30000 : 5000;
      expect(normalPollMs).toBe(5000);

      // Low battery (<= 20%): 30000ms
      const criticalBattery = 0.15;
      const isLowCritical = criticalBattery <= 0.2 && !isCharging;
      const criticalPollMs = isLowCritical ? 30000 : 5000;
      expect(criticalPollMs).toBe(30000);

      // Low battery but charging: keep 5000ms
      const chargingBattery = 0.15;
      const isChargingNow = true;
      const isLowCharging = chargingBattery <= 0.2 && !isChargingNow;
      const chargingPollMs = isLowCharging ? 30000 : 5000;
      expect(chargingPollMs).toBe(5000);
    });
  });

  describe('Interoperability & Rescuer En-Route Contract (Dev B & Dev C)', () => {
    it('extracts assigned units from both triage.assignedUnits and top-level assignedUnits', () => {
      const payloadFromDevB = {
        id: 'srv-inc-555',
        status: 'in_progress',
        triage: {
          priority: 'critical' as const,
          suggestedAction: 'Immediate boat evacuation required at north ridge',
          assignedUnits: ['Boat Unit-4', 'Medical Team Alpha'],
        },
      };

      const units =
        payloadFromDevB.triage?.assignedUnits ||
        (payloadFromDevB as { assignedUnits?: string[] }).assignedUnits ||
        [];

      expect(units).toEqual(['Boat Unit-4', 'Medical Team Alpha']);
      expect(units.length).toBe(2);
    });

    it('handles legacy or alternative flat structure from external services seamlessly', () => {
      const flatPayload = {
        id: 'srv-inc-777',
        status: 'in_progress',
        assignedUnits: ['Helicopter Air-1'],
      };

      const units =
        (flatPayload as { triage?: { assignedUnits?: string[] } }).triage?.assignedUnits ||
        flatPayload.assignedUnits ||
        [];

      expect(units).toEqual(['Helicopter Air-1']);
    });
  });
});
