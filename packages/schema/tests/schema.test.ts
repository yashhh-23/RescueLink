import { describe, it, expect } from 'vitest';
import {
  SOSSubmissionSchema,
  IncidentStatusEnum,
  PriorityEnum,
  LocationSchema,
} from '../src';

describe('packages/schema unit tests', () => {
  it('validates a correct SOS submission payload', () => {
    const valid = {
      category: 'flood',
      description: 'Water rising',
      location: { lat: 10.5, lng: 20.5 },
      peopleAffected: 4,
      urgentNeeds: ['medical'],
    };

    const result = SOSSubmissionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid location coordinates', () => {
    const invalid = {
      lat: 100, // Invalid latitude > 90
      lng: 0,
    };

    const result = LocationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates status enums correctly', () => {
    expect(IncidentStatusEnum.safeParse('new').success).toBe(true);
    expect(IncidentStatusEnum.safeParse('acknowledged').success).toBe(true);
    expect(IncidentStatusEnum.safeParse('in_progress').success).toBe(true);
    expect(IncidentStatusEnum.safeParse('resolved').success).toBe(true);
    expect(IncidentStatusEnum.safeParse('invalid_status').success).toBe(false);
  });

  it('validates priority enums correctly', () => {
    expect(PriorityEnum.safeParse('critical').success).toBe(true);
    expect(PriorityEnum.safeParse('pending_triage').success).toBe(true);
    expect(PriorityEnum.safeParse('super_high').success).toBe(false);
  });
});
