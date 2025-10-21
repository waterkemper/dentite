import { prisma } from '../lib/prisma';
import { BenefitsEngine } from './benefitsEngine';
import { getMessagingFactory } from './messagingServiceFactory';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'system' | 'custom' | 'custom_sendgrid' | 'custom_twilio';
}

export class OutreachService {
  private benefitsEngine: BenefitsEngine;
  private messagingFactory: ReturnType<typeof getMessagingFactory>;

  constructor() {
    this.benefitsEngine = new BenefitsEngine();
    this.messagingFactory = getMessagingFactory();
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
          result = await this.sendSMS(campaign.practiceId, patient.phone, message);
          await this.logOutreach(campaign.id, patient.patientId, 'sms', message, patient.phone, result);
        }
      }

      if ((messageType === 'email' || messageType === 'both') && patient.email) {
        // Check if patient opted out of email
        if (preferences?.emailOptOut) {
          console.log(`Patient ${patient.patientId} opted out of email, skipping`);
        } else {
          result = await this.sendEmail(
            campaign.practiceId,
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
   * Send SMS via Twilio (Multi-tenant)
   */
  private async sendSMS(practiceId: string, phone: string, message: string): Promise<SendResult> {
    try {
      const { client, config } = await this.messagingFactory.getTwilioClient(practiceId);
      
      if (!client || !config.phoneNumber) {
        console.log('Twilio not configured, simulating SMS send');
        return { success: true, messageId: 'mock_sms_' + Date.now(), provider: 'system' };
      }

      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://localhost';
      const statusCallback = `${webhookBaseUrl}/api/webhooks/twilio?practiceId=${practiceId}`;

      const result = await client.messages.create({
        body: message,
        from: config.phoneNumber,
        to: phone,
        statusCallback: statusCallback, // Enable status callbacks with practice ID
      });

      return { 
        success: true, 
        messageId: result.sid,
        provider: config.provider === 'custom' ? 'custom_twilio' : 'system'
      };
    } catch (error: any) {
      console.error('Send SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Email via SendGrid (Multi-tenant)
   */
  private async sendEmail(
    practiceId: string,
    email: string,
    message: string,
    recipientName: string,
    campaignId?: string,
    patientId?: string
  ): Promise<SendResult> {
    try {
      const { client, config } = await this.messagingFactory.getSendGridClient(practiceId);
      
      if (!client || !config.fromEmail) {
        console.log('SendGrid not configured, simulating email send');
        return { success: true, messageId: 'mock_email_' + Date.now(), provider: 'system' };
      }

      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://localhost';
      const unsubscribeUrl = `${webhookBaseUrl}/api/preferences/unsubscribe?patient=${patientId}&type=email`;

      const msg: any = {
        to: email,
        from: {
          email: config.fromEmail,
          name: config.fromName,
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
          practiceId: practiceId, // Add practice ID for webhook routing
        },
      };

      const result = await client.send(msg);
      return { 
        success: true, 
        messageId: result[0].headers['x-message-id'],
        provider: config.provider === 'custom' ? 'custom_sendgrid' : 'system'
      };
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
              <h1>Dental Benefits Alert</h1>
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
          messagingProvider: result.provider || null,
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

  /**
   * Process sequence campaigns
   */
  async processSequences(practiceId: string): Promise<{ processed: number; stopped: number; completed: number }> {
    try {
      // Get all active sequence states with nextScheduledAt <= now
      const dueSequences = await prisma.patientSequenceState.findMany({
        where: {
          campaign: { practiceId },
          status: 'active',
          nextScheduledAt: { lte: new Date() },
        },
        include: {
          campaign: { 
            include: { 
              steps: { 
                where: { isActive: true },
                orderBy: { stepNumber: 'asc' } 
              } 
            } 
          },
          patient: { include: { insurance: true, preferences: true } },
        },
      });

      let processed = 0;
      let stopped = 0;
      let completed = 0;

      for (const state of dueSequences) {
        // Check termination conditions
        const stopCheck = await this.shouldStopSequence(state);
        if (stopCheck.stop) {
          await this.stopSequence(state.id, stopCheck.reason!);
          stopped++;
          continue;
        }

        // Get next step
        const nextStep = state.campaign.steps.find(
          (s) => s.stepNumber === state.currentStepNumber + 1
        );

        if (!nextStep) {
          // Sequence complete
          await this.completeSequence(state.id);
          completed++;
          continue;
        }

        // Send message
        await this.sendSequenceStep(state, nextStep);
        processed++;

        // Update state
        await this.updateSequenceState(state.id, nextStep, state.patient);
      }

      return { processed, stopped, completed };
    } catch (error) {
      console.error('Process sequences error:', error);
      throw error;
    }
  }

  /**
   * Check if sequence should stop
   */
  private async shouldStopSequence(
    state: any
  ): Promise<{ stop: boolean; reason?: string }> {
    const { campaign, patient } = state;

    // Check appointment booked
    if (campaign.autoStopOnAppointment) {
      const hasAppointment = await prisma.appointment.findFirst({
        where: {
          patientId: patient.id,
          appointmentDate: { gte: new Date() },
          status: { in: ['scheduled'] },
          createdAt: { gte: state.startedAt },
        },
      });
      if (hasAppointment) return { stop: true, reason: 'appointment_booked' };
    }

    // Check patient responded
    if (campaign.autoStopOnResponse) {
      const hasResponse = await prisma.outreachLog.findFirst({
        where: {
          patientId: patient.id,
          campaignId: campaign.id,
          status: 'responded',
          createdAt: { gte: state.startedAt },
        },
      });
      if (hasResponse) return { stop: true, reason: 'patient_responded' };
    }

    // Check opt-out
    if (campaign.autoStopOnOptOut) {
      const prefs = await prisma.patientPreferences.findUnique({
        where: { patientId: patient.id },
      });
      if (prefs?.emailOptOut && prefs?.smsOptOut) {
        return { stop: true, reason: 'opted_out' };
      }
    }

    // Check benefits expired
    const insurance = patient.insurance.find((i: any) => i.isActive);
    if (insurance && new Date(insurance.expirationDate) < new Date()) {
      return { stop: true, reason: 'expiry_passed' };
    }

    return { stop: false };
  }

  /**
   * Stop a sequence
   */
  private async stopSequence(stateId: string, reason: string): Promise<void> {
    await prisma.patientSequenceState.update({
      where: { id: stateId },
      data: {
        status: 'stopped',
        stopReason: reason,
        stoppedAt: new Date(),
      },
    });
  }

  /**
   * Complete a sequence
   */
  private async completeSequence(stateId: string): Promise<void> {
    await prisma.patientSequenceState.update({
      where: { id: stateId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Send a sequence step
   */
  private async sendSequenceStep(state: any, step: any): Promise<void> {
    const { patient } = state;
    
    // Get benefits info for message personalization
    const benefits = await this.benefitsEngine.calculatePatientBenefits(
      patient.id,
      state.campaign.practiceId
    );

    if (!benefits) {
      console.error(`No benefits found for patient ${patient.id}`);
      return;
    }

    const message = this.personalizeMessage(step.messageTemplate, benefits);
    let result: SendResult = { success: false };

    // Check patient preferences
    const preferences = await prisma.patientPreferences.findUnique({
      where: { patientId: patient.id },
    });

    try {
      if (step.messageType === 'sms' && patient.phone) {
        if (preferences?.smsOptOut) {
          console.log(`Patient ${patient.id} opted out of SMS, skipping step`);
          return;
        }
        result = await this.sendSMS(state.campaign.practiceId, patient.phone, message);
        await this.logOutreachWithStep(
          state.campaign.id,
          patient.id,
          step.id,
          step.stepNumber,
          'sms',
          message,
          patient.phone,
          result
        );
      } else if (step.messageType === 'email' && patient.email) {
        if (preferences?.emailOptOut) {
          console.log(`Patient ${patient.id} opted out of email, skipping step`);
          return;
        }
        result = await this.sendEmail(
          state.campaign.practiceId,
          patient.email,
          message,
          `${patient.firstName} ${patient.lastName}`,
          state.campaign.id,
          patient.id
        );
        await this.logOutreachWithStep(
          state.campaign.id,
          patient.id,
          step.id,
          step.stepNumber,
          'email',
          message,
          patient.email,
          result
        );
      }
    } catch (error) {
      console.error(`Error sending sequence step for patient ${patient.id}:`, error);
    }
  }

  /**
   * Update sequence state after sending
   */
  private async updateSequenceState(
    stateId: string,
    currentStep: any,
    patient: any
  ): Promise<void> {
    const nextScheduledAt = this.calculateNextScheduledTime(currentStep, patient);

    await prisma.patientSequenceState.update({
      where: { id: stateId },
      data: {
        currentStepNumber: currentStep.stepNumber,
        nextScheduledAt,
      },
    });
  }

  /**
   * Calculate next scheduled time based on delay configuration
   */
  private calculateNextScheduledTime(currentStep: any, patient: any): Date {
    const nextDate = new Date();

    if (currentStep.delayType === 'fixed_days') {
      nextDate.setDate(nextDate.getDate() + currentStep.delayValue);
    } else if (currentStep.delayType === 'days_before_expiry') {
      const insurance = patient.insurance.find((i: any) => i.isActive);
      if (insurance) {
        const expiryDate = new Date(insurance.expirationDate);
        nextDate.setTime(
          expiryDate.getTime() - currentStep.delayValue * 24 * 60 * 60 * 1000
        );
      }
    }

    return nextDate;
  }

  /**
   * Enroll patient in a sequence campaign
   */
  async enrollPatientInSequence(campaignId: string, patientId: string): Promise<void> {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: { steps: { where: { isActive: true }, orderBy: { stepNumber: 'asc' } } },
    });

    if (!campaign || !campaign.isSequence || campaign.steps.length === 0) {
      throw new Error('Invalid sequence campaign');
    }

    // Check if already enrolled
    const existing = await prisma.patientSequenceState.findUnique({
      where: {
        campaignId_patientId: { campaignId, patientId },
      },
    });

    if (existing) {
      throw new Error('Patient already enrolled in this sequence');
    }

    // Get patient with insurance
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { insurance: true },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Calculate first message time
    const firstStep = campaign.steps[0];
    const nextScheduledAt = this.calculateNextScheduledTime(firstStep, patient);

    await prisma.patientSequenceState.create({
      data: {
        campaignId,
        patientId,
        currentStepNumber: 0,
        status: 'active',
        nextScheduledAt,
      },
    });
  }

  /**
   * Enroll multiple patients matching criteria
   */
  async enrollPatientsInSequence(
    campaignId: string,
    practiceId: string
  ): Promise<{ enrolled: number; skipped: number }> {
    const campaign = await prisma.outreachCampaign.findFirst({
      where: { id: campaignId, practiceId },
      include: { steps: { where: { isActive: true } } },
    });

    if (!campaign || !campaign.isSequence) {
      throw new Error('Invalid sequence campaign');
    }

    const days = this.getTriggerDays(campaign.triggerType);
    const patients = await this.benefitsEngine.getExpiringBenefits(
      practiceId,
      days,
      Number(campaign.minBenefitAmount)
    );

    let enrolled = 0;
    let skipped = 0;

    for (const patient of patients) {
      try {
        await this.enrollPatientInSequence(campaignId, patient.patientId);
        enrolled++;
      } catch (error) {
        skipped++;
      }
    }

    return { enrolled, skipped };
  }

  /**
   * Log outreach with step information
   */
  private async logOutreachWithStep(
    campaignId: string,
    patientId: string,
    stepId: string,
    stepNumber: number,
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
          stepId,
          stepNumber,
          messageType,
          messageContent,
          ...(messageType === 'email' && { recipientEmail: recipient }),
          ...(messageType === 'sms' && { recipientPhone: recipient }),
          status: result.success ? 'sent' : 'failed',
          sentAt: result.success ? new Date() : null,
          externalId: result.messageId,
          messagingProvider: result.provider || null,
          errorMessage: result.error,
        },
      });
    } catch (error) {
      console.error('Log outreach with step error:', error);
    }
  }
}

