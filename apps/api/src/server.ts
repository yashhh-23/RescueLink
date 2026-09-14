import dotenv from 'dotenv';
dotenv.config();

import { CONFIG } from '@rescue-link/config';
import { app } from './app';

const server = app.listen(CONFIG.PORT, () => {
  console.log(`🚀 RescueLink API server listening on http://localhost:${CONFIG.PORT}`);
  console.log(`Environment: ${CONFIG.NODE_ENV}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
