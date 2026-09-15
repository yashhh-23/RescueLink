import { describe, it, expect } from 'vitest';
import { bedrockService } from '../src/services/bedrockService';
import { Incident } from '@rescue-link/schema';

describe('BedrockService AI Triage Unit Tests', () => {
  it('should generate CRITICAL priority and roof evacuation for flood with medical needs', async () => {
    const mockIncident: Incident = {
      id: 'test-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      priority: 'pending_triage',
      category: 'flood',
      description: 'Water rising in living room',
      peopleAffected: 6,
      urgentNeeds: ['medical', 'boat'],
      location: { lat: 37.77, lng: -122.41 },
    };

    const result = await bedrockService.triageIncident(mockIncident);

    expect(result.priority).toBe('critical');
    expect(result.triage.suggestedAction).toContain('URGENT');
    expect(result.triage.confidence).toBeGreaterThan(0.8);
    expect(result.triage.summary).toBeDefined();
    expect(result.triage.reasoning).toBeDefined();
  });

  it('should generate HIGH priority for landslide with food/water needs', async () => {
    const mockIncident: Incident = {
      id: 'test-2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      priority: 'pending_triage',
      category: 'landslide',
      description: 'Debris blocked main road',
      peopleAffected: 3,
      urgentNeeds: ['clean_water'],
      location: { lat: 37.78, lng: -122.4 },
    };

    const result = await bedrockService.triageIncident(mockIncident);

    expect(result.priority).toBe('high');
    expect(result.triage.suggestedAction).toContain('HIGH HAZARD');
  });

  it('should default to MEDIUM priority for minor incidents', async () => {
    const mockIncident: Incident = {
      id: 'test-3',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      priority: 'pending_triage',
      category: 'other',
      description: 'Power line down nearby',
      peopleAffected: 1,
      urgentNeeds: [],
      location: { lat: 37.75, lng: -122.42 },
    };

    const result = await bedrockService.triageIncident(mockIncident);

    expect(result.priority).toBe('medium');
    expect(result.triage.suggestedAction).toBeDefined();
  });
});
