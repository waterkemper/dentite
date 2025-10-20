import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/analytics/recovered-revenue
 * Get recovered revenue metrics
 */
router.get('/recovered-revenue', analyticsController.getRecoveredRevenue);

/**
 * GET /api/analytics/campaign-performance
 * Get campaign performance metrics
 */
router.get('/campaign-performance', analyticsController.getCampaignPerformance);

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary metrics
 */
router.get('/dashboard', analyticsController.getDashboardMetrics);

/**
 * GET /api/analytics/messaging-performance
 * Get messaging performance metrics (email & SMS tracking)
 */
router.get('/messaging-performance', analyticsController.getMessagingPerformance);

export default router;

