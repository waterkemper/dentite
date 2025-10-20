import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { prisma } from '../lib/prisma';
import { BenefitsEngine } from './benefitsEngine';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class OutreachService {
  private twilioClient: any;
  private benefitsEngine: BenefitsEngine;

  constructor() {
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    this.benefitsEngine = new BenefitsEngine();
  }

  /**
   * Process automated outreach campaigns
   */
  async processAutomatedOutreach(practiceId: string): Promise<{ sent: number; failed: number }> {
    try {
      // Get all active campaigns
      const campaigns = await prisma.outreachCampaign.findMany({
        where: {
          practiceId,
          isActive: true,
        },
      });

      let sent = 0;
      let failed = 0;

      for (const campaign of campaigns) {
        const days = this.getTriggerDays(campaign.triggerType);
        
        // Get patients matching campaign criteria
        const patients = await this.benefitsEngine.getExpiringBenefits(
          practiceId,
          days,
          Number(campaign.minBenefitAmount)
        );

        for (const patient of patients) {
          // Check if already contacted recently
          const recentContact = await this.hasRecentContact(patient.patientId, campaign.id, 7);
          
          if (recentContact) continue;

          try {
            await this.sendOutreach(campaign, patient);
            sent++;
          } catch (error) {
            console.error(`Error sending to patient ${patient.patientId}:`, error);
            failed++;
          }
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Process automated outreach error:', error);
      throw error;
    }
  }

  /**
   * Send manual outreach to specific patient
   */
  async sendManualOutreach(
    patientId: string,
    practiceId: string,
    campaignId: string,
    messageType: string
  ): Promise<SendResult> {
    try {
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id: campaignId, practiceId },
      });

      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      const benefits = await this.benefitsEngine.calculatePatientBenefits(
        patientId,
        practiceId
      );

      if (!benefits) {
        return { success: false, error: 'Patient benefits not found' };
      }

      return await this.sendOutreach(campaign, benefits, messageType);
    } catch (error) {
      console.error('Send manual outreach error:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  /**
   * Send outreach message
   */
  private async sendOutreach(
    campaign: any,
    patient: any,
    forceType?: string
  ): Promise<SendResult> {
    // Check patient preferences
    const preferences = await prisma.patientPreferences.findUnique({
      where: { patientId: patient.patientId },
    });

    const messageType = forceType || campaign.messageType;
    const message = this.personalizeMessage(campaign.messageTemplate, patient);

    let result: SendResult = { success: false };

    try {
      if ((messageType === 'sms' || messageType === 'both') && patient.phone) {
        // Check if patient opted out of SMS
        if (preferences?.smsOptOut) {
          console.log(`Patient ${patient.patientId} opted out of SMS, skipping`);
        } else {
          result = await this.sendSMS(patient.phone, message);
          await this.logOutreach(campaign.id, patient.patientId, 'sms', message, patient.phone, result);
        }
      }

      if ((messageType === 'email' || messageType === 'both') && patient.email) {
        // Check if patient opted out of email
        if (preferences?.emailOptOut) {
          console.log(`Patient ${patient.patientId} opted out of email, skipping`);
        } else {
          result = await this.sendEmail(
            patient.email,
            message,
            patient.patientName,
            campaign.id,
            patient.patientId
          );
          await this.logOutreach(campaign.id, patient.patientId, 'email', message, patient.email, result);
        }
      }

      return result;
    } catch (error) {
      console.error('Send outreach error:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSMS(phone: string, message: string): Promise<SendResult> {
    try {
      if (!this.twilioClient) {
        console.log('Twilio not configured, simulating SMS send');
        return { success: true, messageId: 'mock_sms_' + Date.now() };
      }

      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://localhost';
      const statusCallback = `${webhookBaseUrl}/api/webhooks/twilio`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
        statusCallback: statusCallback, // Enable status callbacks
      });

      return { success: true, messageId: result.sid };
    } catch (error: any) {
      console.error('Send SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Email via SendGrid
   */
  private async sendEmail(
    email: string,
    message: string,
    recipientName: string,
    campaignId?: string,
    patientId?: string
  ): Promise<SendResult> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, simulating email send');
        return { success: true, messageId: 'mock_email_' + Date.now() };
      }

      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://localhost';
      const unsubscribeUrl = `${webhookBaseUrl}/unsubscribe?patient=${patientId}`;

      const msg: any = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@dentite.com',
          name: process.env.SENDGRID_FROM_NAME || 'Dentite Benefits Tracker',
        },
        subject: 'Your Dental Benefits Are Expiring Soon',
        text: message,
        html: this.generateEmailHTML(recipientName, message, unsubscribeUrl),
        // Enable tracking
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true,
          },
          openTracking: {
            enable: true,
          },
          subscriptionTracking: {
            enable: true,
            text: 'To unsubscribe from these notifications, click here: <%unsubscribe%>',
            html: '<p>To unsubscribe from these notifications, <a href="<%unsubscribe%>">click here</a>.</p>',
            substitutionTag: '<%unsubscribe%>',
          },
        },
        // Custom args for webhook identification
        customArgs: {
          campaignId: campaignId || '',
          patientId: patientId || '',
        },
      };

      const result = await sgMail.send(msg);
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error: any) {
      console.error('Send email error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Personalize message template
   */
  private personalizeMessage(template: string, patient: any): string {
    return template
      .replace(/{firstName}/g, patient.patientName.split(' ')[0])
      .replace(/{lastName}/g, patient.patientName.split(' ').slice(1).join(' '))
      .replace(/{fullName}/g, patient.patientName)
      .replace(/{amount}/g, `$${Math.round(patient.remainingBenefits)}`)
      .replace(/{expirationDate}/g, new Date(patient.expirationDate).toLocaleDateString())
      .replace(/{daysRemaining}/g, String(patient.daysUntilExpiry))
      .replace(/{carrier}/g, patient.insuranceCarrier);
  }

  /**
   * Generate HTML email template
   */
  private generateEmailHTML(name: string, message: string, unsubscribeUrl?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .cta { display: inline-block; padding: 12px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🦷 Dental Benefits Alert</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>${message}</p>
              <p>Don't let your benefits go to waste! Contact us today to schedule your appointment.</p>
              <a href="tel:555-0100" class="cta">Call to Schedule</a>
            </div>
            <div class="footer">
              <p>Powered by Dentite Benefits Tracker</p>
              ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}">Unsubscribe</a> from these notifications.</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Log outreach message
   */
  private async logOutreach(
    campaignId: string,
    patientId: string,
    messageType: string,
    messageContent: string,
    recipient: string,
    result: SendResult
  ): Promise<void> {
    try {
      await prisma.outreachLog.create({
        data: {
          campaignId,
          patientId,
          messageType,
          messageContent,
          ...(messageType === 'email' && { recipientEmail: recipient }),
          ...(messageType === 'sms' && { recipientPhone: recipient }),
          status: result.success ? 'sent' : 'failed',
          sentAt: result.success ? new Date() : null,
          externalId: result.messageId,
          errorMessage: result.error,
        },
      });
    } catch (error) {
      console.error('Log outreach error:', error);
    }
  }

  /**
   * Check if patient was contacted recently
   */
  private async hasRecentContact(
    patientId: string,
    campaignId: string,
    days: number
  ): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentLog = await prisma.outreachLog.findFirst({
      where: {
        patientId,
        campaignId,
        createdAt: { gte: cutoffDate },
      },
    });

    return !!recentLog;
  }

  /**
   * Get trigger days from trigger type
   */
  private getTriggerDays(triggerType: string): number {
    switch (triggerType) {
      case 'expiring_60':
        return 60;
      case 'expiring_30':
        return 30;
      case 'expiring_14':
        return 14;
      default:
        return 60;
    }
  }
}

