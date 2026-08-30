import { prisma } from "@/lib/prisma";

/**
 * Folds a guest User's history into a freshly authenticated User so signing
 * up never resets someone's coins or ban history (PRD §5.3 / FSD §10). Both
 * identity systems stay separate — NextAuth owns email/OAuth, the
 * `bounce_session` cookie stays Bounce's own concern — this just reassigns
 * foreign keys from the guest row onto the authenticated row and retires
 * the guest row. See src/app/api/account/merge-guest/route.ts for the
 * cookie hand-off that makes the rest of the app (sockets included) see
 * the merge transparently.
 */
export async function mergeGuestIntoUser(guestId: string, targetUserId: string) {
  if (guestId === targetUserId) return;

  const [guest, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: guestId } }),
    prisma.user.findUnique({ where: { id: targetUserId } }),
  ]);
  if (!guest || !target || !guest.isGuest) return;

  await prisma.$transaction(async (tx) => {
    await tx.ban.updateMany({ where: { userId: guestId }, data: { userId: targetUserId } });
    await tx.report.updateMany({ where: { reporterId: guestId }, data: { reporterId: targetUserId } });
    await tx.report.updateMany({ where: { reportedId: guestId }, data: { reportedId: targetUserId } });
    await tx.chatSession.updateMany({ where: { userAId: guestId }, data: { userAId: targetUserId } });
    await tx.chatSession.updateMany({ where: { userBId: guestId }, data: { userBId: targetUserId } });
    await tx.coinTransaction.updateMany({ where: { userId: guestId }, data: { userId: targetUserId } });
    await tx.referral.updateMany({ where: { referrerId: guestId }, data: { referrerId: targetUserId } });

    const existingTargetReferee = await tx.referral.findUnique({ where: { refereeId: targetUserId } });
    if (!existingTargetReferee) {
      await tx.referral.updateMany({ where: { refereeId: guestId }, data: { refereeId: targetUserId } });
    }

    const existingTargetSub = await tx.subscription.findUnique({ where: { userId: targetUserId } });
    if (!existingTargetSub) {
      await tx.subscription.updateMany({ where: { userId: guestId }, data: { userId: targetUserId } });
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: { coinBalance: { increment: guest.coinBalance } },
    });

    await tx.user.delete({ where: { id: guestId } });
  });
}
