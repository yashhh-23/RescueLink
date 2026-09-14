import { z } from 'zod';

/**
 * Mirrors apps/survivor-web/src/lib/validation.ts, which is itself intended
 * to be 1:1 with packages/schema (not yet a linked workspace package). Once
 * @rescue-link/schema exists, delete this file and import from there instead
 * — do not let these two copies drift.
 */

export const IncidentCategoryEnum = z.enum(['flood', 'landslide', 'fire', 'other']);
export type IncidentCategory = z.infer<typeof IncidentCategoryEnum>;

export const PriorityEnum = z.enum(['critical', 'high', 'medium', 'low', 'pending_triage']);
export type Priority = z.infer<typeof PriorityEnum>;

export const IncidentStatusEnum = z.enum(['new', 'acknowledged', 'in_progress', 'resolved']);
export type IncidentStatus = z.infer<typeof IncidentStatusEnum>;

export const UrgentNeedEnum = z.enum(['medical', 'boat', 'food', 'clean_water', 'infant_care']);
export type UrgentNeed = z.infer<typeof UrgentNeedEnum>;

export const ContactMethodEnum = z.enum(['email', 'phone', 'none']);
export type ContactMethod = z.infer<typeof ContactMethodEnum>;

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const ReporterSchema = z.object({
  contactMethod: ContactMethodEnum.optional().default('none'),
  contactValue: z.string().optional(),
});
export type Reporter = z.infer<typeof ReporterSchema>;

export const IncidentTriageSchema = z.object({
  suggestedAction: z.string().optional(),
  confidence: z.number().optional(),
  assignedUnits: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type IncidentTriage = z.infer<typeof IncidentTriageSchema>;

export const IncidentResponseSchema = z.object({
  id: z.string(),
  category: IncidentCategoryEnum,
  description: z.string(),
  location: LocationSchema,
  peopleAffected: z.number(),
  urgentNeeds: z.array(UrgentNeedEnum),
  reporter: ReporterSchema.optional(),
  status: IncidentStatusEnum,
  priority: PriorityEnum,
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]).optional(),
  triage: IncidentTriageSchema.optional(),
});
export type IncidentResponse = z.infer<typeof IncidentResponseSchema>;

// --- Responder-web specific derived types (not part of the shared contract) ---

export const STATUS_ORDER: IncidentStatus[] = ['new', 'acknowledged', 'in_progress', 'resolved'];

export const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low', 'pending_triage'];

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
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
 * The three responder actions from the task list: Acknowledge, Start Rescue
 * (sets status="in_progress"), and Resolve. "resolved" is terminal.
 */
export const NEXT_ACTION: Partial<Record<IncidentStatus, { label: string; next: IncidentStatus }>> = {
  new: { label: 'Acknowledge', next: 'acknowledged' },
  acknowledged: { label: 'Start Rescue', next: 'in_progress' },
  in_progress: { label: 'Resolve', next: 'resolved' },
};
