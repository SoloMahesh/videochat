export type Severity = "safe" | "warn" | "ban";

const WARN_THRESHOLD = 0.55;
const BAN_THRESHOLD = 0.85;

export function severityFor(score: number): Severity {
  if (score >= BAN_THRESHOLD) return "ban";
  if (score >= WARN_THRESHOLD) return "warn";
  return "safe";
}

/**
 * Scores one downscaled JPEG frame for NSFW content. This is a placeholder
 * that always returns "safe" — it is NOT a working moderation model. The
 * real thing (docs/PRD.md §6): run an open-source classifier such as
 * nsfwjs/an equivalent MobileNet model against the decoded frame here,
 * server-side, and return its score. The endpoint that calls this, the
 * thresholds above, and the warn/ban escalation around it are fully wired
 * and real — only this function's body needs a real model before launch.
 * Do not ship to production without replacing this.
 */
export async function classifyFrame(imageBase64: string): Promise<{ score: number }> {
  void imageBase64;
  return { score: 0 };
}
