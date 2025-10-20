import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { OutreachService } from '../services/outreachService';

export class OutreachController {
  private outreachService: OutreachService;

  constructor() {
    this.outreachService = new OutreachService();
  }

  /**
   * Get all campaigns
   */
  getCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;

      const campaigns = await prisma.outreachCampaign.findMany({
        where: { practiceId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ campaigns });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  };

  /**
   * Get single campaign by id
   */
  getCampaignById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { id } = req.params;

      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const metrics = await prisma.outreachLog.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: { _all: true },
      });

      res.json({ campaign, metrics });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  };

  /**
   * Update campaign
   */
  updateCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { id } = req.params;

      const campaign = await prisma.outreachCampaign.update({
        where: { id },
        data: { ...req.body, practiceId },
      });

      res.json({ message: 'Campaign updated', campaign });
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  };

  /**
   * Delete campaign only if no messages were delivered
   */
  deleteCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { id } = req.params;

      const deliveredCount = await prisma.outreachLog.count({
        where: { campaignId: id, status: { in: ['delivered', 'responded'] } },
      });

      if (deliveredCount > 0) {
        res.status(400).json({ error: 'Cannot delete: messages already delivered or responded' });
        return;
      }

      await prisma.outreachLog.deleteMany({ where: { campaignId: id } });
      await prisma.outreachCampaign.delete({ where: { id } });

      res.json({ message: 'Campaign deleted' });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  };

  /**
   * Create new campaign
   */
  createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { 
        name, 
        description, 
        triggerType, 
        messageType, 
        messageTemplate, 
        minBenefitAmount,
        isSequence,
        autoStopOnAppointment,
        autoStopOnResponse,
        autoStopOnOptOut
      } = req.body;

      const campaign = await prisma.outreachCampaign.create({
        data: {
          practiceId,
          name,
          description,
          triggerType,
          messageType,
          messageTemplate: messageTemplate || (isSequence ? 'Sequence campaign - templates defined in steps' : ''),
          minBenefitAmount: minBenefitAmount || 200,
          isActive: true,
          // Sequence fields with defaults
          isSequence: isSequence || false,
          autoStopOnAppointment: autoStopOnAppointment !== undefined ? autoStopOnAppointment : true,
          autoStopOnResponse: autoStopOnResponse !== undefined ? autoStopOnResponse : true,
          autoStopOnOptOut: autoStopOnOptOut !== undefined ? autoStopOnOptOut : true,
        },
      });

      res.status(201).json({
        message: 'Campaign created successfully',
        campaign,
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  };

  /**
   * Get outreach logs
   */
  getLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { page = 1, limit = 50, status, patientId } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { campaign: { practiceId } };

      if (status) where.status = status;
      if (patientId) where.patientId = patientId;

      const logs = await prisma.outreachLog.findMany({
        where,
        include: {
          campaign: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.outreachLog.count({ where });

      res.json({
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  };

  /**
   * Send manual message to patient
   */
  sendManualMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { practiceId } = req.user!;
      const { messageType, campaignId } = req.body;

      const result = await this.outreachService.sendManualOutreach(
        patientId,
        practiceId,
        campaignId,
        messageType
      );

      // Get the latest outreach log to include message content
      const latestLog = await prisma.outreachLog.findFirst({
        where: {
          patientId,
          campaignId,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          messageContent: true,
          messageType: true,
          status: true,
          sentAt: true,
        },
      });

      res.json({
        message: 'Message sent successfully',
        messageContent: latestLog?.messageContent,
        messageType: latestLog?.messageType,
        status: latestLog?.status,
        sentAt: latestLog?.sentAt,
        ...result,
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  };

  /**
   * Create campaign step
   */
  createStep = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { practiceId } = req.user!;
      const { stepNumber, name, messageType, messageTemplate, delayType, delayValue } = req.body;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const step = await prisma.campaignStep.create({
        data: {
          campaignId: id,
          stepNumber,
          name,
          messageType,
          messageTemplate,
          delayType,
          delayValue,
        },
      });

      res.status(201).json({ message: 'Step created', step });
    } catch (error: any) {
      console.error('Create step error:', error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Step number already exists for this campaign' });
      } else {
        res.status(500).json({ error: 'Failed to create step' });
      }
    }
  };

  /**
   * Get campaign steps
   */
  getSteps = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { practiceId } = req.user!;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const steps = await prisma.campaignStep.findMany({
        where: { campaignId: id },
        orderBy: { stepNumber: 'asc' },
      });

      res.json({ steps });
    } catch (error) {
      console.error('Get steps error:', error);
      res.status(500).json({ error: 'Failed to fetch steps' });
    }
  };

  /**
   * Update campaign step
   */
  updateStep = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id, stepId } = req.params;
      const { practiceId } = req.user!;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const step = await prisma.campaignStep.update({
        where: { id: stepId, campaignId: id },
        data: req.body,
      });

      res.json({ message: 'Step updated', step });
    } catch (error) {
      console.error('Update step error:', error);
      res.status(500).json({ error: 'Failed to update step' });
    }
  };

  /**
   * Delete campaign step
   */
  deleteStep = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id, stepId } = req.params;
      const { practiceId } = req.user!;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      await prisma.campaignStep.delete({
        where: { id: stepId, campaignId: id },
      });

      res.json({ message: 'Step deleted' });
    } catch (error) {
      console.error('Delete step error:', error);
      res.status(500).json({ error: 'Failed to delete step' });
    }
  };

  /**
   * Enroll patient in sequence
   */
  enrollPatient = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id, patientId } = req.params;
      const { practiceId } = req.user!;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      await this.outreachService.enrollPatientInSequence(id, patientId);

      res.json({ message: 'Patient enrolled in sequence' });
    } catch (error: any) {
      console.error('Enroll patient error:', error);
      res.status(400).json({ error: error.message || 'Failed to enroll patient' });
    }
  };

  /**
   * Enroll multiple patients in sequence
   */
  enrollPatients = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { practiceId } = req.user!;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const result = await this.outreachService.enrollPatientsInSequence(id, practiceId);

      res.json({
        message: 'Patients enrolled',
        enrolled: result.enrolled,
        skipped: result.skipped,
      });
    } catch (error: any) {
      console.error('Enroll patients error:', error);
      res.status(400).json({ error: error.message || 'Failed to enroll patients' });
    }
  };

  /**
   * Get sequence states for campaign
   */
  getSequenceStates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { practiceId } = req.user!;

      // Verify campaign belongs to practice
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id, practiceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const states = await prisma.patientSequenceState.findMany({
        where: { campaignId: id },
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
        orderBy: { createdAt: 'desc' },
      });

      res.json({ states });
    } catch (error) {
      console.error('Get sequence states error:', error);
      res.status(500).json({ error: 'Failed to fetch sequence states' });
    }
  };

  /**
   * Get patient's sequence states
   */
  getPatientSequences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { practiceId } = req.user!;

      // Verify patient belongs to practice
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, practiceId },
      });

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const sequences = await prisma.patientSequenceState.findMany({
        where: { patientId },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ sequences });
    } catch (error) {
      console.error('Get patient sequences error:', error);
      res.status(500).json({ error: 'Failed to fetch patient sequences' });
    }
  };
}

