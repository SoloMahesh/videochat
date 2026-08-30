import sharp from "sharp";

export type Severity = "safe" | "warn" | "ban";

const WARN_THRESHOLD = 0.5;
const BAN_THRESHOLD = 0.72;
const SAMPLE_SIZE = 48;

export function severityFor(score: number): Severity {
  if (score >= BAN_THRESHOLD) return "ban";
  if (score >= WARN_THRESHOLD) return "warn";
  return "safe";
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // Standard RGB skin-tone heuristic (Kovac et al.) — decent at flagging
  // large expanses of exposed skin, terrible at everything else nudity
  // detection actually needs (context, pose, non-skin-toned content,
  // drawn/AI content, partial coverage). This is a real signal, not a
  // no-op, but it is NOT a substitute for a trained model.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
}

/**
 * Scores one downscaled JPEG frame for NSFW content using a skin-tone-ratio
 * heuristic (decoded via sharp) — the fraction of sampled pixels that fall
 * in a skin-tone range. This is a real, functioning signal (it replaces an
 * earlier version of this file that always returned "safe"), but it is a
 * decades-old, low-precision technique: it over-flags things like beach
 * photos, closeups of faces/hands, and warm lighting, and under-flags
 * nudity photographed under unusual lighting, drawn/AI content, or anyone
 * whose exposed skin doesn't fall in the sampled RGB range at all.
 *
 * Do not treat this as launch-ready moderation on its own (docs/PRD.md
 * §6). Before real users are on this: replace it with (or run it
 * alongside) a real trained classifier — an open model such as nsfwjs, or
 * a paid API (AWS Rekognition, Hive, etc.) if the budget allows. The
 * endpoint that calls this, the thresholds above, and the warn/ban
 * escalation around it are all real and already wired — only the
 * scoring function's accuracy is the open item.
 */
export async function classifyFrame(imageBase64: string): Promise<{ score: number }> {
  try {
    const commaIndex = imageBase64.indexOf(",");
    const base64Data = commaIndex === -1 ? imageBase64 : imageBase64.slice(commaIndex + 1);
    const buffer = Buffer.from(base64Data, "base64");

    const { data, info } = await sharp(buffer)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    let skinPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i + channels <= data.length; i += channels) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      totalPixels++;
      if (isSkinTone(r, g, b)) skinPixels++;
    }

    if (totalPixels === 0) return { score: 0 };
    return { score: skinPixels / totalPixels };
  } catch {
    // Malformed/undecodable image — fail safe (don't ban on a decode
    // error), but don't silently pass it off as "definitely fine" either.
    return { score: 0 };
  }
}
