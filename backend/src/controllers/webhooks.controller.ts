import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export class WebhooksController {
  /**
   * Handle SendGrid webhook events (Multi-tenant support)
   * Events: delivered, open, click, bounce, dropped, spamreport, unsubscribe
   * 
   * Multi-tenant: Extracts practiceId from customArgs to support multiple SendGrid accounts
   */
  handleSendGridWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Note: Signature verification uses system credentials
      // For custom SendGrid accounts, signature verification happens at SendGrid's end
      if (process.env.SENDGRID_WEBHOOK_VERIFY_KEY) {
        const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
        const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
        
        if (!this.verifySendGridSignature(signature, timestamp, JSON.stringify(req.body))) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      const events = Array.isArray(req.body) ? req.body : [req.body];

      for (const event of events) {
        await this.processSendGridEvent(event);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('SendGrid webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  };

  /**
   * Handle Twilio status callback webhook (Multi-tenant support)
   * Status: queued, sent, delivered, failed, undelivered
   * 
   * Multi-tenant: Accepts practiceId as query parameter for routing
   * URL format: /api/webhooks/twilio?practiceId={id}
   */
  handleTwilioWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const practiceId = req.query.practiceId as string | undefined;
      
      // Verify Twilio signature (using system credentials for now)
      // Note: For custom Twilio accounts, verification would need practice-specific auth token
      if (process.env.TWILIO_AUTH_TOKEN) {
        const signature = req.headers['x-twilio-signature'] as string;
        let url = `${process.env.WEBHOOK_BASE_URL || 'https://localhost'}/api/webhooks/twilio`;
        if (practiceId) {
          url += `?practiceId=${practiceId}`;
        }
        
        if (!this.verifyTwilioSignature(signature, url, req.body)) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      await this.processTwilioEvent(req.body, practiceId);

      res.status(200).send('OK');
    } catch (error) {
      console.error('Twilio webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  };

  /**
   * Process SendGrid event and update OutreachLog
   * Multi-tenant: Works with both system and custom SendGrid accounts
   */
  private async processSendGridEvent(event: any): Promise<void> {
    try {
      const { sg_message_id, event: eventType, email, timestamp } = event;
      
      if (!sg_message_id) {
        console.warn('SendGrid event missing message ID:', event);
        return;
      }

      // Find the outreach log by SendGrid message ID
      // This works for both system and custom SendGrid accounts
      const outreachLog = await prisma.outreachLog.findFirst({
        where: { externalId: sg_message_id },
        include: {
          campaign: {
            select: { practiceId: true, name: true },
          },
        },
      });

      if (!outreachLog) {
        console.warn(`OutreachLog not found for message ID: ${sg_message_id}`);
        return;
      }

      console.log(`Processing SendGrid ${eventType} for practice ${outreachLog.campaign.practiceId} (provider: ${outreachLog.messagingProvider || 'unknown'})`);

      // Check for duplicate event (idempotency)
      const existingEvent = await prisma.messageEvent.findFirst({
        where: {
          outreachLogId: outreachLog.id,
          eventType: eventType,
          timestamp: new Date(timestamp * 1000),
        },
      });

      if (existingEvent) {
        console.log(`Duplicate event ${eventType} for log ${outreachLog.id}, skipping`);
        return;
      }

      // Store the event
      await prisma.messageEvent.create({
        data: {
          outreachLogId: outreachLog.id,
          eventType: eventType,
          eventData: event,
          provider: 'sendgrid',
          timestamp: new Date(timestamp * 1000),
          processed: true,
        },
      });

      // Update OutreachLog based on event type
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Get current webhook events array and append new event
      const currentEvents = (outreachLog.webhookEvents as any[]) || [];
      updateData.webhookEvents = [...currentEvents, event];

      switch (eventType) {
        case 'delivered':
          updateData.status = 'delivered';
          updateData.deliveredAt = new Date(timestamp * 1000);
          break;

        case 'open':
          updateData.openCount = outreachLog.openCount + 1;
          if (!outreachLog.openedAt) {
            updateData.openedAt = new Date(timestamp * 1000);
          }
          break;

        case 'click':
          updateData.clickCount = outreachLog.clickCount + 1;
          if (!outreachLog.clickedAt) {
            updateData.clickedAt = new Date(timestamp * 1000);
          }
          break;

        case 'bounce':
        case 'dropped':
          updateData.status = 'failed';
          updateData.bouncedAt = new Date(timestamp * 1000);
          updateData.bounceType = event.type || 'hard'; // hard, soft
          updateData.errorMessage = event.reason || 'Message bounced';
          break;

        case 'spamreport':
          updateData.status = 'failed';
          updateData.errorMessage = 'Marked as spam';
          break;

        case 'unsubscribe':
          updateData.unsubscribedAt = new Date(timestamp * 1000);
          
          // Update patient preferences
          await prisma.patientPreferences.upsert({
            where: { patientId: outreachLog.patientId },
            create: {
              patientId: outreachLog.patientId,
              emailOptOut: true,
              unsubscribeReason: 'User unsubscribed via email',
            },
            update: {
              emailOptOut: true,
              unsubscribeReason: 'User unsubscribed via email',
              updatedAt: new Date(),
            },
          });
          break;
      }

      await prisma.outreachLog.update({
        where: { id: outreachLog.id },
        data: updateData,
      });

      console.log(`Processed SendGrid ${eventType} event for log ${outreachLog.id}`);
    } catch (error) {
      console.error('Process SendGrid event error:', error);
      throw error;
    }
  }

  /**
   * Process Twilio event and update OutreachLog
   * Multi-tenant: Works with both system and custom Twilio accounts
   */
  private async processTwilioEvent(event: any, practiceId?: string): Promise<void> {
    try {
      const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = event;

      if (!MessageSid) {
        console.warn('Twilio event missing MessageSid:', event);
        return;
      }

      // Find the outreach log by Twilio message SID
      // Optionally filter by practice ID for additional security
      const where: any = { externalId: MessageSid };
      if (practiceId) {
        where.campaign = { practiceId };
      }

      const outreachLog = await prisma.outreachLog.findFirst({
        where,
        include: {
          campaign: {
            select: { practiceId: true, name: true },
          },
        },
      });

      if (!outreachLog) {
        console.warn(`OutreachLog not found for MessageSid: ${MessageSid}${practiceId ? ` (practice: ${practiceId})` : ''}`);
        return;
      }

      console.log(`Processing Twilio ${MessageStatus} for practice ${outreachLog.campaign.practiceId} (provider: ${outreachLog.messagingProvider || 'unknown'})`);

      // Check for duplicate event
      const existingEvent = await prisma.messageEvent.findFirst({
        where: {
          outreachLogId: outreachLog.id,
          eventType: MessageStatus,
        },
      });

      if (existingEvent) {
        console.log(`Duplicate event ${MessageStatus} for log ${outreachLog.id}, skipping`);
        return;
      }

      // Store the event
      await prisma.messageEvent.create({
        data: {
          outreachLogId: outreachLog.id,
          eventType: MessageStatus,
          eventData: event,
          provider: 'twilio',
          timestamp: new Date(),
          processed: true,
        },
      });

      // Update OutreachLog based on status
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Get current webhook events array and append new event
      const currentEvents = (outreachLog.webhookEvents as any[]) || [];
      updateData.webhookEvents = [...currentEvents, event];

      switch (MessageStatus) {
        case 'sent':
          updateData.status = 'sent';
          break;

        case 'delivered':
          updateData.status = 'delivered';
          updateData.deliveredAt = new Date();
          break;

        case 'failed':
        case 'undelivered':
          updateData.status = 'failed';
          updateData.errorMessage = ErrorMessage || `Error code: ${ErrorCode}`;
          break;
      }

      await prisma.outreachLog.update({
        where: { id: outreachLog.id },
        data: updateData,
      });

      console.log(`Processed Twilio ${MessageStatus} event for log ${outreachLog.id}`);
    } catch (error) {
      console.error('Process Twilio event error:', error);
      throw error;
    }
  }

  /**
   * Verify SendGrid webhook signature
   */
  private verifySendGridSignature(
    signature: string,
    timestamp: string,
    payload: string
  ): boolean {
    try {
      const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFY_KEY;
      if (!verificationKey) return true; // Skip verification if not configured

      const signedPayload = timestamp + payload;
      const expectedSignature = crypto
        .createHmac('sha256', verificationKey)
        .update(signedPayload)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      console.error('SendGrid signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify Twilio webhook signature
   */
  private verifyTwilioSignature(signature: string, url: string, params: any): boolean {
    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) return true; // Skip verification if not configured

      const validator = require('twilio').validateRequest;
      return validator(authToken, signature, url, params);
    } catch (error) {
      console.error('Twilio signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle SMS STOP keyword for unsubscribe
   */
  handleTwilioIncoming = async (req: Request, res: Response): Promise<void> => {
    try {
      const { From, Body } = req.body;
      const messageBody = (Body || '').trim().toUpperCase();

      // Handle STOP, UNSUBSCRIBE keywords
      if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(messageBody)) {
        // Find patient by phone number
        const patient = await prisma.patient.findFirst({
          where: { phone: From },
        });

        if (patient) {
          await prisma.patientPreferences.upsert({
            where: { patientId: patient.id },
            create: {
              patientId: patient.id,
              smsOptOut: true,
              unsubscribeReason: `User sent ${messageBody} keyword`,
            },
            update: {
              smsOptOut: true,
              unsubscribeReason: `User sent ${messageBody} keyword`,
              updatedAt: new Date(),
            },
          });

          console.log(`Patient ${patient.id} opted out of SMS`);
        }
      }

      // Respond with TwiML (empty response is fine)
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error('Twilio incoming message error:', error);
      res.status(500).send('Error');
    }
  };
}

