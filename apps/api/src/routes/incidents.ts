import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  SOSSubmissionSchema,
  Incident,
  IncidentStatusEnum,
  PriorityEnum,
} from '@rescue-link/schema';
import { incidentStore } from '../store/incidentStore';

export const incidentsRouter = Router();

// POST /api/incidents - Create SOS Incident
incidentsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const parseResult = SOSSubmissionSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid SOS submission payload',
      details: parseResult.error.format(),
    });
    return;
  }

  const payload = parseResult.data;
  const now = Date.now();

  const newIncident: Incident = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
    priority: 'pending_triage',
    location: payload.location,
    reporter: payload.reporter,
    category: payload.category,
    description: payload.description,
    peopleAffected: payload.peopleAffected,
    urgentNeeds: payload.urgentNeeds,
    details: {
      category: payload.category,
      description: payload.description,
      peopleAffected: payload.peopleAffected,
      urgentNeeds: payload.urgentNeeds,
    },
  };

  const created = await incidentStore.create(newIncident);
  res.status(201).json(created);
});

// GET /api/incidents - List Incidents
incidentsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { status, priority } = req.query;

  const validStatus =
    typeof status === 'string' && IncidentStatusEnum.safeParse(status).success
      ? (status as any)
      : undefined;

  const validPriority =
    typeof priority === 'string' && PriorityEnum.safeParse(priority).success
      ? (priority as any)
      : undefined;

  const list = await incidentStore.list({
    status: validStatus,
    priority: validPriority,
  });

  res.status(200).json(list);
});

// GET /api/incidents/:id - Get Single Incident
incidentsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const incident = await incidentStore.getById(id);

  if (!incident) {
    res.status(404).json({ error: 'Incident not found', id });
    return;
  }

  res.status(200).json(incident);
});

// PATCH /api/incidents/:id - Update status / assignment
incidentsRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const existing = await incidentStore.getById(id);

  if (!existing) {
    res.status(404).json({ error: 'Incident not found', id });
    return;
  }

  const { status, priority, assignedTo, triage } = req.body;

  const updates: Partial<Incident> = {};
  if (status && IncidentStatusEnum.safeParse(status).success) {
    updates.status = status;
  }
  if (priority && PriorityEnum.safeParse(priority).success) {
    updates.priority = priority;
  }
  if (typeof assignedTo === 'string') {
    updates.assignedTo = assignedTo;
  }
  if (triage && typeof triage === 'object') {
    updates.triage = {
      ...(existing.triage || {}),
      ...triage,
    };
  }

  const updated = await incidentStore.update(id, updates);
  res.status(200).json(updated);
});

// POST /api/incidents/:id/acknowledge - Convenience endpoint
incidentsRouter.post('/:id/acknowledge', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const existing = await incidentStore.getById(id);

  if (!existing) {
    res.status(404).json({ error: 'Incident not found', id });
    return;
  }

  const updated = await incidentStore.update(id, {
    status: 'acknowledged',
    assignedTo: req.body.assignedTo || existing.assignedTo,
  });

  res.status(200).json(updated);
});
