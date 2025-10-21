import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getMessagingSettings,
  updateEmailConfig,
  updateSmsConfig,
  initiateDomainVerification,
  checkVerificationStatus,
  getDnsInstructions,
  testEmailConfig,
  testSmsConfig,
  deleteEmailConfig,
  deleteSmsConfig,
  getPmsConfig,
  updatePmsConfig,
  testPmsConnection,
  deletePmsConfig,
} from '../controllers/practiceSettings.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Practice messaging settings routes
 */

// Get practice messaging settings
router.get('/:practiceId/messaging-settings', getMessagingSettings);

// Email configuration
router.put('/:practiceId/email-config', updateEmailConfig);
router.post('/:practiceId/email-config/test', testEmailConfig);
router.delete('/:practiceId/email-config', deleteEmailConfig);

// Domain verification
router.post('/:practiceId/email-config/verify', initiateDomainVerification);
router.get('/:practiceId/email-config/verify-status', checkVerificationStatus);
router.get('/:practiceId/dns-instructions', getDnsInstructions);

// SMS configuration
router.put('/:practiceId/sms-config', updateSmsConfig);
router.post('/:practiceId/sms-config/test', testSmsConfig);
router.delete('/:practiceId/sms-config', deleteSmsConfig);

// PMS/ERP configuration
router.get('/:practiceId/pms-config', getPmsConfig);
router.put('/:practiceId/pms-config', updatePmsConfig);
router.post('/:practiceId/pms-config/test', testPmsConnection);
router.delete('/:practiceId/pms-config', deletePmsConfig);

export default router;

