import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE, resolveOrCreateUser } from "@/lib/session";
import { claimReferral } from "@/lib/referral";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : null;
  const deviceId = req.headers.get("x-device-id");
  if (!code || !deviceId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  const user = await resolveOrCreateUser(cookieUserId, deviceId);

  const claimed = await claimReferral(user.id, code);
  return NextResponse.json({ claimed });
}
