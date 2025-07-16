import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Webhook error', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const tier = session.metadata?.tier || 'pro';

      if (userId) {
        await db
          .update(users)
          .set({
            tier,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });

      if (user) {
        // Check if subscription is active
        const isActive = subscription.status === 'active';
        const tier = isActive 
          ? (subscription.metadata?.tier || 'pro')
          : 'free';

        await db
          .update(users)
          .set({
            tier,
            stripeSubscriptionId: isActive ? subscription.id : null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });

      if (user) {
        await db
          .update(users)
          .set({
            tier: 'free',
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      break;
    }
  }

  return new Response('Webhook received', { status: 200 });
}