'use client';

import { useState } from 'react';
import { ApiError, acknowledgeIncident, updateIncident } from '@/lib/api';
import { NEXT_ACTION } from '@/lib/schema';
import type { IncidentResponse } from '@/lib/schema';

interface IncidentActionsProps {
  incident: IncidentResponse;
  onUpdated: (incident: IncidentResponse) => void;
}

export function IncidentActions({ incident, onUpdated }: IncidentActionsProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = NEXT_ACTION[incident.status];

  if (!action) {
    return (
      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink-900">Response actions</h2>
        <p className="mt-2 text-sm text-ink-500">This incident has been resolved.</p>
      </section>
    );
  }

  async function handleClick() {
    setIsPending(true);
    setError(null);
    try {
      // "Acknowledge" (new -> acknowledged) goes through the dedicated
      // POST /:id/acknowledge endpoint, which apps/api uses to let a
      // dispatcher claim ownership (assignedTo) in the same call. Every
      // later transition is a plain status PATCH.
      const updated =
        incident.status === 'new'
          ? await acknowledgeIncident(incident.id)
          : await updateIncident(incident.id, { status: action!.next });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update this incident.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink-900">Response actions</h2>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="rounded bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Updating…' : action.label}
        </button>
        {error ? (
          <p role="alert" className="text-sm text-priority-critical">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
