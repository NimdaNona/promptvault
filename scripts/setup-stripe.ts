import Stripe from 'stripe';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

async function setupStripeProducts() {
  try {
    console.log('Setting up Stripe products...');

    // Create Pro product
    const proProduct = await stripe.products.create({
      name: 'PromptVault Pro',
      description: 'Unlimited prompts, AI optimization, and team collaboration for professionals',
    });

    // Create Pro price
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 900, // $9.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'pro',
      },
    });

    console.log('Pro Product ID:', proProduct.id);
    console.log('Pro Price ID:', proPrice.id);

    // Create Enterprise product
    const enterpriseProduct = await stripe.products.create({
      name: 'PromptVault Enterprise',
      description: 'Everything in Pro plus unlimited team members, advanced analytics, and custom integrations',
    });

    // Create Enterprise price
    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 2900, // $29.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'enterprise',
      },
    });

    console.log('Enterprise Product ID:', enterpriseProduct.id);
    console.log('Enterprise Price ID:', enterprisePrice.id);

    // Create webhook endpoint
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: 'https://aipromptvault.app/api/webhooks/stripe',
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
      ],
    });

    console.log('\nWebhook Endpoint Created:');
    console.log('URL:', webhookEndpoint.url);
    console.log('Secret:', webhookEndpoint.secret);

    console.log('\n✅ Stripe setup complete!');
    console.log('\nAdd these to your environment variables:');
    console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}`);
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookEndpoint.secret}`);

  } catch (error) {
    console.error('Error setting up Stripe:', error);
    process.exit(1);
  }
}

setupStripeProducts();