import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  SOSSubmissionSchema,
  Incident,
  IncidentStatusEnum,
  PriorityEnum,
} from '@rescue-link/schema';
import { incidentStore } from '../store/incidentStore';
import { triageWorkflow } from '../services/triageWorkflow';
import { eventStreamManager } from '../services/eventStream';

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
    audioBlob: payload.audioBlob,
    details: {
      category: payload.category,
      description: payload.description,
      peopleAffected: payload.peopleAffected,
      urgentNeeds: payload.urgentNeeds,
    },
  };

  const created = await incidentStore.create(newIncident);

  // Broadcast creation to connected SSE clients
  eventStreamManager.broadcast({
    type: 'incident:created',
    incident: created,
    timestamp: now,
  });

  // Trigger background AI triage workflow
  triageWorkflow.runTriage(created).catch((err) => {
    console.error(`[IncidentsRouter] Triage background task error for ${created.id}:`, err);
  });

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

// PATCH /api/incidents/:id - Update status / assignment / triage
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
  if (updated) {
    eventStreamManager.broadcast({
      type: 'incident:updated',
      incident: updated,
      timestamp: Date.now(),
    });
  }

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

  if (updated) {
    eventStreamManager.broadcast({
      type: 'incident:updated',
      incident: updated,
      timestamp: Date.now(),
    });
  }

  res.status(200).json(updated);
});

// POST /api/incidents/:id/broadcast - Send tactical directive broadcast to survivor / zone
incidentsRouter.post('/:id/broadcast', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const existing = await incidentStore.getById(id);

  if (!existing) {
    res.status(404).json({ error: 'Incident not found', id });
    return;
  }

  const { message, channel, target } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Broadcast message is required' });
    return;
  }

  const updatedTriage = {
    ...(existing.triage || {}),
    suggestedAction: message,
    notes: `Broadcast sent via ${channel || 'wifi'} to ${target || 'zone'}: ${message}`,
  };

  const updated = await incidentStore.update(id, { triage: updatedTriage });

  if (updated) {
    eventStreamManager.broadcast({
      type: 'broadcast:sent',
      incident: updated,
      message,
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    broadcastId: uuidv4(),
    incidentId: id,
    channel: channel || 'wifi',
    deliveredAt: Date.now(),
    incident: updated,
  });
});
