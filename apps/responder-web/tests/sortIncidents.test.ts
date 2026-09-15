import { describe, expect, it } from 'vitest';
import { filterIncidents, sortIncidents } from '@/lib/sortIncidents';
import { formatLocation, hasAssignedUnits } from '@/lib/format';
import type { IncidentResponse } from '@/lib/schema';

function makeIncident(overrides: Partial<IncidentResponse>): IncidentResponse {
  const base: IncidentResponse = {
    id: 'test-id',
    createdAt: 1,
    updatedAt: 1,
    status: 'new',
    priority: 'pending_triage',
    location: {
      lat: 13.0827,
      lng: 80.2707,
      label: 'Test Location'
    },
    category: 'flood',
    description: 'test incident',
    peopleAffected: 1,
    urgentNeeds: [],
    contactMethod: 'none'
  };

  return {
    ...base,
    ...overrides,
    category: overrides.category ?? base.category,
    description: overrides.description ?? base.description,
    peopleAffected: overrides.peopleAffected ?? base.peopleAffected,
    urgentNeeds: overrides.urgentNeeds ?? base.urgentNeeds
  };
}
describe('filterIncidents', () => {
  it('returns all incidents when filters are "all"', () => {
    const incidents = [makeIncident({ id: 'a' }), makeIncident({ id: 'b' })];
    expect(filterIncidents(incidents, { status: 'all', priority: 'all', category: 'all' })).toHaveLength(2);
  });

  it('filters by status, priority, and category independently', () => {
    const incidents = [
      makeIncident({ id: 'a', status: 'new', priority: 'critical', details: { category: 'flood', description: 'Test incident', peopleAffected: 1, urgentNeeds: [] } }),
      makeIncident({ id: 'b', status: 'resolved', priority: 'low', details: { category: 'fire', description: 'Test incident', peopleAffected: 1, urgentNeeds: [] } }),
    ];

    expect(filterIncidents(incidents, { status: 'new', priority: 'all', category: 'all' })).toEqual([
      incidents[0],
    ]);
    expect(filterIncidents(incidents, { status: 'all', priority: 'low', category: 'all' })).toEqual([
      incidents[1],
    ]);
    expect(filterIncidents(incidents, { status: 'all', priority: 'all', category: 'fire' })).toEqual([
      incidents[1],
    ]);
  });
});

describe('sortIncidents', () => {
  it('orders by priority first: critical before pending_triage', () => {
    const incidents = [
      makeIncident({ id: 'low', priority: 'low' }),
      makeIncident({ id: 'critical', priority: 'critical' }),
      makeIncident({ id: 'pending', priority: 'pending_triage' }),
    ];

    const sorted = sortIncidents(incidents);
    expect(sorted.map((i) => i.id)).toEqual(['critical', 'low', 'pending']);
  });

  it('breaks ties within the same priority by most recently updated first', () => {
    const incidents = [
      makeIncident({ id: 'older', priority: 'high', updatedAt: new Date('2026-01-01T00:00:00.000Z').getTime() }),
      makeIncident({ id: 'newer', priority: 'high', updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime() }),
    ];

    const sorted = sortIncidents(incidents);
    expect(sorted.map((i) => i.id)).toEqual(['newer', 'older']);
  });
});

describe('formatLocation', () => {
  it('prefers the label when present', () => {
    expect(formatLocation({ lat: 1, lng: 2, label: 'Downtown' })).toBe('Downtown');
  });

  it('falls back to coordinates when no label exists', () => {
    expect(formatLocation({ lat: 37.7749, lng: -122.4194 })).toBe('37.7749, -122.4194');
  });
});

describe('hasAssignedUnits', () => {
  it('is false for undefined or empty arrays', () => {
    expect(hasAssignedUnits(undefined)).toBe(false);
    expect(hasAssignedUnits([])).toBe(false);
  });

  it('is true when at least one unit is present', () => {
    expect(hasAssignedUnits(['Unit 4'])).toBe(true);
  });
});
