import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { query } from './db/pool.js';
import { errorHandler, notFound } from './middleware/errors.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import authRoutes from './routes/auth.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import businessHoursRoutes from './routes/businessHours.routes.js';
import servicesRoutes from './routes/services.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/business-hours', businessHoursRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/appointments', appointmentsRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
