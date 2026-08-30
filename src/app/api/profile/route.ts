import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, resolveOrCreateUser, SESSION_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const VALID_GENDERS = new Set(["MALE", "FEMALE", "OTHER"]);

export async function PATCH(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!deviceId && !cookieUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const gender = typeof body.gender === "string" && VALID_GENDERS.has(body.gender) ? body.gender : undefined;
  if (!gender) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const user = await resolveOrCreateUser(cookieUserId, deviceId ?? "");
  await prisma.user.update({ where: { id: user.id }, data: { gender } });

  return NextResponse.json({ ok: true, gender });
}
