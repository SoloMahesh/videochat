import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { stripeProvider } from "@/lib/payments/stripe-provider";
import { getPack } from "@/lib/payments/packs";

export async function POST(req: NextRequest) {
  const userId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const packId = body?.packId;
  if (!getPack(packId)) return NextResponse.json({ error: "unknown_pack" }, { status: 400 });

  const origin = req.headers.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";

  try {
    const { url } = await stripeProvider.createCoinCheckout({
      userId,
      packId,
      successUrl: `${origin}/coins?purchase=success`,
      cancelUrl: `${origin}/coins?purchase=cancelled`,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
