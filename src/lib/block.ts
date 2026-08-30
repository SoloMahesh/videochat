import { prisma } from "@/lib/prisma";

/** Combined, direction-agnostic block set for a user — either side blocking
 * the other is enough to keep them apart (PRD §5.2). Fetched once per
 * join_queue call and carried on the in-memory QueueEntry so matching stays
 * a synchronous in-memory scan (docs/FSD.md §2), not a DB call per
 * candidate. */
export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return ids;
}

export async function createBlock(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return;
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });
}
