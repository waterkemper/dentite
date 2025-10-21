import { MessagingServiceFactory } from '../messagingServiceFactory';
import { prisma } from '../../lib/prisma';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../credentialEncryption', () => ({
  decryptIfPresent: jest.fn((value) => value?.replace('encrypted_', '')),
}));

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

jest.mock('@sendgrid/mail', () => {
  const mockSendGridInstance = {
    setApiKey: jest.fn(),
    send: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockSendGridInstance,
  };
});

describe('MessagingServiceFactory', () => {
  let factory: MessagingServiceFactory;

  beforeEach(() => {
    factory = new MessagingServiceFactory();
    jest.clearAllMocks();

    // Setup default environment variables
    process.env.SENDGRID_API_KEY = 'system_sendgrid_key';
    process.env.SENDGRID_FROM_EMAIL = 'system@dentite.com';
    process.env.SENDGRID_FROM_NAME = 'Dentite';
    process.env.TWILIO_ACCOUNT_SID = 'system_twilio_sid';
    process.env.TWILIO_AUTH_TOKEN = 'system_twilio_token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';
  });

  describe('getSendGridClient', () => {
    it('should return system SendGrid client when provider is system', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'system',
        sendgridApiKey: null,
        sendgridFromEmail: null,
        sendgridFromName: null,
        emailDomainVerified: false,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.getSendGridClient('practice-1');

      expect(result.config.provider).toBe('system');
      expect(result.config.fromEmail).toBe('system@dentite.com');
      expect(result.client).toBeDefined();
    });

    it('should return custom SendGrid client when configured', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'custom_sendgrid',
        sendgridApiKey: 'encrypted_custom_key',
        sendgridFromEmail: 'custom@clinic.com',
        sendgridFromName: 'My Clinic',
        emailDomainVerified: true,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.getSendGridClient('practice-1');

      expect(result.config.provider).toBe('custom');
      expect(result.config.fromEmail).toBe('custom@clinic.com');
      expect(result.config.domainVerified).toBe(true);
    });

    it('should fallback to system when custom fails and fallback enabled', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'custom_sendgrid',
        sendgridApiKey: null, // Missing API key will cause failure
        sendgridFromEmail: 'custom@clinic.com',
        sendgridFromName: null,
        emailDomainVerified: false,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.getSendGridClient('practice-1');

      expect(result.config.provider).toBe('system'); // Fell back to system
    });

    it('should throw error when practice not found', async () => {
      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(factory.getSendGridClient('nonexistent')).rejects.toThrow(
        'Practice not found: nonexistent'
      );
    });
  });

  describe('getTwilioClient', () => {
    it('should return system Twilio client when provider is system', async () => {
      const mockPractice = {
        id: 'practice-1',
        smsProvider: 'system',
        twilioAccountSid: null,
        twilioAuthToken: null,
        twilioPhoneNumber: null,
        smsFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.getTwilioClient('practice-1');

      expect(result.config.provider).toBe('system');
      expect(result.config.phoneNumber).toBe('+1234567890');
      expect(result.client).toBeDefined();
    });

    it('should return custom Twilio client when configured', async () => {
      const mockPractice = {
        id: 'practice-1',
        smsProvider: 'custom_twilio',
        twilioAccountSid: 'encrypted_custom_sid',
        twilioAuthToken: 'encrypted_custom_token',
        twilioPhoneNumber: '+9876543210',
        smsFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.getTwilioClient('practice-1');

      expect(result.config.provider).toBe('custom');
      expect(result.config.phoneNumber).toBe('+9876543210');
    });

    it('should fallback to system when custom fails', async () => {
      const mockPractice = {
        id: 'practice-1',
        smsProvider: 'custom_twilio',
        twilioAccountSid: null, // Missing credentials
        twilioAuthToken: null,
        twilioPhoneNumber: '+9876543210',
        smsFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.getTwilioClient('practice-1');

      expect(result.config.provider).toBe('system'); // Fell back
    });
  });

  describe('caching', () => {
    it('should cache clients and reuse them', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'system',
        sendgridApiKey: null,
        sendgridFromEmail: null,
        sendgridFromName: null,
        emailDomainVerified: false,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      // First call
      await factory.getSendGridClient('practice-1');
      expect(prisma.practice.findUnique).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await factory.getSendGridClient('practice-1');
      expect(prisma.practice.findUnique).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should clear cache for specific practice', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'system',
        sendgridApiKey: null,
        sendgridFromEmail: null,
        sendgridFromName: null,
        emailDomainVerified: false,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      await factory.getSendGridClient('practice-1');
      factory.clearCache('practice-1');
      await factory.getSendGridClient('practice-1');

      expect(prisma.practice.findUnique).toHaveBeenCalledTimes(2); // Called twice after cache clear
    });

    it('should clear all caches', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'system',
        sendgridApiKey: null,
        sendgridFromEmail: null,
        sendgridFromName: null,
        emailDomainVerified: false,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      await factory.getSendGridClient('practice-1');
      factory.clearAllCaches();
      await factory.getSendGridClient('practice-1');

      expect(prisma.practice.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('validation', () => {
    it('should validate email configuration', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'system',
        sendgridApiKey: null,
        sendgridFromEmail: null,
        sendgridFromName: null,
        emailDomainVerified: false,
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.validateEmailConfig('practice-1');

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('system');
    });

    it('should fail validation for unverified custom domain', async () => {
      const mockPractice = {
        id: 'practice-1',
        emailProvider: 'custom_sendgrid',
        sendgridApiKey: 'encrypted_key',
        sendgridFromEmail: 'custom@clinic.com',
        sendgridFromName: 'Clinic',
        emailDomainVerified: false, // Not verified
        emailFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.validateEmailConfig('practice-1');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('domain not verified');
    });

    it('should validate SMS configuration', async () => {
      const mockPractice = {
        id: 'practice-1',
        smsProvider: 'system',
        twilioAccountSid: null,
        twilioAuthToken: null,
        twilioPhoneNumber: null,
        smsFallbackEnabled: true,
      };

      (prisma.practice.findUnique as jest.Mock).mockResolvedValue(mockPractice);

      const result = await factory.validateSmsConfig('practice-1');

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('system');
    });
  });
});

