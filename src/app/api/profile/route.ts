import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, resolveOrCreateUser, SESSION_COOKIE } from "@/lib/session";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

const VALID_GENDERS = new Set(["MALE", "FEMALE", "OTHER"]);
const AVATAR_EMOJI = new Set(["🦊", "🐨", "🐢", "🦄", "🐙", "🦁", "🐝", "🐧", "🦋", "🐬", "🌵", "🍉"]);

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!deviceId && !cookieUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await resolveOrCreateUser(cookieUserId, deviceId ?? "");
  return NextResponse.json({
    name: user.name,
    avatar: user.image,
    gender: user.gender,
    defaultInterestTags: user.defaultInterestTags,
  });
}

export async function PATCH(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  const cookieUserId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!deviceId && !cookieUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = rateLimit(`profile-patch:${cookieUserId ?? deviceId}`, 20, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.gender !== undefined) {
    if (typeof body.gender !== "string" || !VALID_GENDERS.has(body.gender)) {
      return NextResponse.json({ error: "invalid_gender" }, { status: 400 });
    }
    data.gender = body.gender;
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.length > 24) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }
    data.name = body.name.trim().slice(0, 24) || null;
  }

  if (body.avatar !== undefined) {
    if (typeof body.avatar !== "string" || !AVATAR_EMOJI.has(body.avatar)) {
      return NextResponse.json({ error: "invalid_avatar" }, { status: 400 });
    }
    data.image = body.avatar;
  }

  if (body.defaultInterestTags !== undefined) {
    if (!Array.isArray(body.defaultInterestTags) || !body.defaultInterestTags.every((t: unknown) => typeof t === "string")) {
      return NextResponse.json({ error: "invalid_tags" }, { status: 400 });
    }
    data.defaultInterestTags = body.defaultInterestTags
      .slice(0, 10)
      .map((t: string) => t.toLowerCase().trim())
      .filter(Boolean);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const user = await resolveOrCreateUser(cookieUserId, deviceId ?? "");
  const updated = await prisma.user.update({ where: { id: user.id }, data });

  return NextResponse.json({
    ok: true,
    name: updated.name,
    avatar: updated.image,
    gender: updated.gender,
    defaultInterestTags: updated.defaultInterestTags,
  });
}
