// Tier configuration - safe for client-side usage
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
    priceId: 'price_1RlXaFG48MbDPfJlDHIs7KdQ', // $9/month
    limits: {
      prompts: -1, // unlimited
      aiOptimizations: -1,
      teamMembers: 5,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 29,
    priceId: 'price_1RlXaGG48MbDPfJl05xAbzV5', // $29/month
    limits: {
      prompts: -1,
      aiOptimizations: -1,
      teamMembers: -1,
    },
  },
};

export const PRICE_IDS = {
  pro_monthly: TIERS.pro.priceId,
  enterprise_monthly: TIERS.enterprise.priceId,
};