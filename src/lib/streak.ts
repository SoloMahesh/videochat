import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAILY_STREAK_REWARD = 10;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Touches a user's daily streak on each session check (PRD §5.5): first
 * visit of a new UTC day after yesterday's extends the streak and pays a
 * small coin reward, a visit later than that resets to day one, and a
 * repeat visit on the same day is a no-op. */
export async function applyDailyStreak(user: User): Promise<User> {
  const today = dayKey(new Date());
  const lastVisit = user.lastVisitAt ? dayKey(user.lastVisitAt) : null;

  if (lastVisit === today) return user;

  const isConsecutive = lastVisit !== null && dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000)) === lastVisit;
  const nextStreak = isConsecutive ? user.streakCount + 1 : 1;
  const reward = isConsecutive ? DAILY_STREAK_REWARD : 0;

  return prisma.$transaction(async (tx) => {
    if (reward > 0) {
      await tx.coinTransaction.create({
        data: { userId: user.id, delta: reward, reason: "daily_streak" },
      });
    }
    return tx.user.update({
      where: { id: user.id },
      data: {
        streakCount: nextStreak,
        lastVisitAt: new Date(),
        coinBalance: { increment: reward },
      },
    });
  });
}
