import type { IncidentStatus } from '@/lib/schema';
import { STATUS_LABELS } from '@/lib/schema';

const STYLES: Record<IncidentStatus, string> = {
  new: 'bg-status-newBg text-status-new',
  acknowledged: 'bg-status-acknowledgedBg text-status-acknowledged',
  in_progress: 'bg-status-inProgressBg text-status-inProgress',
  resolved: 'bg-status-resolvedBg text-status-resolved',
  closed: 'bg-status-closedBg text-status-closed',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
