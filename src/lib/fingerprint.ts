import { createHash } from "node:crypto";

const IP_SALT = process.env.IP_HASH_SALT ?? "dev-only-salt-change-me";

export function hashIp(ip: string): string {
  return createHash("sha256").update(IP_SALT).update(ip).digest("hex");
}

export function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
