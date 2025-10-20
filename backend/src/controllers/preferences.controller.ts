import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export class PreferencesController {
  /**
   * Get patient communication preferences
   */
  getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { patientId } = req.params;

      // Verify patient belongs to practice
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, practiceId },
      });

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const preferences = await prisma.patientPreferences.findUnique({
        where: { patientId },
      });

      res.json({
        preferences: preferences || {
          patientId,
          emailOptOut: false,
          smsOptOut: false,
        },
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  };

  /**
   * Update patient communication preferences
   */
  updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { patientId } = req.params;
      const { emailOptOut, smsOptOut, unsubscribeReason } = req.body;

      // Verify patient belongs to practice
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, practiceId },
      });

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const preferences = await prisma.patientPreferences.upsert({
        where: { patientId },
        create: {
          patientId,
          emailOptOut: emailOptOut !== undefined ? emailOptOut : false,
          smsOptOut: smsOptOut !== undefined ? smsOptOut : false,
          unsubscribeReason,
        },
        update: {
          emailOptOut: emailOptOut !== undefined ? emailOptOut : undefined,
          smsOptOut: smsOptOut !== undefined ? smsOptOut : undefined,
          unsubscribeReason: unsubscribeReason !== undefined ? unsubscribeReason : undefined,
          updatedAt: new Date(),
        },
      });

      res.json({
        message: 'Preferences updated',
        preferences,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  };

  /**
   * Handle public unsubscribe page (no auth required)
   */
  unsubscribePage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patient: patientId, type } = req.query;

      if (!patientId || typeof patientId !== 'string') {
        res.status(400).json({ error: 'Invalid patient ID' });
        return;
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      // Unsubscribe based on type (email, sms, or both)
      const updateData: any = {
        unsubscribeReason: 'User clicked unsubscribe link',
      };

      if (type === 'email' || !type) {
        updateData.emailOptOut = true;
      }
      if (type === 'sms' || !type) {
        updateData.smsOptOut = true;
      }

      await prisma.patientPreferences.upsert({
        where: { patientId },
        create: {
          patientId,
          ...updateData,
        },
        update: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      res.json({
        message: 'You have been unsubscribed successfully',
        patientName: `${patient.firstName} ${patient.lastName}`,
      });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  };

  /**
   * Get all patients with opt-out preferences (for practice admin)
   */
  getOptedOutPatients = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;

      const preferences = await prisma.patientPreferences.findMany({
        where: {
          OR: [{ emailOptOut: true }, { smsOptOut: true }],
          patient: {
            practiceId: practiceId,
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      res.json({
        preferences: preferences,
        total: preferences.length,
      });
    } catch (error) {
      console.error('Get opted-out patients error:', error);
      res.status(500).json({ error: 'Failed to fetch opted-out patients' });
    }
  };
}

