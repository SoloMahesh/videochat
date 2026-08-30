import { prisma } from "@/lib/prisma";
import type { BanTier } from "@prisma/client";

const LADDER: BanTier[] = ["WARN", "HOUR", "DAY", "WEEK", "PERMANENT"];
const LADDER_DURATION_MS: Record<BanTier, number | null> = {
  WARN: 0,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  PERMANENT: null,
};

export async function activeBan(params: { userId?: string; deviceFingerprint?: string; ipHash?: string }) {
  const { userId, deviceFingerprint, ipHash } = params;
  const or: Array<Record<string, string>> = [];
  if (userId) or.push({ userId });
  if (deviceFingerprint) or.push({ deviceFingerprint });
  if (ipHash) or.push({ ipHash });
  if (or.length === 0) return null;

  return prisma.ban.findFirst({
    where: {
      AND: [{ OR: or }, { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Escalates the next ban tier for a user based on their prior ban count in
 * the trust & safety ladder (PRD §6 / FSD §6): warn -> 1h -> 24h -> 7d -> permanent. */
export async function escalateAndBan(params: {
  userId?: string;
  deviceFingerprint?: string;
  ipHash?: string;
  reason: string;
  skipLadder?: boolean;
}) {
  const { userId, deviceFingerprint, ipHash, reason, skipLadder } = params;

  if (skipLadder) {
    return prisma.ban.create({
      data: { userId, deviceFingerprint, ipHash, reason, tier: "PERMANENT", expiresAt: null },
    });
  }

  const priorCount = await prisma.ban.count({
    where: {
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(deviceFingerprint ? [{ deviceFingerprint }] : []),
      ],
    },
  });

  const tier = LADDER[Math.min(priorCount, LADDER.length - 1)] ?? "PERMANENT";
  const durationMs = LADDER_DURATION_MS[tier];
  const expiresAt = durationMs === null ? null : durationMs === 0 ? new Date() : new Date(Date.now() + durationMs);

  return prisma.ban.create({
    data: { userId, deviceFingerprint, ipHash, reason, tier, expiresAt },
  });
}
