import twilio, { Twilio } from 'twilio';
import sgMail, { MailService } from '@sendgrid/mail';
import { prisma } from '../lib/prisma';
import { decryptIfPresent } from './credentialEncryption';

/**
 * MessagingServiceFactory
 * 
 * Factory service that provides SendGrid and Twilio clients based on 
 * practice configuration. Supports both system-wide default credentials
 * and per-practice custom credentials with fallback logic.
 * 
 * Features:
 * - Multi-tenant messaging support
 * - Automatic fallback to system credentials
 * - Client caching for performance
 * - Credential validation
 */

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  domainVerified: boolean;
  provider: 'system' | 'custom';
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  provider: 'system' | 'custom';
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  provider?: 'system' | 'custom';
}

// Client cache with TTL
interface CachedClient<T> {
  client: T;
  timestamp: number;
  provider: 'system' | 'custom';
}

export class MessagingServiceFactory {
  private sendGridCache = new Map<string, CachedClient<MailService>>();
  private twilioCache = new Map<string, CachedClient<Twilio>>();
  private cacheTTL = 3600000; // 1 hour in milliseconds

  /**
   * Get SendGrid client for a practice
   */
  async getSendGridClient(practiceId: string): Promise<{ client: MailService; config: SendGridConfig }> {
    // Check cache first
    const cached = this.sendGridCache.get(practiceId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      const config = await this.getSendGridConfig(practiceId, cached.provider);
      return { client: cached.client, config };
    }

    // Get practice configuration
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        emailProvider: true,
        sendgridApiKey: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
        emailDomainVerified: true,
        emailFallbackEnabled: true,
      },
    });

    if (!practice) {
      throw new Error(`Practice not found: ${practiceId}`);
    }

    // Try custom SendGrid first if configured
    if (practice.emailProvider === 'custom_sendgrid' && practice.sendgridApiKey) {
      try {
        const decryptedKey = decryptIfPresent(practice.sendgridApiKey);
        
        if (decryptedKey && practice.sendgridFromEmail) {
          // Validate the key by attempting to create a client
          const customClient = this.createSendGridClient(decryptedKey);
          
          const config: SendGridConfig = {
            apiKey: decryptedKey,
            fromEmail: practice.sendgridFromEmail,
            fromName: practice.sendgridFromName || practice.sendgridFromEmail,
            domainVerified: practice.emailDomainVerified,
            provider: 'custom',
          };

          // Cache the client
          this.sendGridCache.set(practiceId, {
            client: customClient,
            timestamp: Date.now(),
            provider: 'custom',
          });

          console.log(`Using custom SendGrid for practice ${practiceId}`);
          return { client: customClient, config };
        }
      } catch (error: any) {
        console.error(`Failed to initialize custom SendGrid for practice ${practiceId}:`, error.message);
        
        // If fallback is disabled, throw error
        if (!practice.emailFallbackEnabled) {
          throw new Error('Custom SendGrid configuration failed and fallback is disabled');
        }
        
        console.log(`Falling back to system SendGrid for practice ${practiceId}`);
      }
    }

    // Use system SendGrid (default or fallback)
    const systemClient = this.getSystemSendGridClient();
    const config: SendGridConfig = {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@dentite.com',
      fromName: process.env.SENDGRID_FROM_NAME || 'Dentite',
      domainVerified: true,
      provider: 'system',
    };

    // Cache the system client
    this.sendGridCache.set(practiceId, {
      client: systemClient,
      timestamp: Date.now(),
      provider: 'system',
    });

    return { client: systemClient, config };
  }

  /**
   * Get Twilio client for a practice
   */
  async getTwilioClient(practiceId: string): Promise<{ client: Twilio; config: TwilioConfig }> {
    // Check cache first
    const cached = this.twilioCache.get(practiceId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      const config = await this.getTwilioConfig(practiceId, cached.provider);
      return { client: cached.client, config };
    }

    // Get practice configuration
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        smsProvider: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        smsFallbackEnabled: true,
      },
    });

    if (!practice) {
      throw new Error(`Practice not found: ${practiceId}`);
    }

    // Try custom Twilio first if configured
    if (practice.smsProvider === 'custom_twilio' && practice.twilioAccountSid && practice.twilioAuthToken) {
      try {
        const decryptedSid = decryptIfPresent(practice.twilioAccountSid);
        const decryptedToken = decryptIfPresent(practice.twilioAuthToken);
        
        if (!decryptedSid || !decryptedToken) {
          throw new Error('Failed to decrypt Twilio credentials');
        }
        
        if (!practice.twilioPhoneNumber) {
          throw new Error('Twilio phone number is required');
        }
        
        const customClient = twilio(decryptedSid, decryptedToken);
        
        const config: TwilioConfig = {
          accountSid: decryptedSid,
          authToken: decryptedToken,
          phoneNumber: practice.twilioPhoneNumber,
          provider: 'custom',
        };

        // Cache the client
        this.twilioCache.set(practiceId, {
          client: customClient,
          timestamp: Date.now(),
          provider: 'custom',
        });

        console.log(`Using custom Twilio for practice ${practiceId}`);
        return { client: customClient, config };
      } catch (error: any) {
        console.error(`Failed to initialize custom Twilio for practice ${practiceId}:`, error.message);
        
        // If fallback is disabled, throw error
        if (!practice.smsFallbackEnabled) {
          throw new Error(`Custom Twilio configuration failed: ${error.message}`);
        }
        
        console.log(`Falling back to system Twilio for practice ${practiceId}`);
      }
    }

    // Use system Twilio (default or fallback)
    const systemClient = this.getSystemTwilioClient();
    
    if (!systemClient) {
      throw new Error('No SMS provider available. Please configure either custom Twilio credentials or system Twilio credentials.');
    }
    
    const config: TwilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      provider: 'system',
    };

    // Cache the system client
    this.twilioCache.set(practiceId, {
      client: systemClient,
      timestamp: Date.now(),
      provider: 'system',
    });

    return { client: systemClient, config };
  }

  /**
   * Validate email configuration for a practice
   */
  async validateEmailConfig(practiceId: string): Promise<ValidationResult> {
    try {
      const { client, config } = await this.getSendGridClient(practiceId);
      
      // Simple validation: check if we can create a client
      if (!client || !config.apiKey) {
        return {
          isValid: false,
          error: 'Invalid SendGrid configuration',
        };
      }

      // For custom configs, verify the domain is configured
      if (config.provider === 'custom' && !config.domainVerified) {
        return {
          isValid: false,
          error: 'Email domain not verified. Please complete DNS verification.',
        };
      }

      return {
        isValid: true,
        provider: config.provider,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate SMS configuration for a practice
   */
  async validateSmsConfig(practiceId: string): Promise<ValidationResult> {
    try {
      const { client, config } = await this.getTwilioClient(practiceId);
      
      if (!client || !config.accountSid || !config.phoneNumber) {
        return {
          isValid: false,
          error: 'Invalid Twilio configuration',
        };
      }

      return {
        isValid: true,
        provider: config.provider,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a test email to validate configuration
   */
  async sendTestEmail(practiceId: string, recipientEmail: string): Promise<ValidationResult> {
    try {
      const { client, config } = await this.getSendGridClient(practiceId);
      
      await client.send({
        to: recipientEmail,
        from: {
          email: config.fromEmail,
          name: config.fromName,
        },
        subject: 'Test Email - Dentite Configuration',
        text: `This is a test email from Dentite using ${config.provider} SendGrid configuration.`,
        html: `<p>This is a test email from Dentite using <strong>${config.provider}</strong> SendGrid configuration.</p>`,
      });

      // Update last tested timestamp
      await prisma.practice.update({
        where: { id: practiceId },
        data: { emailLastTestedAt: new Date() },
      });

      return {
        isValid: true,
        provider: config.provider,
      };
    } catch (error: any) {
      console.error('Test email failed:', error);
      return {
        isValid: false,
        error: error.message || 'Failed to send test email',
      };
    }
  }

  /**
   * Send a test SMS to validate configuration
   */
  async sendTestSms(practiceId: string, recipientPhone: string): Promise<ValidationResult> {
    try {
      const { client, config } = await this.getTwilioClient(practiceId);
      
      await client.messages.create({
        to: recipientPhone,
        from: config.phoneNumber,
        body: `This is a test SMS from Dentite using ${config.provider} Twilio configuration.`,
      });

      // Update last tested timestamp
      await prisma.practice.update({
        where: { id: practiceId },
        data: { smsLastTestedAt: new Date() },
      });

      return {
        isValid: true,
        provider: config.provider,
      };
    } catch (error: any) {
      console.error('Test SMS failed:', error);
      return {
        isValid: false,
        error: error.message || 'Failed to send test SMS',
      };
    }
  }

  /**
   * Clear cache for a specific practice
   */
  clearCache(practiceId: string): void {
    this.sendGridCache.delete(practiceId);
    this.twilioCache.delete(practiceId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.sendGridCache.clear();
    this.twilioCache.clear();
  }

  // Private helper methods

  private createSendGridClient(apiKey: string): MailService {
    const client = Object.create(sgMail);
    client.setApiKey(apiKey);
    return client;
  }

  private getSystemSendGridClient(): MailService {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('System SendGrid not configured (SENDGRID_API_KEY missing)');
    }
    
    const client = Object.create(sgMail);
    client.setApiKey(process.env.SENDGRID_API_KEY);
    return client;
  }

  private getSystemTwilioClient(): Twilio | null {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('System Twilio not configured (credentials missing)');
      return null;
    }
    
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  private async getSendGridConfig(practiceId: string, provider: 'system' | 'custom'): Promise<SendGridConfig> {
    if (provider === 'system') {
      return {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@dentite.com',
        fromName: process.env.SENDGRID_FROM_NAME || 'Dentite',
        domainVerified: true,
        provider: 'system',
      };
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        sendgridApiKey: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
        emailDomainVerified: true,
      },
    });

    if (!practice) {
      throw new Error(`Practice not found: ${practiceId}`);
    }

    return {
      apiKey: decryptIfPresent(practice.sendgridApiKey) || '',
      fromEmail: practice.sendgridFromEmail || '',
      fromName: practice.sendgridFromName || '',
      domainVerified: practice.emailDomainVerified,
      provider: 'custom',
    };
  }

  private async getTwilioConfig(practiceId: string, provider: 'system' | 'custom'): Promise<TwilioConfig> {
    if (provider === 'system') {
      return {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        provider: 'system',
      };
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
      },
    });

    if (!practice) {
      throw new Error(`Practice not found: ${practiceId}`);
    }

    return {
      accountSid: decryptIfPresent(practice.twilioAccountSid) || '',
      authToken: decryptIfPresent(practice.twilioAuthToken) || '',
      phoneNumber: practice.twilioPhoneNumber || '',
      provider: 'custom',
    };
  }
}

// Singleton instance
let factoryInstance: MessagingServiceFactory | null = null;

/**
 * Get the singleton factory instance
 */
export function getMessagingFactory(): MessagingServiceFactory {
  if (!factoryInstance) {
    factoryInstance = new MessagingServiceFactory();
  }
  return factoryInstance;
}

