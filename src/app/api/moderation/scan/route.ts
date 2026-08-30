import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { classifyFrame, severityFor } from "@/lib/moderation/classify";
import { escalateAndBan } from "@/lib/ban";
import { emitToUser, forceEndSessionForUser } from "@/lib/socket/server";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Model inference is real CPU work — this is the endpoint most worth
  // protecting from being hammered. Normal usage is ~1 scan per 17-20s.
  const limit = rateLimit(`moderation-scan:${userId}`, 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const image = body?.image;
  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { score } = await classifyFrame(image);
  const severity = severityFor(score);
  const snapshotHash = createHash("sha256").update(image).digest("hex");

  await prisma.moderationScan.create({
    data: { userId, score, severity, snapshotHash },
  });

  if (severity === "warn") {
    emitToUser(userId, "moderation_flag", { severity: "warn" });
  } else if (severity === "ban") {
    const deviceId = req.headers.get("x-device-id") ?? undefined;
    await escalateAndBan({ userId, deviceFingerprint: deviceId, reason: "moderation:nsfw_detected" });
    await forceEndSessionForUser(userId, "banned");
    emitToUser(userId, "moderation_flag", { severity: "ban" });
  }

  return NextResponse.json({ severity });
}
