import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "bounce_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-me";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function signSessionValue(userId: string): string {
  const sig = sign(userId);
  return `${userId}.${sig}`;
}

export function verifySessionValue(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null;
  const [userId, sig] = cookieValue.split(".");
  if (!userId || !sig) return null;
  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

/** Finds or creates a guest User tied to this device fingerprint, so repeat
 * guest visits (even after clearing cookies) reconnect to the same coin
 * balance and ban history instead of laundering a fresh identity. */
export async function getOrCreateGuestUser(deviceFingerprint: string) {
  const existing = await prisma.user.findFirst({
    where: { deviceFingerprint, isGuest: true },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: { isGuest: true, deviceFingerprint },
  });
}

export async function getSessionUser(userId: string | null) {
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
