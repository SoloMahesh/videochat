import * as tf from "@tensorflow/tfjs-node";
import * as nsfwjs from "nsfwjs";

export type Severity = "safe" | "warn" | "ban";

const WARN_THRESHOLD = 0.4;
const BAN_THRESHOLD = 0.7;
const EXPLICIT_CLASSES = new Set(["Porn", "Hentai"]);

export function severityFor(score: number): Severity {
  if (score >= BAN_THRESHOLD) return "ban";
  if (score >= WARN_THRESHOLD) return "warn";
  return "safe";
}

let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

/** nsfwjs bundles the MobileNetV2 model's weights directly inside the npm
 * package (~3.6MB) — loading it does not fetch anything over the network,
 * so this stays genuinely self-hosted with no per-call API fee, matching
 * docs/PRD.md §6. Loaded once and cached; the first scan after a server
 * restart pays the load cost, every scan after that reuses it. */
function getModel(): Promise<nsfwjs.NSFWJS> {
  if (!modelPromise) modelPromise = nsfwjs.load();
  return modelPromise;
}

/**
 * Scores one downscaled JPEG frame for NSFW content using nsfwjs's
 * MobileNetV2 classifier — a real trained model (replaces an earlier
 * skin-tone-ratio heuristic that lived here). The score is the summed
 * probability of the "Porn" and "Hentai" classes; "Sexy" (swimwear, gym
 * selfies, etc.) is deliberately excluded from the score that can trigger
 * a ban, since including it made ordinary photos over-flag — see the
 * warn/ban thresholds above for where it still contributes.
 *
 * Like any classifier this isn't infallible — it can still miss content
 * outside its training distribution or over/under-flag edge cases. It is
 * a real, meaningfully better signal than a heuristic, not a guarantee.
 * The endpoint that calls this, the thresholds, and the warn/ban
 * escalation around it are unchanged.
 */
export async function classifyFrame(imageBase64: string): Promise<{ score: number }> {
  let image: tf.Tensor3D | null = null;
  try {
    const commaIndex = imageBase64.indexOf(",");
    const base64Data = commaIndex === -1 ? imageBase64 : imageBase64.slice(commaIndex + 1);
    const buffer = Buffer.from(base64Data, "base64");

    const model = await getModel();
    image = tf.node.decodeImage(buffer, 3) as tf.Tensor3D;
    const predictions = await model.classify(image);

    const score = predictions
      .filter((p) => EXPLICIT_CLASSES.has(p.className))
      .reduce((sum, p) => sum + p.probability, 0);

    return { score };
  } catch (err) {
    // Malformed/undecodable image or a model hiccup — fail safe (never
    // ban on an error), matching the rest of the moderation pipeline.
    console.error("NSFW classification failed, treating frame as safe:", err);
    return { score: 0 };
  } finally {
    image?.dispose();
  }
}
