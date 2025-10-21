import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getOnboardingStatus,
  updateOnboardingStep,
  completeOnboarding,
  restartOnboarding
} from '../controllers/onboarding.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get onboarding status
router.get('/status', getOnboardingStatus);

// Update onboarding step
router.post('/step', updateOnboardingStep);

// Complete onboarding
router.post('/complete', completeOnboarding);

// Restart onboarding
router.post('/restart', restartOnboarding);

export default router;
