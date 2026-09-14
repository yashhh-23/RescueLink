import { z } from 'zod';

/**
 * Shared Monorepo Incident Data Contract matching packages/schema/src/incident.ts
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

export const SOSSubmissionSchema = z.object({
  category: IncidentCategoryEnum,
  description: z.string().min(1, 'Please describe the emergency situation'),
  location: LocationSchema,
  peopleAffected: z.coerce.number().int().min(1, 'At least 1 person must be affected').default(1),
  urgentNeeds: z.array(UrgentNeedEnum).default([]),
  reporter: ReporterSchema.optional(),
});
export type SOSSubmission = z.infer<typeof SOSSubmissionSchema>;

export const IncidentTriageSchema = z.object({
  suggestedAction: z.string().optional(),
  confidence: z.number().optional(),
  assignedUnits: z.array(z.string()).optional(),
  notes: z.string().optional(),
  summary: z.string().optional(),
  reasoning: z.string().optional(),
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
  details: z.object({
    category: IncidentCategoryEnum,
    description: z.string(),
    peopleAffected: z.number(),
    urgentNeeds: z.array(UrgentNeedEnum),
  }).optional(),
  assignedTo: z.string().optional(),
});
export type IncidentResponse = z.infer<typeof IncidentResponseSchema>;

export interface PendingIncident {
  localId: string;
  createdAt: number;
  status: 'queued' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  payload: SOSSubmission;
  errorMessage?: string;
}
