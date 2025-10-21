import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authenticateToken } from '../middleware/auth';
import { requireAdminForBilling } from '../middleware/subscription';

const router = Router();
const billingController = new BillingController();

// Protected routes (require authentication)
router.post(
  '/checkout',
  authenticateToken,
  requireAdminForBilling,
  billingController.createCheckoutSession
);

router.post(
  '/portal',
  authenticateToken,
  requireAdminForBilling,
  billingController.createPortalSession
);

router.get(
  '/subscription',
  authenticateToken,
  billingController.getSubscription
);

router.get(
  '/usage',
  authenticateToken,
  billingController.getUsage
);

// Webhook endpoint (no authentication - verified via Stripe signature)
router.post('/webhook', billingController.handleWebhook);

export default router;

