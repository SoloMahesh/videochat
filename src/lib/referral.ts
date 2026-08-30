import { randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitToUser } from "@/lib/socket/server";

const REFERRAL_REWARD_COINS = 50;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function generateCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export async function ensureReferralCode(user: User): Promise<string> {
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
      return code;
    } catch {
      // unique collision on referralCode; retry with a new code
    }
  }
  throw new Error("could_not_allocate_referral_code");
}

/** Links a brand-new visitor to whoever's referral link they arrived on.
 * Deliberately narrow: only a user with no chat history and no existing
 * referral link yet counts as "brand new" (PRD §5.5/§7 — this pays out
 * real money via coins, so it should not be retroactively claimable). */
export async function claimReferral(refereeId: string, code: string): Promise<boolean> {
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === refereeId) return false;

  const [existingReferral, sessionCount] = await Promise.all([
    prisma.referral.findUnique({ where: { refereeId } }),
    prisma.chatSession.count({ where: { OR: [{ userAId: refereeId }, { userBId: refereeId }] } }),
  ]);
  if (existingReferral || sessionCount > 0) return false;

  await prisma.referral.create({ data: { referrerId: referrer.id, refereeId } });
  return true;
}

/** Pays out the two-sided referral bonus the first time a referred user
 * completes a chat session. Called from endSession for every participant
 * on every session end — cheap no-op for the common case of a user with
 * no pending referral. */
export async function maybeRewardReferral(userId: string, completedSessionId: string) {
  const referral = await prisma.referral.findUnique({ where: { refereeId: userId } });
  if (!referral || referral.rewardedAt) return;

  const priorCompletedSessions = await prisma.chatSession.count({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      endedAt: { not: null },
      id: { not: completedSessionId },
    },
  });
  if (priorCompletedSessions > 0) return;

  await prisma.$transaction([
    prisma.referral.update({ where: { id: referral.id }, data: { rewardedAt: new Date() } }),
    prisma.coinTransaction.create({
      data: { userId: referral.referrerId, delta: REFERRAL_REWARD_COINS, reason: "referral_bonus" },
    }),
    prisma.coinTransaction.create({
      data: { userId: referral.refereeId, delta: REFERRAL_REWARD_COINS, reason: "referral_bonus" },
    }),
    prisma.user.update({ where: { id: referral.referrerId }, data: { coinBalance: { increment: REFERRAL_REWARD_COINS } } }),
    prisma.user.update({ where: { id: referral.refereeId }, data: { coinBalance: { increment: REFERRAL_REWARD_COINS } } }),
  ]);

  emitToUser(referral.referrerId, "coins_awarded", { amount: REFERRAL_REWARD_COINS, reason: "referral" });
  emitToUser(referral.refereeId, "coins_awarded", { amount: REFERRAL_REWARD_COINS, reason: "referral" });
}
