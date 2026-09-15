import type { IncidentTriage } from '@/lib/schema';

export function TriageCard({ triage }: { triage: IncidentTriage | undefined }) {
  const hasTriage =
    triage && (triage.suggestedAction || triage.notes || triage.summary || triage.reasoning);

  if (!hasTriage) {
    return (
      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink-900">AI triage</h2>
        <p className="mt-2 text-sm text-ink-500">Triage pending.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">AI triage</h2>
        {typeof triage.confidence === 'number' ? (
          <span className="text-xs text-ink-500">{Math.round(triage.confidence * 100)}% confidence</span>
        ) : null}
      </div>
      <div className="mt-3 space-y-3">
        {triage.summary ? (
          <div>
            <p className="text-xs font-medium text-ink-500">Summary</p>
            <p className="text-sm text-ink-900">{triage.summary}</p>
          </div>
        ) : null}
        {triage.suggestedAction ? (
          <div>
            <p className="text-xs font-medium text-ink-500">Suggested action</p>
            <p className="text-sm text-ink-900">{triage.suggestedAction}</p>
          </div>
        ) : null}
        {triage.reasoning ? (
          <div>
            <p className="text-xs font-medium text-ink-500">Reasoning</p>
            <p className="text-sm text-ink-700">{triage.reasoning}</p>
          </div>
        ) : null}
        {triage.notes ? (
          <div>
            <p className="text-xs font-medium text-ink-500">Notes</p>
            <p className="text-sm text-ink-700">{triage.notes}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
