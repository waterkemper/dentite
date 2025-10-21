import { Express } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import benefitsRoutes from './benefits.routes';
import outreachRoutes from './outreach.routes';
import analyticsRoutes from './analytics.routes';
import orthoRoutes from './ortho.routes';
import webhooksRoutes from './webhooks.routes';
import preferencesRoutes from './preferences.routes';
import practiceSettingsRoutes from './practiceSettings.routes';

export const setupRoutes = (app: Express): void => {
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/benefits', benefitsRoutes);
  app.use('/api/outreach', outreachRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ortho', orthoRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/preferences', preferencesRoutes);
  app.use('/api/practices', practiceSettingsRoutes);
};

