import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifySessionValue, signSessionValue, SESSION_COOKIE } from "@/lib/session";
import { mergeGuestIntoUser } from "@/lib/account-merge";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authed = await getServerSession(authOptions);
  const targetUserId = (authed?.user as { id?: string } | undefined)?.id;
  if (!targetUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const guestId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (guestId && guestId !== targetUserId) {
    await mergeGuestIntoUser(guestId, targetUserId);
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  const res = NextResponse.json({
    id: targetUserId,
    isGuest: false,
    coinBalance: user?.coinBalance ?? 0,
    ageConfirmed: Boolean(user?.ageConfirmedAt),
  });

  res.cookies.set(SESSION_COOKIE, signSessionValue(targetUserId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });

  return res;
}
