'use client';

import { getCategory, CATEGORY_LABELS } from '@/lib/schema';
import type { IncidentResponse } from '@/lib/schema';

interface CriticalAlertBannerProps {
  isActive: boolean;
  incident: IncidentResponse | null;
  onDismiss: () => void;
  onView: (id: string) => void;
}

/**
 * A calm-but-unmissable strip, not a full-screen takeover — a responder is
 * mid-triage on other incidents when this fires and shouldn't lose that
 * context. The pulse respects prefers-reduced-motion globally (see
 * globals.css).
 */
export function CriticalAlertBanner({ isActive, incident, onDismiss, onView }: CriticalAlertBannerProps) {
  if (!isActive || !incident) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-danger/30 bg-danger-soft px-4 py-2 sm:px-6"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
      </span>
      <p className="flex-1 text-sm font-medium text-danger">
        New {incident.priority === 'critical' ? 'critical' : CATEGORY_LABELS[getCategory(incident)].toLowerCase()}{' '}
        incident: {incident.id}
      </p>
      <button
        type="button"
        onClick={() => onView(incident.id)}
        className="rounded border border-danger/30 bg-surface px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft"
      >
        View
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss alert"
        className="text-danger hover:text-danger-hover"
      >
        ×
      </button>
    </div>
  );
}
