import { Router } from 'express';
import { BenefitsController } from '../controllers/benefits.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const benefitsController = new BenefitsController();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/benefits/expiring
 * Get patients with expiring benefits
 */
router.get('/expiring', benefitsController.getExpiringBenefits);

/**
 * GET /api/benefits/calculate/:patientId
 * Recalculate benefits for a specific patient
 */
router.get('/calculate/:patientId', benefitsController.calculateBenefits);

export default router;

