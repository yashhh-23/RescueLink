import { z } from 'zod';

export const IncidentStatusEnum = z.enum([
  'new',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
]);
export type IncidentStatus = z.infer<typeof IncidentStatusEnum>;

export const PriorityEnum = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'pending_triage',
]);
export type Priority = z.infer<typeof PriorityEnum>;

export const IncidentCategoryEnum = z.enum(['flood', 'landslide', 'fire', 'other']);
export type IncidentCategory = z.infer<typeof IncidentCategoryEnum>;

export const UrgentNeedEnum = z.enum([
  'medical',
  'boat',
  'food',
  'clean_water',
  'infant_care',
]);
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

export const IncidentDetailsSchema = z.object({
  category: IncidentCategoryEnum,
  description: z.string().min(1, 'Description is required'),
  peopleAffected: z.coerce.number().int().min(1).default(1),
  urgentNeeds: z.array(UrgentNeedEnum).default([]),
});
export type IncidentDetails = z.infer<typeof IncidentDetailsSchema>;

export const IncidentTriageSchema = z.object({
  suggestedAction: z.string().optional(),
  confidence: z.number().optional(),
  assignedUnits: z.array(z.string()).optional(),
  notes: z.string().optional(),
  summary: z.string().optional(),
  reasoning: z.string().optional(),
});
export type IncidentTriage = z.infer<typeof IncidentTriageSchema>;

export const SOSSubmissionSchema = z.object({
  category: IncidentCategoryEnum,
  description: z.string().min(1, 'Description is required'),
  location: LocationSchema,
  peopleAffected: z.coerce.number().int().min(1).default(1),
  urgentNeeds: z.array(UrgentNeedEnum).default([]),
  reporter: ReporterSchema.optional(),
  audioBlob: z.string().optional(),
});
export type SOSSubmission = z.infer<typeof SOSSubmissionSchema>;

export const IncidentSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  status: IncidentStatusEnum,
  priority: PriorityEnum,
  location: LocationSchema,
  reporter: ReporterSchema.optional(),
  category: IncidentCategoryEnum,
  description: z.string(),
  peopleAffected: z.number(),
  urgentNeeds: z.array(UrgentNeedEnum),
  details: IncidentDetailsSchema.optional(),
  triage: IncidentTriageSchema.optional(),
  assignedTo: z.string().optional(),
  audioBlob: z.string().optional(),
});
export type Incident = z.infer<typeof IncidentSchema>;
