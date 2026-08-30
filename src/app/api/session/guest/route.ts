import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestUser, signSessionValue, SESSION_COOKIE } from "@/lib/session";
import { activeBan } from "@/lib/ban";
import { hashIp, requestIp } from "@/lib/fingerprint";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "missing_device_id" }, { status: 400 });
  }

  const ipHash = hashIp(requestIp(req.headers));
  const ban = await activeBan({ deviceFingerprint: deviceId, ipHash });
  if (ban) {
    return NextResponse.json(
      { error: "banned", tier: ban.tier, expiresAt: ban.expiresAt },
      { status: 403 },
    );
  }

  const user = await getOrCreateGuestUser(deviceId);
  const res = NextResponse.json({
    id: user.id,
    isGuest: user.isGuest,
    coinBalance: user.coinBalance,
    ageConfirmed: Boolean(user.ageConfirmedAt),
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

  const user = await getOrCreateGuestUser(deviceId);
  await prisma.user.update({
    where: { id: user.id },
    data: { ageConfirmedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
