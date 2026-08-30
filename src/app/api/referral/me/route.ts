import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE, resolveOrCreateUser } from "@/lib/session";
import { ensureReferralCode } from "@/lib/referral";

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!cookieUserId && !deviceId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await resolveOrCreateUser(cookieUserId, deviceId ?? "");
  const code = await ensureReferralCode(user);
  const origin = req.headers.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";

  return NextResponse.json({ code, url: `${origin}/?ref=${code}` });
}
