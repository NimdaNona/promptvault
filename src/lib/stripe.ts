import Stripe from 'stripe';

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Note: You need to set STRIPE_WEBHOOK_SECRET in your environment variables
// Get this from your Stripe Dashboard > Webhooks > Signing secret

// Stripe Price IDs from production
export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID || 'price_1RlXaFG48MbDPfJlDHIs7KdQ', // $9/month
  enterprise_monthly: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_1RlXaGG48MbDPfJl05xAbzV5', // $29/month
};

export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      prompts: 50,
      aiOptimizations: 0,
      teamMembers: 1,
    },
  },
  pro: {
    name: 'Pro',
    price: 9,
    priceId: PRICE_IDS.pro_monthly,
    limits: {
      prompts: -1, // unlimited
      aiOptimizations: -1,
      teamMembers: 5,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 29,
    priceId: PRICE_IDS.enterprise_monthly,
    limits: {
      prompts: -1,
      aiOptimizations: -1,
      teamMembers: -1,
    },
  },
};

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  tier: 'pro' | 'enterprise'
) {
  const priceId = TIERS[tier].priceId;
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
      tier,
    },
  });

  return session;
}

export async function createBillingPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return session;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}