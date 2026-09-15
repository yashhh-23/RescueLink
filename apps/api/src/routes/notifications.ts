import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { Incident } from '@rescue-link/schema';

export const notificationsRouter = Router();

// POST /api/notifications/test - Trigger manual test dispatch of Amazon SNS/SES alerts
notificationsRouter.post('/test', async (req: Request, res: Response): Promise<void> => {
  const { priority, category, description, peopleAffected, location } = req.body;

  const mockIncident: Incident = {
    id: `test-incident-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'new',
    priority: priority || 'critical',
    category: category || 'flood',
    description: description || 'Manual notification alert test',
    peopleAffected: typeof peopleAffected === 'number' ? peopleAffected : 4,
    urgentNeeds: ['medical', 'boat'],
    location: location || { lat: 37.7749, lng: -122.4194 },
    triage: {
      suggestedAction: 'URGENT TEST DIRECTIVE: Move to high ground immediately.',
      summary: 'Manual test dispatch triggered.',
      confidence: 0.99,
    },
  };

  const result = await notificationService.sendCriticalAlert(mockIncident);
  res.status(200).json({
    success: true,
    result,
    incident: mockIncident,
  });
});
