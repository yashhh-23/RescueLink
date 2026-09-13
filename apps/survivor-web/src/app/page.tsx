'use client';

import React, { useState, useCallback } from 'react';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { SOSForm } from '@/components/SOSForm';
import { IncidentStatus } from '@/components/IncidentStatus';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import type { IncidentCategory, SOSSubmission } from '@/lib/validation';

interface ActiveIncidentState {
  id: string;
  category: IncidentCategory;
  payload: SOSSubmission;
  isLocal: boolean;
}

export default function SurvivorWebPage() {
  const [activeIncident, setActiveIncident] = useState<ActiveIncidentState | null>(null);

  // Sync callback: If a pending local report is synced, upgrade its ID to the server UUID
  const handleIncidentSynced = useCallback(
    ({ localId, serverId }: { localId: string; serverId: string }) => {
      setActiveIncident((current) => {
        if (current && current.isLocal && current.id === localId) {
          return {
            ...current,
            id: serverId,
            isLocal: false,
          };
        }
        return current;
      });
    },
    []
  );

  const { isOnline, pendingCount, isSyncing, syncNow, refreshPendingCount } =
    useSyncQueue(handleIncidentSynced);

  const handleSubmitted = (submission: {
    id: string;
    category: IncidentCategory;
    payload: SOSSubmission;
    isLocal: boolean;
  }) => {
    setActiveIncident(submission);
    refreshPendingCount();
  };

  const handleReset = () => {
    setActiveIncident(null);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* High-contrast Offline / Mesh Connectivity Banner */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSyncNow={syncNow}
      />

      <div style={{ flex: 1, padding: '16px 8px' }}>
        {activeIncident ? (
          <IncidentStatus
            incidentId={activeIncident.id}
            category={activeIncident.category}
            isLocal={activeIncident.isLocal}
            onReset={handleReset}
          />
        ) : (
          <SOSForm
            isOnline={isOnline}
            onSubmitted={handleSubmitted}
            onQueueUpdated={refreshPendingCount}
          />
        )}
      </div>
    </main>
  );
}
