import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { requestIp } from "@/lib/fingerprint";

/** A single shared bearer token, not a login system. Fine for a solo
 * operator at MVP scale (docs/ROADMAP.md Phase 1); replace with real
 * admin accounts + roles before adding a second moderator.
 *
 * Rate-limited by IP regardless of whether the token matches — a shared
 * token has no lockout/complexity requirements of its own, so this is
 * what stands between it and being brute-forced. */
export function isAuthorizedAdmin(req: NextRequest): boolean {
  const limit = rateLimit(`admin-auth:${requestIp(req.headers)}`, 20, 60_000);
  if (!limit.allowed) return false;

  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
