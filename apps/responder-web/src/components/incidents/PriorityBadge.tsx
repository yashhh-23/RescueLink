import type { Priority } from '@/lib/schema';
import { PRIORITY_LABELS } from '@/lib/schema';

const STYLES: Record<Priority, string> = {
  critical: 'bg-priority-criticalBg text-priority-critical',
  high: 'bg-priority-highBg text-priority-high',
  medium: 'bg-priority-mediumBg text-priority-medium',
  low: 'bg-priority-lowBg text-priority-low',
  pending_triage: 'bg-priority-pendingBg text-priority-pending',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${STYLES[priority]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
