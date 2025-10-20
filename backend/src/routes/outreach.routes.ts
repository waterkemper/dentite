import { Router } from 'express';
import { body } from 'express-validator';
import { OutreachController } from '../controllers/outreach.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const outreachController = new OutreachController();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/outreach/campaigns
 * Get all campaigns for the practice
 */
router.get('/campaigns', outreachController.getCampaigns);

/**
 * POST /api/outreach/campaigns
 * Create a new outreach campaign
 */
router.post(
  '/campaigns',
  [
    body('name').notEmpty().withMessage('Campaign name is required'),
    body('triggerType')
      .isIn(['expiring_60', 'expiring_30', 'expiring_14'])
      .withMessage('Invalid trigger type'),
    body('messageType')
      .isIn(['sms', 'email', 'both'])
      .withMessage('Invalid message type'),
    body('messageTemplate').notEmpty().withMessage('Message template is required'),
  ],
  validateRequest,
  outreachController.createCampaign
);

/**
 * GET /api/outreach/campaigns/:id
 * Get single campaign with metrics
 */
router.get('/campaigns/:id', outreachController.getCampaignById);

/**
 * PUT /api/outreach/campaigns/:id
 * Update an existing campaign
 */
router.put('/campaigns/:id', outreachController.updateCampaign);

/**
 * DELETE /api/outreach/campaigns/:id
 * Delete campaign if no messages delivered
 */
router.delete('/campaigns/:id', outreachController.deleteCampaign);

/**
 * GET /api/outreach/logs
 * Get outreach message history
 */
router.get('/logs', outreachController.getLogs);

/**
 * POST /api/outreach/send/:patientId
 * Manually send outreach message to a patient
 */
router.post('/send/:patientId', outreachController.sendManualMessage);

export default router;

