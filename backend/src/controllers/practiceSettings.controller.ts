import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { encryptIfPresent, decryptIfPresent } from '../services/credentialEncryption';
import { getMessagingFactory } from '../services/messagingServiceFactory';
import { getDomainVerification } from '../services/domainVerification';

/**
 * PracticeSettings Controller
 * 
 * Handles practice-level configuration for multi-tenant messaging:
 * - Email configuration (SendGrid)
 * - SMS configuration (Twilio)
 * - Domain verification
 * - Test messaging
 */

/**
 * Get practice messaging settings
 * GET /api/practices/:practiceId/messaging-settings
 */
export const getMessagingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access to this practice
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        id: true,
        name: true,
        email: true,
        // Email settings (decrypt API key for validation only, don't send to client)
        emailProvider: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
        emailDomainVerified: true,
        emailVerificationStatus: true,
        emailDnsRecords: true,
        emailFallbackEnabled: true,
        emailLastTestedAt: true,
        // SMS settings (decrypt credentials for validation only, don't send to client)
        smsProvider: true,
        twilioPhoneNumber: true,
        smsVerificationStatus: true,
        smsFallbackEnabled: true,
        smsLastTestedAt: true,
        // Don't send encrypted credentials to client
        sendgridApiKey: false,
        twilioAccountSid: false,
        twilioAuthToken: false,
      },
    });

    if (!practice) {
      res.status(404).json({ error: 'Practice not found' });
      return;
    }

    // Check if credentials are configured (without exposing them)
    const hasCustomSendGrid = practice.emailProvider === 'custom_sendgrid';
    const hasCustomTwilio = practice.smsProvider === 'custom_twilio';

    res.json({
      ...practice,
      hasCustomSendGrid,
      hasCustomTwilio,
    });
  } catch (error: any) {
    console.error('Get messaging settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve messaging settings' });
  }
};

/**
 * Update email configuration
 * PUT /api/practices/:practiceId/email-config
 */
export const updateEmailConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;
    const {
      emailProvider,
      sendgridApiKey,
      sendgridFromEmail,
      sendgridFromName,
      emailFallbackEnabled,
    } = req.body;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Validate provider
    if (emailProvider && !['system', 'custom_sendgrid'].includes(emailProvider)) {
      res.status(400).json({ error: 'Invalid email provider' });
      return;
    }

    // If switching to custom, require credentials
    if (emailProvider === 'custom_sendgrid' && !sendgridApiKey) {
      // Check if existing key is present
      const existing = await prisma.practice.findUnique({
        where: { id: practiceId },
        select: { sendgridApiKey: true },
      });

      if (!existing?.sendgridApiKey) {
        res.status(400).json({ 
          error: 'SendGrid API key is required for custom configuration'
        });
        return;
      }
    }

    // Validate email format
    if (sendgridFromEmail && !isValidEmail(sendgridFromEmail)) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (emailProvider !== undefined) {
      updateData.emailProvider = emailProvider;
    }

    if (sendgridApiKey) {
      // Encrypt the API key
      updateData.sendgridApiKey = encryptIfPresent(sendgridApiKey);
    }

    if (sendgridFromEmail !== undefined) {
      updateData.sendgridFromEmail = sendgridFromEmail;
    }

    if (sendgridFromName !== undefined) {
      updateData.sendgridFromName = sendgridFromName;
    }

    if (emailFallbackEnabled !== undefined) {
      updateData.emailFallbackEnabled = emailFallbackEnabled;
    }

    // If switching back to system, clear custom settings
    if (emailProvider === 'system') {
      updateData.sendgridApiKey = null;
      updateData.sendgridDomainId = null;
      updateData.emailDnsRecords = null;
      updateData.emailDomainVerified = false;
      updateData.emailVerificationStatus = null;
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: updateData,
      select: {
        emailProvider: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
        emailFallbackEnabled: true,
      },
    });

    // Clear messaging cache
    getMessagingFactory().clearCache(practiceId);

    res.json({
      success: true,
      practice,
    });
  } catch (error: any) {
    console.error('Update email config error:', error);
    res.status(500).json({ error: 'Failed to update email configuration' });
  }
};

/**
 * Update SMS configuration
 * PUT /api/practices/:practiceId/sms-config
 */
