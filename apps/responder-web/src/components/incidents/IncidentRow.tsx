import type { IncidentResponse } from '@/lib/schema';
import { CATEGORY_LABELS } from '@/lib/schema';
import { formatLocation, formatTimestamp, hasAssignedUnits } from '@/lib/format';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface IncidentRowProps {
  incident: IncidentResponse;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function IncidentTableRow({ incident, isSelected, onSelect }: IncidentRowProps) {
  const units = incident.triage?.assignedUnits;

  return (
    <tr
      onClick={() => onSelect(incident.id)}
      aria-selected={isSelected}
      className={`cursor-pointer border-b border-line last:border-0 hover:bg-canvas ${
        isSelected ? 'bg-action-soft' : ''
      }`}
    >
      <td className="px-3 py-2 font-mono text-xs text-ink-500">{incident.id}</td>
      <td className="px-3 py-2 text-sm text-ink-900">{CATEGORY_LABELS[incident.category]}</td>
      <td className="px-3 py-2">
        <PriorityBadge priority={incident.priority} />
      </td>
      <td className="px-3 py-2 text-sm text-ink-700">{formatLocation(incident.location)}</td>
      <td className="px-3 py-2 font-mono text-xs text-ink-500">{formatTimestamp(incident.createdAt)}</td>
      <td className="px-3 py-2">
        <StatusBadge status={incident.status} />
      </td>
      <td className="px-3 py-2 text-sm text-ink-700">
        {hasAssignedUnits(units) ? units!.join(', ') : <span className="text-ink-300">Unassigned</span>}
      </td>
    </tr>
  );
}

export function IncidentCard({ incident, isSelected, onSelect }: IncidentRowProps) {
  const units = incident.triage?.assignedUnits;

  return (
    <button
      type="button"
      onClick={() => onSelect(incident.id)}
      aria-pressed={isSelected}
      className={`flex w-full flex-col gap-2 rounded-md border px-3 py-3 text-left ${
        isSelected ? 'border-action bg-action-soft' : 'border-line bg-surface'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-ink-500">{incident.id}</span>
        <PriorityBadge priority={incident.priority} />
      </div>
      <p className="text-sm font-medium text-ink-900">{CATEGORY_LABELS[incident.category]}</p>
      <p className="text-sm text-ink-700">{formatLocation(incident.location)}</p>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={incident.status} />
        <span className="text-xs text-ink-500">
          {hasAssignedUnits(units) ? units!.join(', ') : 'Unassigned'}
        </span>
      </div>
      <span className="font-mono text-xs text-ink-300">{formatTimestamp(incident.createdAt)}</span>
    </button>
  );
}
