'use client';

interface OfflineBannerProps {
  isServingCachedData: boolean;
  lastRefreshedAt: Date | null;
}

/**
 * Backs the "Offline-First Rescuer Mode" requirement: when a live fetch
 * fails, useIncidents falls back to the last cached list (idb) instead of
 * a blank error — this banner is the only thing telling the responder that
 * what's on screen might be stale, so they don't mistake it for live data.
 */
export function OfflineBanner({ isServingCachedData, lastRefreshedAt }: OfflineBannerProps) {
  if (!isServingCachedData) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-priority-pending/30 bg-priority-pendingBg px-4 py-2 text-sm text-ink-700 sm:px-6"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-priority-pending" aria-hidden="true" />
      Offline — showing incidents cached locally
      {lastRefreshedAt
        ? ` as of ${lastRefreshedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
        : ''}
      . Reconnect to see live updates.
    </div>
  );
}