export const updateSmsConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;
    const {
      smsProvider,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      smsFallbackEnabled,
    } = req.body;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Validate provider
    if (smsProvider && !['system', 'custom_twilio'].includes(smsProvider)) {
      res.status(400).json({ error: 'Invalid SMS provider' });
      return;
    }

    // If switching to custom, require credentials
    if (smsProvider === 'custom_twilio') {
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        // Check if existing credentials are present
        const existing = await prisma.practice.findUnique({
          where: { id: practiceId },
          select: { 
            twilioAccountSid: true,
            twilioAuthToken: true,
            twilioPhoneNumber: true,
          },
        });

        if (!existing?.twilioAccountSid || !existing?.twilioAuthToken || !existing?.twilioPhoneNumber) {
          res.status(400).json({ 
            error: 'Twilio credentials (Account SID, Auth Token, and Phone Number) are required' 
          });
          return;
        }
      }
    }

    // Validate phone number format (basic E.164 format)
    if (twilioPhoneNumber && !isValidPhoneNumber(twilioPhoneNumber)) {
      res.status(400).json({ 
        error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' 
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (smsProvider !== undefined) {
      updateData.smsProvider = smsProvider;
    }

    if (twilioAccountSid) {
      updateData.twilioAccountSid = encryptIfPresent(twilioAccountSid);
    }

    if (twilioAuthToken) {
      updateData.twilioAuthToken = encryptIfPresent(twilioAuthToken);
    }

    if (twilioPhoneNumber !== undefined) {
      updateData.twilioPhoneNumber = twilioPhoneNumber;
    }

    if (smsFallbackEnabled !== undefined) {
      updateData.smsFallbackEnabled = smsFallbackEnabled;
    }

    // If switching back to system, clear custom settings
    if (smsProvider === 'system') {
      updateData.twilioAccountSid = null;
      updateData.twilioAuthToken = null;
      updateData.twilioPhoneNumber = null;
      updateData.smsVerificationStatus = null;
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: updateData,
      select: {
        smsProvider: true,
        twilioPhoneNumber: true,
        smsFallbackEnabled: true,
      },
    });

    // Clear messaging cache
    getMessagingFactory().clearCache(practiceId);

    res.json({
      success: true,
      practice,
    });
  } catch (error: any) {
    console.error('Update SMS config error:', error);
    res.status(500).json({ error: 'Failed to update SMS configuration' });
  }
};

/**
 * Initiate domain verification
 * POST /api/practices/:practiceId/email-config/verify
 */
export const initiateDomainVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;
    const { domain } = req.body;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!domain) {
      res.status(400).json({ error: 'Domain is required' });
      return;
    }

    const verificationService = getDomainVerification();
    const dnsRecords = await verificationService.initiateDomainVerification(practiceId, domain);

    res.json({
      success: true,
      domain: dnsRecords.domain,
      records: dnsRecords.records,
      instructions: dnsRecords.instructions,
    });
  } catch (error: any) {
    console.error('Initiate domain verification error:', error);
    res.status(400).json({ error: error.message || 'Failed to initiate domain verification' });
  }
};

/**
 * Check domain verification status
 * GET /api/practices/:practiceId/email-config/verify-status
 */
export const checkVerificationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const verificationService = getDomainVerification();
    const status = await verificationService.checkVerificationStatus(practiceId);

    res.json(status);
  } catch (error: any) {
    console.error('Check verification status error:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
};

/**
 * Manually mark domain as verified (for pre-verified domains)
 * POST /api/practices/:practiceId/email-config/verify-manual
 */
export const markDomainAsVerified = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Update the practice to mark domain as verified
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        emailDomainVerified: true,
        emailVerificationStatus: 'verified',
        emailLastTestedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Domain marked as verified successfully',
      verified: true,
      status: 'verified',
    });
  } catch (error: any) {
    console.error('Mark domain as verified error:', error);
    res.status(500).json({ error: 'Failed to mark domain as verified' });
  }
};

/**
 * Get DNS instructions
 * GET /api/practices/:practiceId/dns-instructions
 */
export const getDnsInstructions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const verificationService = getDomainVerification();
    const instructions = await verificationService.getDnsInstructions(practiceId);

    res.json(instructions);
  } catch (error: any) {
    console.error('Get DNS instructions error:', error);
    res.status(404).json({ error: error.message || 'DNS instructions not available' });
  }
};

