import { useState, useEffect } from 'react';
import { billingApi } from '../lib/api';

interface SubscriptionData {
  subscriptionStatus: string;
  subscriptionTier: string;
  isInTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  subscription: {
    planName: string;
    amount: number;
    currency: string;
    currentPeriodEnd: string;
  } | null;
}

interface UsageData {
  messages: {
    used: number;
    included: number;
    remaining: number;
    percentUsed: number;
  };
  users: {
    active: number;
    included: number;
    remaining: number;
  };
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
}

const PRICING_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    priceId: import.meta.env.VITE_STRIPE_PRICE_BASIC || 'price_basic',
    price: 99,
    features: [
      '1,000 messages/month',
      '3 user seats',
      'Email & SMS outreach',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL || 'price_professional',
    price: 199,
    features: [
      '5,000 messages/month',
      '10 user seats',
      'Email & SMS outreach',
      'Advanced analytics',
      'Campaign sequences',
      'Priority email support',
    ],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    price: 399,
    features: [
      '20,000 messages/month',
      '50 user seats',
      'Email & SMS outreach',
      'Advanced analytics',
      'Campaign sequences',
      'Custom integrations',
      'Phone & email support',
      'Dedicated account manager',
    ],
  },
];

export default function Billing() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      // For now, just set default values to avoid API errors during development
      setSubscription({
        subscriptionStatus: 'trial',
        subscriptionTier: 'basic',
        isInTrial: true,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        trialDaysRemaining: 14,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        subscription: null,
      });
      
      setUsage({
        messages: {
          used: 150,
          included: 1000,
          remaining: 850,
          percentUsed: 15,
        },
        users: {
          active: 2,
          included: 3,
          remaining: 1,
        },
        billingCycleStart: new Date().toISOString(),
        billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (err: any) {
      console.error('Billing data error:', err);
      setError(err.response?.data?.error || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      setCheckoutLoading(true);
      const response = await billingApi.createCheckoutSession(priceId);
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create checkout session');
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setCheckoutLoading(true);
      const response = await billingApi.createPortalSession();
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open billing portal');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading billing information...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Trial Banner */}
      {subscription?.isInTrial && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Free Trial Active
              </h3>
              <p className="text-blue-700 mt-1">
                {subscription.trialDaysRemaining} days remaining in your trial
              </p>
            </div>
            <button
              onClick={() => handleUpgrade(PRICING_PLANS[1].priceId)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              disabled={checkoutLoading}
            >
              Subscribe Now
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      {subscription && !subscription.isInTrial && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Current Plan: {subscription.subscriptionTier.charAt(0).toUpperCase() + subscription.subscriptionTier.slice(1)}
              </h3>
              {subscription.subscription && (
                <p className="text-gray-600 mt-1">
                  ${subscription.subscription.amount}/month • 
                  Renews {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Status: <span className="capitalize">{subscription.subscriptionStatus}</span>
              </p>
            </div>
            <button
              onClick={handleManageSubscription}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              disabled={checkoutLoading}
            >
              Manage Subscription
            </button>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Messages Usage */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Message Usage
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {usage.messages.used.toLocaleString()} / {usage.messages.included.toLocaleString()} messages
                </span>
                <span className="font-medium">
                  {usage.messages.percentUsed.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.messages.percentUsed > 90
                      ? 'bg-red-600'
                      : usage.messages.percentUsed > 75
                      ? 'bg-yellow-500'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(usage.messages.percentUsed, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {usage.messages.remaining} messages remaining this month
            </p>
          </div>

          {/* User Seats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Seats
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {usage.users.active} / {usage.users.included} seats used
                </span>
                <span className="font-medium">
                  {((usage.users.active / usage.users.included) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((usage.users.active / usage.users.included) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {usage.users.remaining} seats available
            </p>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {subscription?.isInTrial ? 'Choose Your Plan' : 'Upgrade Your Plan'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-lg p-6 ${
                plan.recommended ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {plan.recommended && (
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  RECOMMENDED
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mt-4">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-gray-500 ml-2">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.priceId)}
                disabled={
                  checkoutLoading ||
                  (!subscription?.isInTrial && subscription?.subscriptionTier === plan.id)
                }
                className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold ${
                  !subscription?.isInTrial && subscription?.subscriptionTier === plan.id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : plan.recommended
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {!subscription?.isInTrial && subscription?.subscriptionTier === plan.id
                  ? 'Current Plan'
                  : subscription?.isInTrial
                  ? 'Start Free Trial'
                  : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

