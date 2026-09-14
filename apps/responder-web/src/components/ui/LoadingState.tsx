export function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-md border border-line bg-surface" />
      ))}
    </div>
  );
}

export function IncidentListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Loading incidents">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-md border border-line bg-surface" />
      ))}
    </div>
  );
}

export function MapPlaceholder() {
  return (
    <div
      className="flex h-full min-h-[320px] w-full animate-pulse items-center justify-center rounded-md border border-line bg-surface text-sm text-ink-300"
      role="status"
      aria-label="Loading map"
    >
      Loading map…
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading incident">
      <div className="h-8 w-1/3 animate-pulse rounded bg-line" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-md border border-line bg-surface" />
      ))}
    </div>
  );
}
