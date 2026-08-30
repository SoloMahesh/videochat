"use client";

import { useEffect, type RefObject } from "react";
import { getDeviceId } from "@/lib/device";

const BASE_INTERVAL_MS = 17_000;
const JITTER_MS = 5_000;
const MAX_DIMENSION = 320;

function captureFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * Math.min(scale, 1));
  canvas.height = Math.round(video.videoHeight * Math.min(scale, 1));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
}

/** Periodically samples the local outgoing video feed and posts it to the
 * moderation endpoint for scoring. The image never leaves this one request
 * — the server discards it after scoring, keeping only a hash (PRD §6). */
export function useModerationScan({ active, videoRef }: { active: boolean; videoRef: RefObject<HTMLVideoElement> }) {
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      const video = videoRef.current;
      const frame = video ? captureFrame(video) : null;
      if (frame) {
        try {
          await fetch("/api/moderation/scan", {
            method: "POST",
            headers: { "content-type": "application/json", "x-device-id": getDeviceId() },
            body: JSON.stringify({ image: frame }),
          });
        } catch {
          // best-effort; a missed scan just waits for the next tick
        }
      }
      if (!cancelled) {
        timeoutId = setTimeout(tick, BASE_INTERVAL_MS + Math.random() * JITTER_MS);
      }
    }

    timeoutId = setTimeout(tick, BASE_INTERVAL_MS + Math.random() * JITTER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [active, videoRef]);
}
