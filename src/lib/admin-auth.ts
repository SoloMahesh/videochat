import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** A single shared bearer token, not a login system. Fine for a solo
 * operator at MVP scale (docs/ROADMAP.md Phase 1); replace with real
 * admin accounts + roles before adding a second moderator. */
export function isAuthorizedAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
