'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CriticalAlertBanner } from '@/components/dashboard/CriticalAlertBanner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { OfflineBanner } from '@/components/dashboard/OfflineBanner';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncidentFilters } from '@/components/incidents/IncidentFilters';
import { IncidentList } from '@/components/incidents/IncidentList';
import { SensorTelemetryPanel } from '@/components/dashboard/SensorTelemetryPanel';
import { GeofencePanel } from '@/components/map/GeofencePanel';
import { IncidentMapClient } from '@/components/map/IncidentMapClient';
import { MapLayerControls } from '@/components/map/MapLayerControls';
import type { GeofenceShape } from '@/components/map/IncidentMap';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IncidentListSkeleton, SummarySkeleton } from '@/components/ui/LoadingState';
import { useCriticalAlert } from '@/hooks/useCriticalAlert';
import { useHazardLayer } from '@/hooks/useHazardLayer';
import { useIncidents } from '@/hooks/useIncidents';
import { useIncidentStream } from '@/hooks/useIncidentStream';
import { useUnitPositions } from '@/hooks/useUnitPositions';
import { DEFAULT_FILTERS } from '@/lib/schema';
import type { IncidentFilters as IncidentFiltersState } from '@/lib/schema';

export default function DashboardPage() {
  const router = useRouter();
  const {
    incidents,
    isInitialLoading,
    isRefreshing,
    lastRefreshedAt,
    refreshError,
    isServingCachedData,
    refresh,
    applyIncidentUpdate,
  } = useIncidents();

  // Zero-latency stream (Phase 2): GET /api/events doesn't exist on the
  // backend yet (see hooks/useIncidentStream.ts), so this is a genuine
  // progressive enhancement — when it's unavailable, the 15s poll above
  // remains the sole source of truth and nothing here changes behavior.
  const streamStatus = useIncidentStream({ onIncident: applyIncidentUpdate });

  const criticalAlert = useCriticalAlert(incidents);
  const hazardLayer = useHazardLayer();
  const { positions: unitPositions } = useUnitPositions();

  const [filters, setFilters] = useState<IncidentFiltersState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showSensors, setShowSensors] = useState(false);
  const [showHazardZones, setShowHazardZones] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceShape, setGeofenceShape] = useState<GeofenceShape | null>(null);

  function handleSelect(id: string) {
    setSelectedId(id);
    router.push(`/incidents/${id}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <DashboardHeader
        lastRefreshedAt={lastRefreshedAt}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        streamStatus={streamStatus}
      />
      <OfflineBanner isServingCachedData={isServingCachedData} lastRefreshedAt={lastRefreshedAt} />
      <CriticalAlertBanner
        isActive={criticalAlert.isActive}
        incident={criticalAlert.latestIncident}
        onDismiss={criticalAlert.dismiss}
        onView={handleSelect}
      />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {isInitialLoading ? (
          <SummarySkeleton />
        ) : incidents ? (
          <SummaryCards incidents={incidents} />
        ) : null}

        {refreshError && incidents && !isServingCachedData ? (
          <p
            role="alert"
            className="rounded border border-priority-criticalBg bg-priority-criticalBg/40 px-3 py-2 text-sm text-priority-critical"
          >
            Latest refresh failed: {refreshError}. Showing the last data loaded successfully.
          </p>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <section className="flex flex-1 flex-col gap-4 lg:max-w-xl">
            <SensorTelemetryPanel
              sensors={hazardLayer.sensors}
              hazardZones={hazardLayer.hazardZones}
              hasLoaded={hazardLayer.hasLoaded}
              visible={showSensors || showHazardZones}
            />

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

          <section className="relative h-[420px] flex-1 lg:sticky lg:top-4 lg:h-[calc(100vh-220px)]">
            {incidents ? (
              <>
                <IncidentMapClient
                  incidents={incidents}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  sensors={hazardLayer.sensors}
                  hazardZones={hazardLayer.hazardZones}
                  unitPositions={unitPositions}
                  showSensors={showSensors}
                  showHazardZones={showHazardZones}
                  showUnits={showUnits}
                  geofenceEnabled={geofenceEnabled}
                  onGeofenceChange={setGeofenceShape}
                />
                <MapLayerControls
                  showSensors={showSensors}
                  onToggleSensors={() => setShowSensors((v) => !v)}
                  showHazardZones={showHazardZones}
                  onToggleHazardZones={() => setShowHazardZones((v) => !v)}
                  showUnits={showUnits}
                  onToggleUnits={() => setShowUnits((v) => !v)}
                  geofenceEnabled={geofenceEnabled}
                  onToggleGeofence={() => {
                    setGeofenceEnabled((v) => !v);
                    if (geofenceEnabled) setGeofenceShape(null);
                  }}
                />
                <GeofencePanel
                  shape={geofenceShape}
                  incidents={incidents}
                  onClear={() => setGeofenceShape(null)}
                  onBatchComplete={refresh}
                />
              </>
            ) : !isInitialLoading ? (
              <EmptyState title="Map unavailable" description="Incident data failed to load." />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
