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
    // Make messageTemplate optional for sequence campaigns
    body('messageTemplate')
      .custom((value, { req }) => {
        const isSequence = req.body.isSequence;
        if (!isSequence && (!value || value.trim() === '')) {
          throw new Error('Message template is required for single-message campaigns');
        }
        return true;
      }),
    // Optional sequence fields
    body('isSequence').optional().isBoolean().withMessage('isSequence must be boolean'),
    body('autoStopOnAppointment').optional().isBoolean().withMessage('autoStopOnAppointment must be boolean'),
    body('autoStopOnResponse').optional().isBoolean().withMessage('autoStopOnResponse must be boolean'),
    body('autoStopOnOptOut').optional().isBoolean().withMessage('autoStopOnOptOut must be boolean'),
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

// Sequence Management Routes

/**
 * GET /api/outreach/campaigns/:id/steps
 * Get all steps for a campaign
 */
router.get('/campaigns/:id/steps', outreachController.getSteps);

/**
 * POST /api/outreach/campaigns/:id/steps
 * Create a new step for a campaign
 */
router.post(
  '/campaigns/:id/steps',
  [
    body('stepNumber').isInt({ min: 1 }).withMessage('Step number must be a positive integer'),
    body('name').notEmpty().withMessage('Step name is required'),
    body('messageType')
      .isIn(['sms', 'email'])
      .withMessage('Message type must be sms or email'),
    body('messageTemplate')
      .custom((value) => {
        if (!value || value.trim() === '') {
          throw new Error('Message template is required');
        }
        return true;
      }),
    body('delayType')
      .isIn(['fixed_days', 'days_before_expiry'])
      .withMessage('Delay type must be fixed_days or days_before_expiry'),
    body('delayValue').isInt({ min: 0 }).withMessage('Delay value must be a non-negative integer'),
  ],
  validateRequest,
  outreachController.createStep
);

/**
 * PUT /api/outreach/campaigns/:id/steps/:stepId
 * Update a campaign step
 */
router.put('/campaigns/:id/steps/:stepId', outreachController.updateStep);

/**
 * DELETE /api/outreach/campaigns/:id/steps/:stepId
 * Delete a campaign step
 */
router.delete('/campaigns/:id/steps/:stepId', outreachController.deleteStep);

/**
 * POST /api/outreach/campaigns/:id/enroll/:patientId
 * Enroll a single patient in a sequence campaign
 */
router.post('/campaigns/:id/enroll/:patientId', outreachController.enrollPatient);

/**
 * POST /api/outreach/campaigns/:id/enroll
 * Enroll multiple patients matching criteria in a sequence campaign
 */
router.post('/campaigns/:id/enroll', outreachController.enrollPatients);

/**
 * GET /api/outreach/campaigns/:id/sequence-states
 * Get sequence enrollment states for a campaign
 */
router.get('/campaigns/:id/sequence-states', outreachController.getSequenceStates);

/**
 * GET /api/outreach/patients/:patientId/sequences
 * Get all sequence enrollments for a patient
 */
router.get('/patients/:patientId/sequences', outreachController.getPatientSequences);

export default router;

