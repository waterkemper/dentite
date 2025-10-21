import { Request, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware/auth';
import { stripeService } from '../services/stripe.service';
import { prisma } from '../lib/prisma';

let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey || apiKey === '') {
      throw new Error(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file.'
      );
    }
    
    stripe = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
    });
  }
  
  return stripe;
}

export class BillingController {
  constructor() {
    this.createCheckoutSession = this.createCheckoutSession.bind(this);
    this.createPortalSession = this.createPortalSession.bind(this);
    this.getSubscription = this.getSubscription.bind(this);
    this.getUsage = this.getUsage.bind(this);
    this.handleWebhook = this.handleWebhook.bind(this);
  }

  /**
   * Create Stripe Checkout session
   * POST /api/billing/checkout
   */
  async createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { priceId } = req.body;
      const practiceId = req.user?.practiceId;

      if (!practiceId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!priceId) {
        res.status(400).json({ error: 'Price ID is required' });
        return;
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const successUrl = `${frontendUrl}/billing?session=success`;
      const cancelUrl = `${frontendUrl}/billing?session=canceled`;

      const checkoutUrl = await stripeService.createCheckoutSession(
        practiceId,
        priceId,
        successUrl,
        cancelUrl
      );

      res.json({ url: checkoutUrl });
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }

  /**
   * Create Customer Portal session
   * POST /api/billing/portal
   */
  async createPortalSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const practiceId = req.user?.practiceId;

      if (!practiceId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const returnUrl = `${frontendUrl}/billing`;

      const portalUrl = await stripeService.createCustomerPortalSession(
        practiceId,
        returnUrl
      );

      res.json({ url: portalUrl });
    } catch (error) {
      console.error('Create portal session error:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  }

  /**
   * Get current subscription details
   * GET /api/billing/subscription
   */
  async getSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const practiceId = req.user?.practiceId;

      if (!practiceId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!practice) {
        res.status(404).json({ error: 'Practice not found' });
        return;
      }

      const currentSubscription = practice.subscriptions[0] || null;

      // Check if in trial
      const isInTrial =
        practice.subscriptionStatus === 'trial' &&
        practice.trialEndsAt &&
        practice.trialEndsAt > new Date();

      const trialDaysRemaining = isInTrial && practice.trialEndsAt
        ? Math.ceil(
            (practice.trialEndsAt.getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      res.json({
        subscriptionStatus: practice.subscriptionStatus,
        subscriptionTier: practice.subscriptionTier,
        isInTrial,
        trialEndsAt: practice.trialEndsAt,
        trialDaysRemaining,
        currentPeriodStart: practice.subscriptionPeriodStart,
        currentPeriodEnd: practice.subscriptionPeriodEnd,
        subscription: currentSubscription,
        stripeCustomerId: practice.stripeCustomerId,
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ error: 'Failed to get subscription' });
    }
  }

  /**
   * Get current usage stats
   * GET /api/billing/usage
   */
  async getUsage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const practiceId = req.user?.practiceId;

      if (!practiceId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const usage = await stripeService.getUsageStats(practiceId);

      res.json(usage);
    } catch (error) {
      console.error('Get usage error:', error);
      res.status(500).json({ error: 'Failed to get usage stats' });
    }
  }

  /**
   * Handle Stripe webhooks
   * POST /api/billing/webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      res.status(400).json({ error: 'Missing signature or webhook secret' });
      return;
    }

    let event: Stripe.Event;

    try {
      event = getStripeClient().webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await stripeService.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.updated':
          await stripeService.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.deleted':
          await stripeService.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'invoice.payment_succeeded':
          await stripeService.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice
          );
          break;

        case 'invoice.payment_failed':
          await stripeService.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice
          );
          break;

        case 'customer.subscription.trial_will_end':
          // TODO: Send notification email
          console.log('Trial ending soon:', event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
}

