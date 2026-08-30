import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { stripeProvider } from "@/lib/payments/stripe-provider";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = rateLimit(`payments-subscribe:${userId}`, 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const origin = req.headers.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";

  try {
    const { url } = await stripeProvider.createSubscriptionCheckout({
      userId,
      successUrl: `${origin}/upgrade?subscribe=success`,
      cancelUrl: `${origin}/upgrade?subscribe=cancelled`,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
