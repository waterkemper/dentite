import { Router } from 'express';
import { PricingController } from '../controllers/pricing.controller';

const router = Router();
const pricingController = new PricingController();

// Public routes (no authentication required for pricing)
router.get('/plans', pricingController.getPricingPlans);

export default router;
