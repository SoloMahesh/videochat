/** Everything downstream of the app talks to this interface, never the
 * Stripe SDK directly (docs/FSD.md §7) — keeps payments swappable and
 * testable, and keeps the Stripe import confined to one file. */
export interface PaymentProvider {
  createCoinCheckout(params: { userId: string; packId: string; successUrl: string; cancelUrl: string }): Promise<{ url: string }>;
  verifyAndParseWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
}

export type WebhookEvent =
  | { type: "coin_checkout_completed"; userId: string; packId: string; coins: number; paymentId: string }
  | { type: "ignored" };
