import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/entitlements";
import type { GenderFilter } from "@/lib/matchmaking/queue";

export const GENDER_FILTER_COST = 15;

/** Gender filtering is paid (PRD §5.1/§7): Bounce+ gets it free, everyone
 * else spends coins per search. Downgrades to "ANY" rather than rejecting
 * the search outright if neither applies, so a broke free user still gets
 * matched — just without the filter they asked for. */
export async function resolveGenderFilter(
  userId: string,
  requested: GenderFilter,
): Promise<{ desiredGender: GenderFilter; downgraded: boolean }> {
  if (requested === "ANY") return { desiredGender: "ANY", downgraded: false };
  if (await hasActiveSubscription(userId)) return { desiredGender: requested, downgraded: false };

  const charged = await prisma.user
    .update({
      where: { id: userId, coinBalance: { gte: GENDER_FILTER_COST } },
      data: { coinBalance: { decrement: GENDER_FILTER_COST } },
    })
    .catch(() => null);

  if (!charged) return { desiredGender: "ANY", downgraded: true };

  await prisma.coinTransaction.create({ data: { userId, delta: -GENDER_FILTER_COST, reason: "gender_filter" } });
  return { desiredGender: requested, downgraded: false };
}
