import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { incidentsRouter } from './routes/incidents';
import { eventsRouter } from './routes/events';
import { telemetryRouter } from './routes/telemetry';
import { notificationsRouter } from './routes/notifications';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'RescueLink API',
      health: '/api/health',
      incidents: '/api/incidents',
      events: '/api/events',
      sensors: '/api/sensors',
      hazardZones: '/api/hazard-zones',
      notifications: '/api/notifications/test',
    });
  });

  app.use('/api/health', healthRouter);
  app.use('/api/incidents', incidentsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api', telemetryRouter);

  // Fallback 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
};

export const app = createApp();
