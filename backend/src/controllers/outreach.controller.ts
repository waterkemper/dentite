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
      const { name, description, triggerType, messageType, messageTemplate, minBenefitAmount } = req.body;

      const campaign = await prisma.outreachCampaign.create({
        data: {
          practiceId,
          name,
          description,
          triggerType,
          messageType,
          messageTemplate,
          minBenefitAmount: minBenefitAmount || 200,
          isActive: true,
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
}

