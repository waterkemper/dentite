import Stripe from 'stripe';
import { prisma } from '../lib/prisma';

let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey || apiKey === '') {
      throw new Error(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file. ' +
        'See STRIPE_CONFIGURATION.md for setup instructions.'
      );
    }
    
    stripe = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
    });
  }
  
  return stripe;
}

export class StripeService {
  /**
   * Create or update Stripe customer for a practice
   */
  async createOrUpdateCustomer(practiceId: string): Promise<string> {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) {
      throw new Error('Practice not found');
    }

    // If customer already exists, return ID
    if (practice.stripeCustomerId) {
      return practice.stripeCustomerId;
    }

    // Create new customer
    const customer = await getStripeClient().customers.create({
      email: practice.email,
      name: practice.name,
      metadata: {
        practiceId: practice.id,
      },
    });

    // Update practice with customer ID
    await prisma.practice.update({
      where: { id: practiceId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create Stripe Checkout session for subscription
   */
  async createCheckoutSession(
    practiceId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const customerId = await this.createOrUpdateCustomer(practiceId);

    const session = await getStripeClient().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        practiceId,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          practiceId,
        },
      },
    });

    return session.url || '';
  }

  /**
   * Create Customer Portal session for subscription management
   */
  async createCustomerPortalSession(
    practiceId: string,
    returnUrl: string
  ): Promise<string> {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this practice');
    }

    const session = await getStripeClient().billingPortal.sessions.create({
      customer: practice.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Sync subscription status from Stripe
   */
  async syncSubscriptionStatus(stripeCustomerId: string): Promise<void> {
    const practice = await prisma.practice.findUnique({
      where: { stripeCustomerId },
    });

    if (!practice) {
      console.error('Practice not found for customer:', stripeCustomerId);
      return;
    }

    // Get active subscriptions for customer
    const subscriptions = await getStripeClient().subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: 'active',
    });

    if (subscriptions.data.length === 0) {
      // No active subscription
      await prisma.practice.update({
        where: { id: practice.id },
        data: {
          subscriptionStatus: 'inactive',
          stripeSubscriptionId: null,
        },
      });
      return;
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;

    // Determine tier based on price ID
    let tier = 'basic';
    let messagesIncluded = 1000;
    let userSeatsIncluded = 3;

    // Map price IDs to tiers (these should be env variables in production)
    const PRICE_TIERS: Record<string, { tier: string; messages: number; seats: number }> = {
      // Basic plan
      'price_basic': { tier: 'basic', messages: 1000, seats: 3 },
      // Professional plan
      'price_professional': { tier: 'professional', messages: 5000, seats: 10 },
      // Enterprise plan
      'price_enterprise': { tier: 'enterprise', messages: 20000, seats: 50 },
    };

    if (priceId && PRICE_TIERS[priceId]) {
      tier = PRICE_TIERS[priceId].tier;
      messagesIncluded = PRICE_TIERS[priceId].messages;
      userSeatsIncluded = PRICE_TIERS[priceId].seats;
    }

    // Update practice
    await prisma.practice.update({
      where: { id: practice.id },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        subscriptionStatus: subscription.status,
        subscriptionTier: tier,
        subscriptionPeriodStart: new Date((subscription as any).current_period_start * 1000),
        subscriptionPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        messagesIncluded,
        userSeatsIncluded,
        usageBillingCycleStart: new Date((subscription as any).current_period_start * 1000),
      },
    });

    // Create or update subscription record
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        practiceId: practice.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planName: tier,
        amount: subscription.items.data[0].price.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        currency: subscription.currency,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      },
      update: {
        status: subscription.status,
        planName: tier,
        amount: subscription.items.data[0].price.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      },
    });
  }

  /**
   * Record message usage
   */
  async recordUsage(
    practiceId: string,
    usageType: 'sms' | 'email',
    quantity: number = 1
  ): Promise<void> {
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        messagesSentThisMonth: {
          increment: quantity,
        },
      },
    });

    // TODO: Report to Stripe metered billing if over limit
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (practice && practice.messagesSentThisMonth > practice.messagesIncluded) {
      // Over limit - could implement metered billing here
      console.log(
        `Practice ${practiceId} over message limit: ${practice.messagesSentThisMonth}/${practice.messagesIncluded}`
      );
    }
  }

  /**
   * Check if practice is within usage limits
   */
  async checkUsageLimits(practiceId: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) {
      return { allowed: false, reason: 'Practice not found' };
    }

    // Allow if in trial
    if (
      practice.subscriptionStatus === 'trial' &&
      practice.trialEndsAt &&
      practice.trialEndsAt > new Date()
    ) {
      return { allowed: true };
    }

    // Check subscription status
    if (
      practice.subscriptionStatus !== 'active' &&
      practice.subscriptionStatus !== 'trialing'
    ) {
      return {
        allowed: false,
        reason: 'Subscription is not active. Please update your payment method.',
      };
    }

    // Check message limits (allow 10% overage before hard blocking)
    const messageLimit = practice.messagesIncluded * 1.1;
    if (practice.messagesSentThisMonth >= messageLimit) {
      return {
        allowed: false,
        reason: 'Monthly message limit exceeded. Please upgrade your plan.',
      };
    }

    return { allowed: true };
  }

  /**
   * Handle subscription created webhook
   */
  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    await this.syncSubscriptionStatus(customerId);
  }

  /**
   * Handle subscription updated webhook
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    await this.syncSubscriptionStatus(customerId);
  }

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const practice = await prisma.practice.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!practice) {
      return;
    }

    // Update practice to inactive
    await prisma.practice.update({
      where: { id: practice.id },
      data: {
        subscriptionStatus: 'inactive',
        stripeSubscriptionId: null,
      },
    });

    // Update subscription record
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: true,
      },
    });
  }

  /**
   * Handle invoice payment succeeded
   */
  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    await this.syncSubscriptionStatus(customerId);
  }

  /**
   * Handle invoice payment failed
   */
  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const practice = await prisma.practice.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!practice) {
      return;
    }

    // Update subscription status to past_due
    await prisma.practice.update({
      where: { id: practice.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    // TODO: Send email notification about failed payment
    console.log(`Payment failed for practice ${practice.id}`);
  }

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(): Promise<void> {
    // Find all practices where billing cycle has reset
    const practices = await prisma.practice.findMany({
      where: {
        usageBillingCycleStart: {
          lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      },
    });

    for (const practice of practices) {
      await prisma.practice.update({
        where: { id: practice.id },
        data: {
          messagesSentThisMonth: 0,
          usageBillingCycleStart: new Date(),
        },
      });
    }
  }

  /**
   * Get current usage stats for a practice
   */
  async getUsageStats(practiceId: string) {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!practice) {
      throw new Error('Practice not found');
    }

    const activeUsers = practice.users.length;

    return {
      messages: {
        used: practice.messagesSentThisMonth,
        included: practice.messagesIncluded,
        remaining: Math.max(0, practice.messagesIncluded - practice.messagesSentThisMonth),
        percentUsed: (practice.messagesSentThisMonth / practice.messagesIncluded) * 100,
      },
      users: {
        active: activeUsers,
        included: practice.userSeatsIncluded,
        remaining: Math.max(0, practice.userSeatsIncluded - activeUsers),
      },
      billingCycleStart: practice.usageBillingCycleStart,
      billingCycleEnd: practice.subscriptionPeriodEnd,
    };
  }
}

export const stripeService = new StripeService();

