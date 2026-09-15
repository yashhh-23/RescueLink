export {
  IncidentStatusEnum,
  PriorityEnum,
  IncidentCategoryEnum,
  UrgentNeedEnum,
  ContactMethodEnum,
  LocationSchema,
  ReporterSchema,
  IncidentDetailsSchema,
  IncidentTriageSchema,
  IncidentSchema,
} from '@rescue-link/schema';

export type {
  IncidentStatus,
  Priority,
  IncidentCategory,
  UrgentNeed,
  ContactMethod,
  Location,
  Reporter,
  IncidentDetails,
  IncidentTriage,
  Incident,
} from '@rescue-link/schema';

// Local alias so existing responder-web code (written before this package
// was wired up as a real workspace dependency) doesn't need a mass rename.
// `Incident` from `@rescue-link/schema` is the real, authoritative shape —
// this file just re-exports it plus responder-only derived constants below.
import type { Incident, IncidentStatus, Priority, IncidentCategory, UrgentNeed } from '@rescue-link/schema';
export type IncidentResponse = Incident;

// --- Responder-web specific derived types (not part of the shared contract) ---

export const STATUS_ORDER: IncidentStatus[] = [
  'new',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
];

export const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low', 'pending_triage'];

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  pending_triage: 'Pending Triage',
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  flood: 'Flood',
  landslide: 'Landslide',
  fire: 'Fire',
  other: 'Other',
};

export const URGENT_NEED_LABELS: Record<UrgentNeed, string> = {
  medical: 'Medical',
  boat: 'Boat',
  food: 'Food',
  clean_water: 'Clean Water',
  infant_care: 'Infant Care',
};

/**
 * The real Incident type (from @rescue-link/schema) carries category,
 * description, peopleAffected and urgentNeeds both flat on the incident AND
 * nested under `details` — apps/api's create route dual-writes both for
 * survivor-web/responder-web compatibility. These helpers always read the
 * flat fields (guaranteed present at creation time) and fall back to
 * `details` only if a future backend build stops dual-writing.
 */
export function getCategory(incident: Incident): IncidentCategory {
  return incident.details?.category ?? 'other';
}
export function getDescription(incident: Incident): string {
  return incident.details?.description ?? '';
}
export function getPeopleAffected(incident: Incident): number {
  return incident.details?.peopleAffected ?? 0;
}
export function getUrgentNeeds(incident: Incident): UrgentNeed[] {
  return incident.details?.urgentNeeds ?? [];
}

export interface IncidentFilters {
  status: IncidentStatus | 'all';
  priority: Priority | 'all';
  category: IncidentCategory | 'all';
}

export const DEFAULT_FILTERS: IncidentFilters = {
  status: 'all',
  priority: 'all',
  category: 'all',
};

/**
 * Acknowledge / Start Rescue / Resolve — the three actions from the task
 * list. "resolved" is terminal in the UI even though the schema also allows
 * "closed"; no product requirement has defined what triggers closure yet.
 */
export const NEXT_ACTION: Partial<Record<IncidentStatus, { label: string; next: IncidentStatus }>> = {
  new: { label: 'Acknowledge', next: 'acknowledged' },
  acknowledged: { label: 'Start Rescue', next: 'in_progress' },
  in_progress: { label: 'Resolve', next: 'resolved' },
};

// --- Phase 2 additions ---

/**
 * Assumed contract: GET /api/sensors. Not yet implemented by apps/api —
 * see README "Phase 2 assumptions". Shaped to match the brief's example
 * ("River Sensor #4: Critical Level (92% flood threshold)").
 */
export interface SensorReading {
  id: string;
  label: string;
  kind: 'water_level' | 'seismic' | 'weather' | 'fire_perimeter';
  location: { lat: number; lng: number };
  value: number;
  unit: string;
  thresholdPercent: number; // 0-100, how close to critical
  status: 'normal' | 'watch' | 'critical';
  updatedAt: number;
}

/** Assumed contract: GET /api/hazard-zones. Same caveat as SensorReading. */
export interface HazardZone {
  id: string;
  label: string;
  kind: 'flood' | 'fire' | 'landslide';
  severity: 'watch' | 'warning' | 'critical';
  center: { lat: number; lng: number };
  radiusMeters: number;
}

/**
 * Locally-reported field unit position. There is no GPS telemetry pipeline
 * in the current backend — see README. Persisted client-side only (idb),
 * keyed by unit callsign, so a dispatcher can manually record "last known
 * position" for tactical awareness until real telemetry exists.
 */
export interface UnitPosition {
  unitName: string;
  lat: number;
  lng: number;
  reportedAt: number;
}

/** A pending broadcast that couldn't be delivered because the backend
 * doesn't yet expose POST /api/incidents/:id/broadcast. Kept in an outbox
 * (idb) so nothing is silently lost and it can be retried/audited later. */
export interface PendingBroadcast {
  id: string;
  incidentId: string;
  message: string;
  recipientMethod: string;
  recipientValue: string;
  queuedAt: number;
  status: 'pending' | 'sent' | 'failed';
}
