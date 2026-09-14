import { Router, Request, Response } from 'express';
import { CONFIG } from '@rescue-link/config';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'rescue-link-api',
    environment: CONFIG.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});
