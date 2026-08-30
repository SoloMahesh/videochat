import { NextRequest, NextResponse } from "next/server";
import { resolveOrCreateUser, signSessionValue, verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { activeBan } from "@/lib/ban";
import { hashIp, requestIp } from "@/lib/fingerprint";
import { applyDailyStreak } from "@/lib/streak";
import { hasActiveSubscription } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "missing_device_id" }, { status: 400 });
  }

  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  const ipHash = hashIp(requestIp(req.headers));
  const ban = await activeBan({ userId: cookieUserId ?? undefined, deviceFingerprint: deviceId, ipHash });
  if (ban) {
    return NextResponse.json(
      { error: "banned", tier: ban.tier, expiresAt: ban.expiresAt },
      { status: 403 },
    );
  }

  let user = await resolveOrCreateUser(cookieUserId, deviceId);
  user = await applyDailyStreak(user);
  const subscribed = await hasActiveSubscription(user.id);

  const res = NextResponse.json({
    id: user.id,
    isGuest: user.isGuest,
    coinBalance: user.coinBalance,
    ageConfirmed: Boolean(user.ageConfirmedAt),
    streakCount: user.streakCount,
    subscribed,
    gender: user.gender,
  });

  res.cookies.set(SESSION_COOKIE, signSessionValue(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });

  return res;
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || body.confirmAge !== true) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  const user = await resolveOrCreateUser(cookieUserId, deviceId);
  await prisma.user.update({
    where: { id: user.id },
    data: { ageConfirmedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
