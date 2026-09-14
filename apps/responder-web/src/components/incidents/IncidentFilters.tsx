import {
  CATEGORY_LABELS,
  IncidentCategoryEnum,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from '@/lib/schema';
import type { IncidentFilters as IncidentFiltersState } from '@/lib/schema';

interface IncidentFiltersProps {
  filters: IncidentFiltersState;
  onChange: (filters: IncidentFiltersState) => void;
}

const selectClasses =
  'rounded border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-700 focus:border-action focus:outline-none focus:ring-1 focus:ring-action';

export function IncidentFilters({ filters, onChange }: IncidentFiltersProps) {
  const isFiltered = filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-500">
        Status
        <select
          className={selectClasses}
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as IncidentFiltersState['status'] })}
        >
          <option value="all">All</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-500">
        Priority
        <select
          className={selectClasses}
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value as IncidentFiltersState['priority'] })}
        >
          <option value="all">All</option>
          {PRIORITY_ORDER.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-500">
        Category
        <select
          className={selectClasses}
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value as IncidentFiltersState['category'] })}
        >
          <option value="all">All</option>
          {IncidentCategoryEnum.options.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>

      {isFiltered ? (
        <button
          type="button"
          onClick={() => onChange({ status: 'all', priority: 'all', category: 'all' })}
          className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
