import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/** Bounce+ gates ads and filters (PRD §7/§5.4) — always read live from the
 * DB rather than trusting anything client-supplied, since this is what
 * decides whether to show ads or unlock paid filters. */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  return ACTIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > new Date();
}
