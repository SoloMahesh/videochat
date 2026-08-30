import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/entitlements";

const NEW_USER_SESSION_THRESHOLD = 3;

/** "New/free" per PRD §5.2 Safe Mode: not on Bounce+, and hasn't finished
 * enough chats yet to have a track record. */
export async function isNewAndFree(userId: string): Promise<boolean> {
  const [subscribed, completedCount] = await Promise.all([
    hasActiveSubscription(userId),
    prisma.chatSession.count({
      where: { OR: [{ userAId: userId }, { userBId: userId }], endedAt: { not: null } },
    }),
  ]);
  return !subscribed && completedCount < NEW_USER_SESSION_THRESHOLD;
}
