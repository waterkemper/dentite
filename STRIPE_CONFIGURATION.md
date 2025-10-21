# Stripe Billing Configuration Guide

This guide walks through setting up Stripe for the Dentite billing integration.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Access to Stripe Dashboard
- Stripe CLI installed (optional, for local webhook testing)

## 1. Get API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** and **Secret key**
3. Add to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

## 2. Create Products and Prices

### Basic Plan

1. Go to **Products** → **Add Product**
2. Name: `Dentite Basic`
3. Description: `Basic plan with 1,000 messages/month and 3 user seats`
4. Pricing:
   - **Price**: $99.00
   - **Billing period**: Monthly
   - **Price ID**: Copy this (e.g., `price_1ABC...`) - you'll need it
5. Click **Add Product**

### Professional Plan

1. Go to **Products** → **Add Product**
2. Name: `Dentite Professional`
3. Description: `Professional plan with 5,000 messages/month and 10 user seats`
4. Pricing:
   - **Price**: $199.00
   - **Billing period**: Monthly
   - **Price ID**: Copy this
5. Click **Add Product**

### Enterprise Plan

1. Go to **Products** → **Add Product**
2. Name: `Dentite Enterprise`
3. Description: `Enterprise plan with 20,000 messages/month and 50 user seats`
4. Pricing:
   - **Price**: $399.00
   - **Billing period**: Monthly
   - **Price ID**: Copy this
5. Click **Add Product**

### Update Frontend with Price IDs

Edit `frontend/src/pages/Billing.tsx` and update the `PRICING_PLANS` array with your actual Stripe price IDs:

```typescript
const PRICING_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    priceId: 'price_1ABC...', // Your actual Basic price ID
    price: 99,
    // ...
  },
  // ... update other plans
];
```

### Update Backend Price Mapping

Edit `backend/src/services/stripe.service.ts` and update the `PRICE_TIERS` mapping:

```typescript
const PRICE_TIERS: Record<string, { tier: string; messages: number; seats: number }> = {
  'price_1ABC...': { tier: 'basic', messages: 1000, seats: 3 },
  'price_1XYZ...': { tier: 'professional', messages: 5000, seats: 10 },
  'price_1QRS...': { tier: 'enterprise', messages: 20000, seats: 50 },
};
```

## 3. Configure Customer Portal

The Customer Portal allows customers to manage their subscriptions.

1. Go to **Settings** → **Billing** → **Customer portal**
2. Click **Activate test link** (or customize settings first)
3. Configure settings:
   - **Business information**: Add your business name, support email
   - **Functionality**:
     - ✅ Enable invoice history
     - ✅ Enable update payment method
     - ✅ Enable update subscription (choose which products customers can switch to)
     - ❌ Disable cancellation (require customers to contact support)
   - **Branding**: Upload logo, set colors
4. Click **Save**

## 4. Set Up Webhooks

Webhooks notify your backend when subscription events occur.

### For Development (Local Testing)

Use Stripe CLI:

```bash
# Install Stripe CLI
# See: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/billing/webhook
```

This will give you a webhook secret starting with `whsec_...`. Add it to your `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### For Production

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://yourdomain.com/api/billing/webhook`
3. Description: `Dentite Subscription Events`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** and add to your production `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 5. Test the Integration

### Test Cards

Use these test cards in development:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiration date, any 3-digit CVC, and any ZIP code.

### Test Flow

1. Register a new practice at `/register`
2. You should be in trial mode (14 days)
3. Navigate to `/billing`
4. Click "Subscribe Now" or choose a plan
5. You'll be redirected to Stripe Checkout
6. Complete the payment with test card
7. You'll be redirected back to `/billing?session=success`
8. Check that your subscription is now active
9. Click "Manage Subscription" to test Customer Portal
10. Try canceling, updating payment method, etc.

### Test Webhooks

1. Complete a test subscription
2. Go to **Developers** → **Webhooks** → Click your endpoint
3. View **Recent events** to see received events
4. Check your backend logs for webhook processing

### Test Usage Limits

1. Send messages until you reach your plan limit
2. Try to send more - should be blocked
3. Check `/billing` to see usage stats

## 6. Go Live

### Switch to Live Mode

1. Toggle from **Test mode** to **Live mode** in Stripe Dashboard
2. Get new **live API keys** from https://dashboard.stripe.com/apikeys
3. Create **live products and prices** (same as test mode)
4. Set up **live webhook endpoint**
5. Update production environment variables:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (live webhook secret)
```

6. Test with real payment method
7. Monitor webhook delivery in Dashboard

## 7. Monitoring & Maintenance

### Monitor Webhook Health

- Go to **Developers** → **Webhooks** → Click endpoint
- Check **Recent events** for failures
- Set up **email alerts** for failed webhooks

### Monitor Subscriptions

- Go to **Customers** to see all subscriptions
- Filter by status (active, past_due, canceled, etc.)
- Export customer data as needed

### Handle Failed Payments

When a payment fails:
1. Stripe sends `invoice.payment_failed` webhook
2. Your app updates subscription status to `past_due`
3. Customer sees warning banner in app
4. Stripe automatically retries payment (configurable in Settings → Billing → Retry rules)
5. If all retries fail, subscription is canceled

### Usage-Based Billing (Future Enhancement)

To implement overage charges:

1. Create metered products for SMS/Email overages
2. In `stripe.service.ts`, report usage to Stripe:

```typescript
await stripe.subscriptionItems.createUsageRecord(
  subscriptionItemId,
  {
    quantity: messagesOverLimit,
    timestamp: Math.floor(Date.now() / 1000),
  }
);
```

## Troubleshooting

### Webhook signature verification failed

- Ensure you're using the correct webhook secret
- Check that raw body is being passed to webhook handler (already configured in `backend/src/index.ts`)
- Verify endpoint URL is correct

### Subscription not syncing

- Check webhook events in Stripe Dashboard
- Verify webhook endpoint is reachable
- Check backend logs for errors
- Manually sync: Call `stripeService.syncSubscriptionStatus(customerId)`

### Trial not working

- Verify `trialEndsAt` is set during registration
- Check `subscriptionStatus` is 'trial'
- Ensure subscription middleware allows trial status

## Resources

- [Stripe Billing Documentation](https://stripe.com/docs/billing)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Testing Stripe](https://stripe.com/docs/testing)

