import Stripe from "stripe";
import { getPack } from "@/lib/payments/packs";
import type { PaymentProvider, WebhookEvent } from "@/lib/payments/provider";

let stripeClient: Stripe | null = null;

function stripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export const stripeProvider: PaymentProvider = {
  async createCoinCheckout({ userId, packId, successUrl, cancelUrl }) {
    const pack = getPack(packId);
    if (!pack) throw new Error("unknown_pack");

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(pack.priceUsd * 100),
            product_data: { name: `${pack.coins} Bounce coins (${pack.label})` },
          },
        },
      ],
      metadata: { userId, packId, coins: String(pack.coins) },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) throw new Error("stripe_no_url");
    return { url: session.url };
  },

  async verifyAndParseWebhook(rawBody, signature): Promise<WebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
    if (event.type !== "checkout.session.completed") return { type: "ignored" };

    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, packId, coins } = session.metadata ?? {};
    if (!userId || !packId || !coins) return { type: "ignored" };

    return {
      type: "coin_checkout_completed",
      userId,
      packId,
      coins: Number(coins),
      paymentId: session.id,
    };
  },
};
