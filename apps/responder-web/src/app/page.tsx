'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncidentFilters } from '@/components/incidents/IncidentFilters';
import { IncidentList } from '@/components/incidents/IncidentList';
import { IncidentMapClient } from '@/components/map/IncidentMapClient';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IncidentListSkeleton, SummarySkeleton } from '@/components/ui/LoadingState';
import { useIncidents } from '@/hooks/useIncidents';
import { DEFAULT_FILTERS } from '@/lib/schema';
import type { IncidentFilters as IncidentFiltersState } from '@/lib/schema';

export default function DashboardPage() {
  const router = useRouter();
  const { incidents, isInitialLoading, isRefreshing, lastRefreshedAt, refreshError, refresh } =
    useIncidents();
  const [filters, setFilters] = useState<IncidentFiltersState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(id: string) {
    setSelectedId(id);
    router.push(`/incidents/${id}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <DashboardHeader lastRefreshedAt={lastRefreshedAt} isRefreshing={isRefreshing} onRefresh={refresh} />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {isInitialLoading ? (
          <SummarySkeleton />
        ) : incidents ? (
          <SummaryCards incidents={incidents} />
        ) : null}

        {refreshError && incidents ? (
          <p
            role="alert"
            className="rounded border border-priority-criticalBg bg-priority-criticalBg/40 px-3 py-2 text-sm text-priority-critical"
          >
            Latest refresh failed: {refreshError}. Showing the last data loaded successfully.
          </p>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <section className="flex flex-1 flex-col gap-4 lg:max-w-xl">
            <IncidentFilters filters={filters} onChange={setFilters} />

            {isInitialLoading ? (
              <IncidentListSkeleton />
            ) : incidents === null ? (
              <ErrorState message={refreshError ?? undefined} onRetry={refresh} />
            ) : (
              <IncidentList
                incidents={incidents}
                filters={filters}
                selectedId={selectedId}
                onSelect={handleSelect}
                onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              />
            )}
          </section>

          <section className="h-[420px] flex-1 lg:sticky lg:top-4 lg:h-[calc(100vh-220px)]">
            {incidents ? (
              <IncidentMapClient incidents={incidents} selectedId={selectedId} onSelect={handleSelect} />
            ) : !isInitialLoading ? (
              <EmptyState title="Map unavailable" description="Incident data failed to load." />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
