'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AssignmentControl } from '@/components/incidents/AssignmentControl';
import { BroadcastAction } from '@/components/incidents/BroadcastAction';
import { IncidentActions } from '@/components/incidents/IncidentActions';
import { PriorityBadge } from '@/components/incidents/PriorityBadge';
import { StatusBadge } from '@/components/incidents/StatusBadge';
import { TriageCard } from '@/components/incidents/TriageCard';
import { UnitPositionPanel } from '@/components/incidents/UnitPositionPanel';
import { DetailSkeleton } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useIncident } from '@/hooks/useIncident';
import { formatLocation, formatTimestamp } from '@/lib/format';
import { CATEGORY_LABELS, URGENT_NEED_LABELS, getCategory, getDescription, getPeopleAffected, getUrgentNeeds } from '@/lib/schema';

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { incident, isLoading, error, notFound, refresh, setIncident } = useIncident(id);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-medium text-action hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        {isLoading ? (
          <DetailSkeleton />
        ) : notFound ? (
          <ErrorState message={`Incident ${id} could not be found.`} onRetry={refresh} />
        ) : error || !incident ? (
          <ErrorState message={error ?? undefined} onRetry={refresh} />
        ) : (
          <div className="space-y-4">
            <section className="rounded-md border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="font-mono text-lg font-semibold text-ink-900">{incident.id}</h1>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={incident.priority} />
                  <StatusBadge status={incident.status} />
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium text-ink-500">Category</dt>
                  <dd className="text-ink-900">{CATEGORY_LABELS[getCategory(incident)]}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-500">Created</dt>
                  <dd className="font-mono text-ink-900">{formatTimestamp(incident.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-500">Updated</dt>
                  <dd className="font-mono text-ink-900">{formatTimestamp(incident.updatedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink-900">Location</h2>
              <p className="mt-2 text-sm text-ink-700">{formatLocation(incident.location)}</p>
              <p className="mt-1 font-mono text-xs text-ink-500">
                {incident.location.lat}, {incident.location.lng}
              </p>
            </section>

            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink-900">Incident details</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{getDescription(incident)}</p>
            </section>

            {incident.audioBlob && (
              <section className="rounded-md border border-red-500/40 bg-red-950/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  </span>
                  <h2 className="text-sm font-semibold text-red-200">Survivor Voice Distress Dispatch</h2>
                </div>
                <p className="mt-1 text-xs text-ink-500">Spoken audio dispatch captured from survivor device:</p>
                <audio src={incident.audioBlob} controls className="mt-3 w-full" />
              </section>
            )}

            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink-900">People and urgent needs</h2>
              <dl className="mt-2 space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-ink-500">People affected</dt>
                  <dd className="text-ink-900">{getPeopleAffected(incident)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-500">Urgent needs</dt>
                  <dd className="text-ink-900">
                    {getUrgentNeeds(incident).length > 0
                      ? getUrgentNeeds(incident).map((need) => URGENT_NEED_LABELS[need]).join(', ')
                      : 'None reported'}
                  </dd>
                </div>
              </dl>
            </section>

            <TriageCard triage={incident.triage} />

            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink-900">Reporter</h2>
              {incident.reporter?.contactValue && incident.reporter.contactMethod !== 'none' ? (
                <p className="mt-2 text-sm text-ink-700">
                  {incident.reporter.contactMethod}: {incident.reporter.contactValue}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-500">No reporter contact provided.</p>
              )}
            </section>

            <AssignmentControl incident={incident} onUpdated={setIncident} />
            <UnitPositionPanel incident={incident} />
            <BroadcastAction incident={incident} />
            <IncidentActions incident={incident} onUpdated={setIncident} />
          </div>
        )}
      </main>
    </div>
  );
}
