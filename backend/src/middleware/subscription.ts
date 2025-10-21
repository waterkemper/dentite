import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';
import { stripeService } from '../services/stripe.service';

/**
 * Middleware to check if practice has an active subscription
 * Allows trial period
 */
export const checkSubscriptionActive = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const practiceId = req.user?.practiceId;

    if (!practiceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) {
      res.status(404).json({ error: 'Practice not found' });
      return;
    }

    // Allow if in active trial
    if (
      practice.subscriptionStatus === 'trial' &&
      practice.trialEndsAt &&
      practice.trialEndsAt > new Date()
    ) {
      next();
      return;
    }

    // Allow if subscription is active or trialing
    if (
      practice.subscriptionStatus === 'active' ||
      practice.subscriptionStatus === 'trialing'
    ) {
      next();
      return;
    }

    // Subscription is not active
    res.status(403).json({
      error: 'Subscription required',
      message: 'Your subscription is not active. Please update your payment method.',
      subscriptionStatus: practice.subscriptionStatus,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

/**
 * Middleware to check usage limits before performing an action
 */
export const checkUsageLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const practiceId = req.user?.practiceId;

    if (!practiceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const usageCheck = await stripeService.checkUsageLimits(practiceId);

    if (!usageCheck.allowed) {
      res.status(403).json({
        error: 'Usage limit exceeded',
        message: usageCheck.reason,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    res.status(500).json({ error: 'Failed to verify usage limits' });
  }
};

/**
 * Middleware to check if practice is an admin (for billing operations)
 */
export const requireAdminForBilling = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      error: 'Admin access required',
      message: 'Only practice administrators can manage billing',
    });
    return;
  }
  next();
};

