export type SessionMode = "VIDEO" | "TEXT";

export type QueueEntry = {
  socketId: string;
  userId: string;
  mode: SessionMode;
  interestTags: string[];
  language?: string;
  joinedAt: number;
};

/** In-memory matchmaking queue. Bounce runs as a single Node process on one
 * VPS (see docs/FSD.md §2), so this needs no cross-instance coordination —
 * if Bounce ever runs multiple app instances, swap this for a Redis-backed
 * queue behind the same three functions. */
const queue: QueueEntry[] = [];

export function enqueue(entry: QueueEntry) {
  removeBySocket(entry.socketId);
  queue.push(entry);
}

export function removeBySocket(socketId: string) {
  const idx = queue.findIndex((e) => e.socketId === socketId);
  if (idx !== -1) queue.splice(idx, 1);
}

export function queueSize() {
  return queue.length;
}

function compatible(a: QueueEntry, b: QueueEntry): boolean {
  if (a.mode !== b.mode) return false;
  if (a.language && b.language && a.language !== b.language) return false;
  return true;
}

/** Picks the best waiting candidate for `entry`: most shared interest tags
 * first, then whoever has been waiting longest, and removes them from the
 * queue. Returns null if nobody compatible is waiting yet. */
export function claimMatch(entry: QueueEntry): QueueEntry | null {
  let best: QueueEntry | null = null;
  let bestOverlap = -1;
  let bestWait = -1;

  for (const candidate of queue) {
    if (candidate.socketId === entry.socketId) continue;
    if (!compatible(entry, candidate)) continue;

    const overlap = entry.interestTags.filter((t) => candidate.interestTags.includes(t)).length;
    const wait = Date.now() - candidate.joinedAt;

    if (overlap > bestOverlap || (overlap === bestOverlap && wait > bestWait)) {
      best = candidate;
      bestOverlap = overlap;
      bestWait = wait;
    }
  }

  if (best) removeBySocket(best.socketId);
  return best;
}
