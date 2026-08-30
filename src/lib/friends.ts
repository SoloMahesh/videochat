import { prisma } from "@/lib/prisma";

export async function areFriends(userA: string, userB: string): Promise<boolean> {
  const row = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
  return Boolean(row);
}

/** Friends are made the same way as Rematch/share-card — both sides tap
 * Add within the same post-session window (PRD §5.3), not an async
 * request-then-accept flow, so this always creates an already-ACCEPTED
 * row once called. */
export async function makeFriends(userA: string, userB: string) {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
  if (existing) return existing;

  return prisma.friendship.create({
    data: { requesterId: userA, addresseeId: userB, status: "ACCEPTED" },
  });
}

export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      addressee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => (row.requesterId === userId ? row.addressee : row.requester));
}

export async function getThread(userId: string, otherId: string, limit = 50) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: otherId },
        { senderId: otherId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
