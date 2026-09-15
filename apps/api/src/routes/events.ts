import { Router, Request, Response } from 'express';
import { eventStreamManager } from '../services/eventStream';

export const eventsRouter = Router();

// GET /api/events - Server-Sent Events stream for real-time incident updates
eventsRouter.get('/', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add client to manager
  eventStreamManager.addClient(res);

  // Send initial ping comment
  res.write(': sse connected\n\n');

  // Handle client disconnect
  req.on('close', () => {
    eventStreamManager.removeClient(res);
  });
});
