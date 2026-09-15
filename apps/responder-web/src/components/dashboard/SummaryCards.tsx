import type { IncidentResponse } from '@/lib/schema';
import { hasAssignedUnits } from '@/lib/format';

interface SummaryCardsProps {
  incidents: IncidentResponse[];
}

const ACTIVE_STATUSES = new Set(['new', 'acknowledged', 'in_progress']);

export function SummaryCards({ incidents }: SummaryCardsProps) {
  const critical = incidents.filter((i) => i.priority === 'critical').length;
  const high = incidents.filter((i) => i.priority === 'high').length;
  const pendingTriage = incidents.filter((i) => i.priority === 'pending_triage').length;
  const active = incidents.filter((i) => ACTIVE_STATUSES.has(i.status)).length;
  const unassigned = incidents.filter(
    (i) => ACTIVE_STATUSES.has(i.status) && !hasAssignedUnits((i.assignedTo ? [i.assignedTo] : undefined))
  ).length;

  const metrics = [
    { label: 'Critical', value: critical, accent: 'text-priority-critical' },
    { label: 'High', value: high, accent: 'text-priority-high' },
    { label: 'Pending Triage', value: pendingTriage, accent: 'text-priority-pending' },
    { label: 'Active', value: active, accent: 'text-action' },
    { label: 'Unassigned', value: unassigned, accent: 'text-ink-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-line bg-surface px-4 py-3 shadow-panel">
          <p className="text-xs font-medium text-ink-500">{metric.label}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${metric.accent}`}>{metric.value}</p>
        </div>
      ))}
    </div>
  );
}