/**
 * Test email configuration
 * POST /api/practices/:practiceId/email-config/test
 */
export const testEmailConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;
    const { recipientEmail } = req.body;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      res.status(400).json({ error: 'Valid recipient email is required' });
      return;
    }

    const factory = getMessagingFactory();
    const result = await factory.sendTestEmail(practiceId, recipientEmail);

    if (result.isValid) {
      res.json({
        success: true,
        message: `Test email sent successfully using ${result.provider} provider`,
        provider: result.provider,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send test email',
      });
    }
  } catch (error: any) {
    console.error('Test email config error:', error);
    res.status(500).json({ error: 'Failed to test email configuration' });
  }
};

/**
 * Test SMS configuration
 * POST /api/practices/:practiceId/sms-config/test
 */
export const testSmsConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;
    const { recipientPhone } = req.body;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!recipientPhone || !isValidPhoneNumber(recipientPhone)) {
      res.status(400).json({ 
        error: 'Valid recipient phone number is required (E.164 format)' 
      });
      return;
    }

    const factory = getMessagingFactory();
    const result = await factory.sendTestSms(practiceId, recipientPhone);

    if (result.isValid) {
      res.json({
        success: true,
        message: `Test SMS sent successfully using ${result.provider} provider`,
        provider: result.provider,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send test SMS',
      });
    }
  } catch (error: any) {
    console.error('Test SMS config error:', error);
    res.status(500).json({ error: 'Failed to test SMS configuration' });
  }
};

/**
 * Delete email configuration
 * DELETE /api/practices/:practiceId/email-config
 */
export const deleteEmailConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Delete domain authentication
    const verificationService = getDomainVerification();
    await verificationService.deleteDomainAuthentication(practiceId);

    // Reset to system provider
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        emailProvider: 'system',
        sendgridApiKey: null,
        sendgridFromEmail: null,
        sendgridFromName: null,
        sendgridDomainId: null,
        emailDnsRecords: Prisma.JsonNull,
        emailDomainVerified: false,
        emailVerificationStatus: null,
      },
    });

    // Clear cache
    getMessagingFactory().clearCache(practiceId);

    res.json({
      success: true,
      message: 'Email configuration deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete email config error:', error);
    res.status(500).json({ error: 'Failed to delete email configuration' });
  }
};

/**
 * Delete SMS configuration
 * DELETE /api/practices/:practiceId/sms-config
 */
export const deleteSmsConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Reset to system provider
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        smsProvider: 'system',
        twilioAccountSid: null,
        twilioAuthToken: null,
        twilioPhoneNumber: null,
        smsVerificationStatus: null,
      },
    });

    // Clear cache
    getMessagingFactory().clearCache(practiceId);

    res.json({
      success: true,
      message: 'SMS configuration deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete SMS config error:', error);
    res.status(500).json({ error: 'Failed to delete SMS configuration' });
  }
};

// Helper functions

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Get PMS configuration
 * GET /api/practices/:practiceId/pms-config
 */
export const getPmsConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        id: true,
        pmsType: true,
        pmsUrl: true,
        pmsConfig: true,
        // Don't send encrypted API key
        pmsApiKey: false,
        openDentalApiKey: false,
      },
    });

    if (!practice) {
      res.status(404).json({ error: 'Practice not found' });
      return;
    }

    // Check if credentials are configured
    const hasPmsConfig = !!practice.pmsType;

    res.json({
      ...practice,
      hasPmsConfig,
    });
  } catch (error: any) {
    console.error('Get PMS config error:', error);
    res.status(500).json({ error: 'Failed to retrieve PMS configuration' });
  }
};

/**
 * Update PMS configuration
 * PUT /api/practices/:practiceId/pms-config
 */
