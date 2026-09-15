import { describe, it, expect } from 'vitest';
import { notificationService } from '../src/services/notificationService';
import { Incident } from '@rescue-link/schema';

describe('NotificationService Unit Tests', () => {
  it('should trigger alert for CRITICAL incidents in mock mode when offline', async () => {
    const mockCritical: Incident = {
      id: 'test-critical-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      priority: 'critical',
      category: 'flood',
      description: 'Trapped on roof with water rising fast',
      peopleAffected: 5,
      urgentNeeds: ['medical', 'boat'],
      location: { lat: 37.77, lng: -122.41 },
      reporter: { contactMethod: 'phone', contactValue: '+15550199' },
      triage: { suggestedAction: 'URGENT: Move to roof level.' },
    };

    const res = await notificationService.sendCriticalAlert(mockCritical);

    expect(res.snsSent).toBe(true);
    expect(res.sesSent).toBe(true);
    expect(res.mode).toBe('mock');
    expect(res.message).toContain('Local Mock Notification Engine');
  });

  it('should skip alert for LOW priority incidents', async () => {
    const mockLow: Incident = {
      id: 'test-low-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      priority: 'low',
      category: 'other',
      description: 'Requesting general information',
      peopleAffected: 1,
      urgentNeeds: [],
      location: { lat: 37.75, lng: -122.42 },
    };

    const res = await notificationService.sendCriticalAlert(mockLow);

    expect(res.snsSent).toBe(false);
    expect(res.sesSent).toBe(false);
    expect(res.message).toContain('does not require critical notifications');
  });
});
