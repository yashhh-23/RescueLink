import type { Location } from '@/lib/schema';

export function formatTimestamp(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Unknown';

  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatLocation(location: Location): string {
  if (location.label) return location.label;
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

export function hasAssignedUnits(units: string[] | undefined): boolean {
  return Boolean(units && units.length > 0);
}
