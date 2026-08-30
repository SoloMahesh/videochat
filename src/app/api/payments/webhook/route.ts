import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeProvider } from "@/lib/payments/stripe-provider";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const rawBody = await req.text();

  let event;
  try {
    event = await stripeProvider.verifyAndParseWebhook(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "coin_checkout_completed") {
    await prisma.$transaction([
      prisma.coinTransaction.create({
        data: {
          userId: event.userId,
          delta: event.coins,
          reason: "stripe_purchase",
          stripePaymentId: event.paymentId,
        },
      }),
      prisma.user.update({
        where: { id: event.userId },
        data: { coinBalance: { increment: event.coins } },
      }),
    ]);
  }

  return NextResponse.json({ received: true });
}
