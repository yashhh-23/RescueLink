import type { IncidentFilters, IncidentResponse, Priority } from '@/lib/schema';
import { PRIORITY_ORDER } from '@/lib/schema';

const priorityRank: Record<string, number> = Object.fromEntries(
  PRIORITY_ORDER.map((priority, index) => [priority, index])
);

function rankOf(priority: Priority): number {
  return priorityRank[priority] ?? PRIORITY_ORDER.length;
}

function toTimestamp(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const time = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function filterIncidents(
  incidents: IncidentResponse[],
  filters: IncidentFilters
): IncidentResponse[] {
  return incidents.filter((incident) => {
    if (filters.status !== 'all' && incident.status !== filters.status) return false;
    if (filters.priority !== 'all' && incident.priority !== filters.priority) return false;
    if (filters.category !== 'all' && incident.details?.category !== filters.category) return false;
    return true;
  });
}

/**
 * Highest priority first (critical → pending_triage), then most recently
 * updated first within the same priority.
 */
export function sortIncidents(incidents: IncidentResponse[]): IncidentResponse[] {
  return [...incidents].sort((a, b) => {
    const priorityDiff = rankOf(a.priority) - rankOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return toTimestamp(b.updatedAt ?? b.createdAt) - toTimestamp(a.updatedAt ?? a.createdAt);
  });
}
