import { NextResponse } from "next/server";

type Bucket = { count: number; windowStart: number };

/**
 * In-memory fixed-window rate limiter — consistent with the rest of the
 * app's single-process architecture (matchmaking queue, socket registry).
 * Stored on globalThis rather than a plain module-level Map for the same
 * reason as the socket state in src/lib/socket/server.ts: Next bundles
 * different API routes into separate webpack chunks, each getting its own
 * copy of an ordinary module-level variable, which would silently let
 * every route rate-limit independently instead of sharing one registry.
 */
const globalForRateLimit = globalThis as unknown as { __bounceRateLimitBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.__bounceRateLimitBuckets ?? (globalForRateLimit.__bounceRateLimitBuckets = new Map());

const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 10 * 60 * 1000;
let lastPrune = Date.now();

function pruneIfDue() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > STALE_AFTER_MS) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/** `key` should already include which limit it's for (e.g. `guest-session:<ip>`)
 * so different endpoints sharing this one Map never collide. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  pruneIfDue();

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.windowStart + windowMs - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "rate_limited", retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
