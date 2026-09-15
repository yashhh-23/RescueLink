'use client';

import { useState } from 'react';
import { ApiError, updateIncident } from '@/lib/api';
import type { IncidentResponse } from '@/lib/schema';
import { hasAssignedUnits } from '@/lib/format';

interface AssignmentControlProps {
  incident: IncidentResponse;
  onUpdated: (incident: IncidentResponse) => void;
}

export function AssignmentControl({ incident, onUpdated }: AssignmentControlProps) {
  const [draft, setDraft] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const units = (incident.assignedTo ? [incident.assignedTo] : []);

  async function persist(nextUnits: string[]) {
    setIsPending(true);
    setError(null);
    try {
      const updated = await updateIncident(incident.id, { triage: { assignedUnits: nextUnits } });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update assignment.');
    } finally {
      setIsPending(false);
    }
  }

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed || units.includes(trimmed)) return;
    setDraft('');
    persist([...units, trimmed]);
  }

  function handleRemove(unit: string) {
    persist(units.filter((u) => u !== unit));
  }

  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink-900">Assigned units</h2>

      {hasAssignedUnits(units) ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {units.map((unit) => (
            <li
              key={unit}
              className="flex items-center gap-1.5 rounded-full bg-action-soft px-3 py-1 text-sm text-action"
            >
              {unit}
              <button
                type="button"
                onClick={() => handleRemove(unit)}
                disabled={isPending}
                aria-label={`Remove ${unit}`}
                className="text-action hover:text-action-hover disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-500">No units assigned yet.</p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="unitName">
          Unit name
        </label>
        <input
          id="unitName"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="e.g. Rescue Unit 4"
          className="w-full rounded border border-line px-3 py-1.5 text-sm focus:border-action focus:outline-none focus:ring-1 focus:ring-action sm:max-w-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !draft.trim()}
          className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Assign'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-priority-critical">
          {error}
        </p>
      ) : null}
    </section>
  );
}
