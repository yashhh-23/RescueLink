import { useMemo } from 'react';
import type { IncidentFilters as IncidentFiltersState, IncidentResponse } from '@/lib/schema';
import { filterIncidents, sortIncidents } from '@/lib/sortIncidents';
import { EmptyState } from '@/components/ui/EmptyState';
import { IncidentTableRow, IncidentCard } from './IncidentRow';

interface IncidentListProps {
  incidents: IncidentResponse[];
  filters: IncidentFiltersState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
}

export function IncidentList({ incidents, filters, selectedId, onSelect, onClearFilters }: IncidentListProps) {
  const visible = useMemo(
    () => sortIncidents(filterIncidents(incidents, filters)),
    [incidents, filters]
  );

  if (incidents.length === 0) {
    return <EmptyState title="No incidents" description="There are currently no incidents to display." />;
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        title="No matching incidents"
        description="Try clearing or changing your filters."
        action={{ label: 'Clear filters', onClick: onClearFilters }}
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-line bg-surface md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-canvas text-xs font-medium text-ink-500">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((incident) => (
              <IncidentTableRow
                key={incident.id}
                incident={incident}
                isSelected={incident.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {visible.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            isSelected={incident.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}
