import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export class AnalyticsController {
  /**
   * Get recovered revenue metrics
   */
  getRecoveredRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get appointments booked from outreach campaigns
      const appointments = await prisma.appointment.findMany({
        where: {
          patient: { practiceId },
          wasBookedFromOutreach: true,
          appointmentDate: {
            gte: start,
            lte: end,
          },
          status: { in: ['scheduled', 'completed'] },
        },
        select: {
          estimatedCost: true,
          actualCost: true,
          appointmentDate: true,
          status: true,
        },
      });

      const recoveredRevenue = appointments.reduce((sum, apt) => {
        const cost = apt.status === 'completed' && apt.actualCost
          ? Number(apt.actualCost)
          : Number(apt.estimatedCost || 0);
        return sum + cost;
      }, 0);

      // Group by month
      const monthlyRevenue = appointments.reduce((acc: any, apt) => {
        const month = new Date(apt.appointmentDate).toISOString().slice(0, 7);
        const cost = apt.status === 'completed' && apt.actualCost
          ? Number(apt.actualCost)
          : Number(apt.estimatedCost || 0);
        
        acc[month] = (acc[month] || 0) + cost;
        return acc;
      }, {});

      res.json({
        totalRecoveredRevenue: recoveredRevenue,
        totalAppointments: appointments.length,
        monthlyBreakdown: Object.entries(monthlyRevenue).map(([month, revenue]) => ({
          month,
          revenue,
        })),
      });
    } catch (error) {
      console.error('Get recovered revenue error:', error);
      res.status(500).json({ error: 'Failed to fetch recovered revenue' });
    }
  };

  /**
   * Get campaign performance metrics
   */
  getCampaignPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;

      const campaigns = await prisma.outreachCampaign.findMany({
        where: { practiceId },
        include: {
          outreachLogs: {
            select: {
              status: true,
              messageType: true,
            },
          },
        },
      });

      const performance = campaigns.map((campaign) => {
        const logs = campaign.outreachLogs;
        const totalSent = logs.filter((l) => l.status !== 'pending').length;
        const delivered = logs.filter((l) => l.status === 'delivered' || l.status === 'responded').length;
        const responded = logs.filter((l) => l.status === 'responded').length;

        return {
          id: campaign.id,
          name: campaign.name,
          triggerType: campaign.triggerType,
          messageType: campaign.messageType,
          isActive: campaign.isActive,
          metrics: {
            totalSent,
            delivered,
            responded,
            deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
            responseRate: totalSent > 0 ? (responded / totalSent) * 100 : 0,
          },
        };
      });

      res.json({ campaigns: performance });
    } catch (error) {
      console.error('Get campaign performance error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign performance' });
    }
  };

  /**
   * Get dashboard summary metrics
   */
  getDashboardMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get patients with expiring benefits (next 60 days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60);

      const patientsWithExpiringBenefits = await prisma.patientInsurance.findMany({
        where: {
          patient: { practiceId, isActive: true },
          isActive: true,
          expirationDate: {
            gte: now,
            lte: expiryDate,
          },
          remainingBenefits: { gte: new Prisma.Decimal(200) },
        },
        include: {
          patient: true,
        },
      });

      const totalValueAtRisk = patientsWithExpiringBenefits.reduce(
        (sum, ins) => sum + Number(ins.remainingBenefits),
        0
      );

      // Get this month's appointments from outreach
      const monthlyAppointments = await prisma.appointment.count({
        where: {
          patient: { practiceId },
          wasBookedFromOutreach: true,
          appointmentDate: { gte: monthStart },
        },
      });

      // Get this month's recovered revenue
      const monthlyRevenue = await prisma.appointment.findMany({
        where: {
          patient: { practiceId },
          wasBookedFromOutreach: true,
          appointmentDate: { gte: monthStart },
          status: { in: ['scheduled', 'completed'] },
        },
        select: {
          estimatedCost: true,
          actualCost: true,
          status: true,
        },
      });

      const recoveredRevenueMTD = monthlyRevenue.reduce((sum, apt) => {
        const cost = apt.status === 'completed' && apt.actualCost
          ? Number(apt.actualCost)
          : Number(apt.estimatedCost || 0);
        return sum + cost;
      }, 0);

      // Get total active patients
      const totalPatients = await prisma.patient.count({
        where: { practiceId, isActive: true },
      });

      res.json({
        totalPatients,
        patientsWithExpiringBenefits: patientsWithExpiringBenefits.length,
        totalValueAtRisk: Math.round(totalValueAtRisk),
        appointmentsThisMonth: monthlyAppointments,
        recoveredRevenueMTD: Math.round(recoveredRevenueMTD),
      });
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  };

  /**
   * Get messaging performance metrics (email & SMS tracking)
   */
  getMessagingPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { startDate, endDate, campaignId, messageType } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Build where clause
      const where: any = {
        campaign: { practiceId },
        createdAt: {
          gte: start,
          lte: end,
        },
      };

      if (campaignId) {
        where.campaignId = campaignId as string;
      }

      if (messageType && (messageType === 'email' || messageType === 'sms')) {
        where.messageType = messageType;
      }

      // Get all outreach logs
      const logs = await prisma.outreachLog.findMany({
        where,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Calculate overall metrics
      const totalSent = logs.filter((l) => l.status !== 'pending').length;
      const totalDelivered = logs.filter((l) => l.status === 'delivered' || l.status === 'responded').length;
      const totalFailed = logs.filter((l) => l.status === 'failed').length;
      const totalBounced = logs.filter((l) => l.bouncedAt !== null).length;

      // Email-specific metrics
      const emailLogs = logs.filter((l) => l.messageType === 'email');
      const totalEmails = emailLogs.length;
      const emailsDelivered = emailLogs.filter((l) => l.status === 'delivered' || l.status === 'responded').length;
      const emailsOpened = emailLogs.filter((l) => l.openedAt !== null).length;
      const emailsClicked = emailLogs.filter((l) => l.clickedAt !== null).length;
      const totalOpens = emailLogs.reduce((sum, l) => sum + l.openCount, 0);
      const totalClicks = emailLogs.reduce((sum, l) => sum + l.clickCount, 0);

      // SMS-specific metrics
      const smsLogs = logs.filter((l) => l.messageType === 'sms');
      const totalSMS = smsLogs.length;
      const smsDelivered = smsLogs.filter((l) => l.status === 'delivered' || l.status === 'responded').length;
      const smsFailed = smsLogs.filter((l) => l.status === 'failed').length;

      // Breakdown by campaign
      const campaignBreakdown = logs.reduce((acc: any, log) => {
        const campId = log.campaignId;
        if (!acc[campId]) {
          acc[campId] = {
            campaignId: campId,
            campaignName: log.campaign.name,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0,
          };
        }

        if (log.status !== 'pending') acc[campId].sent++;
        if (log.status === 'delivered' || log.status === 'responded') acc[campId].delivered++;
        if (log.openedAt) acc[campId].opened++;
        if (log.clickedAt) acc[campId].clicked++;
        if (log.bouncedAt) acc[campId].bounced++;
        if (log.status === 'failed') acc[campId].failed++;

        return acc;
      }, {});

      // Daily breakdown for charts
      const dailyBreakdown = logs.reduce((acc: any, log) => {
        const day = log.createdAt.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = {
            date: day,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
          };
        }

        if (log.status !== 'pending') acc[day].sent++;
        if (log.status === 'delivered' || log.status === 'responded') acc[day].delivered++;
        if (log.openedAt) acc[day].opened++;
        if (log.clickedAt) acc[day].clicked++;

        return acc;
      }, {});

      res.json({
        overview: {
          totalSent,
          totalDelivered,
          totalFailed,
          totalBounced,
          deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
          bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
          failureRate: totalSent > 0 ? (totalFailed / totalSent) * 100 : 0,
        },
        email: {
          total: totalEmails,
          delivered: emailsDelivered,
          opened: emailsOpened,
          clicked: emailsClicked,
          totalOpens,
          totalClicks,
          deliveryRate: totalEmails > 0 ? (emailsDelivered / totalEmails) * 100 : 0,
          openRate: emailsDelivered > 0 ? (emailsOpened / emailsDelivered) * 100 : 0,
          clickRate: emailsDelivered > 0 ? (emailsClicked / emailsDelivered) * 100 : 0,
          clickToOpenRate: emailsOpened > 0 ? (emailsClicked / emailsOpened) * 100 : 0,
        },
        sms: {
          total: totalSMS,
          delivered: smsDelivered,
          failed: smsFailed,
          deliveryRate: totalSMS > 0 ? (smsDelivered / totalSMS) * 100 : 0,
          failureRate: totalSMS > 0 ? (smsFailed / totalSMS) * 100 : 0,
        },
        campaignBreakdown: Object.values(campaignBreakdown),
        dailyBreakdown: Object.values(dailyBreakdown).sort((a: any, b: any) => 
          a.date.localeCompare(b.date)
        ),
      });
    } catch (error) {
      console.error('Get messaging performance error:', error);
      res.status(500).json({ error: 'Failed to fetch messaging performance' });
    }
  };
}

