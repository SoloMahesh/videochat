import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE, resolveOrCreateUser } from "@/lib/session";
import { claimReferral } from "@/lib/referral";
import { hashIp, requestIp } from "@/lib/fingerprint";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // This mints real money (coins on both sides) — worth limiting by IP,
  // not just device, since device IDs are trivial to reset client-side.
  const limit = rateLimit(`referral-claim:${hashIp(requestIp(req.headers))}`, 5, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : null;
  const deviceId = req.headers.get("x-device-id");
  if (!code || !deviceId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  const user = await resolveOrCreateUser(cookieUserId, deviceId);

  const claimed = await claimReferral(user.id, code);
  return NextResponse.json({ claimed });
}
