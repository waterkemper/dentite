import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class PricingController {
  constructor() {
    this.getPricingPlans = this.getPricingPlans.bind(this);
  }

  /**
   * Get all active pricing plans
   * GET /api/pricing/plans
   */
  async getPricingPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await prisma.pricingPlan.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          price: true,
          currency: true,
          billingInterval: true,
          messagesIncluded: true,
          userSeatsIncluded: true,
          hasBasicAnalytics: true,
          hasAdvancedAnalytics: true,
          hasCampaignSequences: true,
          hasCustomIntegrations: true,
          hasPhoneSupport: true,
          hasDedicatedManager: true,
          stripePriceId: true,
        },
      });

      // Transform to frontend-friendly format
      const formattedPlans = plans.map(plan => ({
        id: plan.name,
        name: plan.displayName,
        description: plan.description,
        price: Number(plan.price),
        currency: plan.currency,
        billingInterval: plan.billingInterval,
        stripePriceId: plan.stripePriceId || `price_${plan.name}`,
        features: this.generateFeatureList(plan),
        recommended: plan.name === 'professional',
      }));

      res.json(formattedPlans);
    } catch (error) {
      console.error('Get pricing plans error:', error);
      res.status(500).json({ error: 'Failed to fetch pricing plans' });
    }
  }

  /**
   * Generate feature list based on plan capabilities
   */
  private generateFeatureList(plan: any): string[] {
    const features: string[] = [];

    // Messages and seats
    features.push(`${plan.messagesIncluded.toLocaleString()} messages/month`);
    features.push(`${plan.userSeatsIncluded} user seats`);

    // Core features (always included)
    features.push('Email & SMS outreach');

    // Analytics
    if (plan.hasAdvancedAnalytics) {
      features.push('Advanced analytics');
    } else {
      features.push('Basic analytics');
    }

    // Campaign sequences
    if (plan.hasCampaignSequences) {
      features.push('Campaign sequences');
    }

    // Support level
    if (plan.hasDedicatedManager) {
      features.push('Dedicated account manager');
      features.push('Phone & email support');
    } else if (plan.hasPhoneSupport) {
      features.push('Phone & email support');
    } else {
      features.push('Email support');
    }

    // Integrations
    if (plan.hasCustomIntegrations) {
      features.push('Custom integrations');
    }

    return features;
  }
}