export const updatePmsConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;
    const {
      pmsType,
      pmsApiKey,
      pmsUrl,
      pmsConfig,
    } = req.body;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Validate PMS type
    const validPmsTypes = ['opendental', 'ortho2edge', 'dentrix', 'eaglesoft', 'other'];
    if (pmsType && !validPmsTypes.includes(pmsType)) {
      res.status(400).json({ 
        error: `Invalid PMS type. Must be one of: ${validPmsTypes.join(', ')}` 
      });
      return;
    }

    // Validate URL format if provided
    if (pmsUrl && !isValidUrl(pmsUrl)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (pmsType !== undefined) {
      updateData.pmsType = pmsType;
    }

    if (pmsApiKey) {
      // Encrypt the API key
      updateData.pmsApiKey = encryptIfPresent(pmsApiKey);
      // Also update legacy field for backward compatibility
      if (pmsType === 'opendental') {
        updateData.openDentalApiKey = encryptIfPresent(pmsApiKey);
      }
    }

    if (pmsUrl !== undefined) {
      updateData.pmsUrl = pmsUrl;
      // Also update legacy field for backward compatibility
      if (pmsType === 'opendental') {
        updateData.openDentalUrl = pmsUrl;
      }
    }

    if (pmsConfig !== undefined) {
      updateData.pmsConfig = pmsConfig;
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: updateData,
      select: {
        pmsType: true,
        pmsUrl: true,
        pmsConfig: true,
      },
    });

    res.json({
      success: true,
      practice,
    });
  } catch (error: any) {
    console.error('Update PMS config error:', error);
    res.status(500).json({ error: 'Failed to update PMS configuration' });
  }
};

/**
 * Test PMS connection
 * POST /api/practices/:practiceId/pms-config/test
 */
export const testPmsConnection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        pmsType: true,
        pmsApiKey: true,
        pmsUrl: true,
      },
    });

    if (!practice) {
      res.status(404).json({ error: 'Practice not found' });
      return;
    }

    if (!practice.pmsType || !practice.pmsApiKey || !practice.pmsUrl) {
      res.status(400).json({ 
        error: 'PMS configuration incomplete. Please configure PMS type, API key, and URL.' 
      });
      return;
    }

    // Decrypt API key
    const apiKey = decryptIfPresent(practice.pmsApiKey);
    if (!apiKey) {
      res.status(400).json({ error: 'Failed to decrypt API key' });
      return;
    }

    // Test connection based on PMS type
    let testResult;
    switch (practice.pmsType) {
      case 'opendental':
        testResult = await testOpenDentalConnection(practice.pmsUrl, apiKey);
        break;
      case 'ortho2edge':
        testResult = await testOrtho2EdgeConnection(practice.pmsUrl, apiKey);
        break;
      default:
        testResult = await testGenericConnection(practice.pmsUrl, apiKey);
    }

    if (testResult.success) {
      res.json({
        success: true,
        message: `Successfully connected to ${practice.pmsType}`,
        details: testResult.details,
      });
    } else {
      res.status(400).json({
        success: false,
        error: testResult.error || 'Connection test failed',
      });
    }
  } catch (error: any) {
    console.error('Test PMS connection error:', error);
    res.status(500).json({ error: 'Failed to test PMS connection' });
  }
};

/**
 * Delete PMS configuration
 * DELETE /api/practices/:practiceId/pms-config
 */
export const deletePmsConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { practiceId } = req.params;

    // Verify user has access
    if (req.user && req.user.practiceId !== practiceId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Clear PMS configuration
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        pmsType: null,
        pmsApiKey: null,
        pmsUrl: null,
        pmsConfig: Prisma.JsonNull,
      },
    });

    res.json({
      success: true,
      message: 'PMS configuration deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete PMS config error:', error);
    res.status(500).json({ error: 'Failed to delete PMS configuration' });
  }
};

// Helper functions for PMS connection testing

async function testOpenDentalConnection(url: string, apiKey: string): Promise<any> {
  try {
    const response = await axios.get(`${url}/api/patients?limit=1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });
    
    return {
      success: true,
      details: {
        status: response.status,
        message: 'OpenDental API is accessible',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Connection failed',
    };
  }
}

async function testOrtho2EdgeConnection(url: string, apiKey: string): Promise<any> {
  try {
    const response = await axios.get(`${url}/api/v1/patients?limit=1`, {
      headers: {
        'X-API-Key': apiKey,
      },
      timeout: 10000,
    });
    
    return {
      success: true,
      details: {
        status: response.status,
        message: 'Ortho2Edge API is accessible',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Connection failed',
    };
  }
}

async function testGenericConnection(url: string, apiKey: string): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });
    
    return {
      success: true,
      details: {
        status: response.status,
        message: 'API is accessible',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Connection failed',
    };
  }
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

