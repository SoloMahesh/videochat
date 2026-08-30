const DEVICE_KEY = "bounce_device_id";

/** Best-effort persistent id for a guest device — not a full fingerprinting
 * solution, just enough continuity to keep ban/coin state across a cleared
 * cookie without requiring an account. See docs/FSD.md §6. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
