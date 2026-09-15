'use client';

import type { StreamStatus } from '@/hooks/useIncidentStream';

interface DashboardHeaderProps {
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  streamStatus?: StreamStatus;
}

const STREAM_LABEL: Record<StreamStatus, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  unavailable: 'Polling (15s)',
};

const STREAM_DOT: Record<StreamStatus, string> = {
  connecting: 'bg-priority-pending',
  live: 'bg-success',
  unavailable: 'bg-priority-pending',
};

export function DashboardHeader({ lastRefreshedAt, isRefreshing, onRefresh, streamStatus }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-action text-sm font-bold text-white">
          RL
        </div>
        <div>
          <h1 className="text-sm font-semibold text-ink-900">Rescue-Link Responder Dashboard</h1>
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-status-resolved" aria-hidden="true" />
            Operational
            {streamStatus ? (
              <>
                <span aria-hidden="true">·</span>
                <span className={`h-1.5 w-1.5 rounded-full ${STREAM_DOT[streamStatus]}`} aria-hidden="true" />
                {STREAM_LABEL[streamStatus]}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-500">
        <span aria-live="polite">
          {lastRefreshedAt
            ? `Last refreshed ${lastRefreshedAt.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}`
            : 'Not yet refreshed'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded border border-line px-3 py-1.5 font-medium text-ink-700 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}
