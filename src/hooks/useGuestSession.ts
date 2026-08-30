"use client";

import { useCallback, useEffect, useState } from "react";
import { getDeviceId } from "@/lib/device";

export type GuestSession = {
  id: string;
  isGuest: boolean;
  coinBalance: number;
  ageConfirmed: boolean;
  streakCount: number;
  subscribed: boolean;
};

type State =
  | { status: "loading" }
  | { status: "banned"; tier: string; expiresAt: string | null }
  | { status: "ready"; session: GuestSession }
  | { status: "error" };

export function useGuestSession() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/session/guest", {
        method: "POST",
        headers: { "x-device-id": getDeviceId() },
      });
      if (res.status === 403) {
        const data = await res.json();
        setState({ status: "banned", tier: data.tier, expiresAt: data.expiresAt });
        return;
      }
      if (!res.ok) throw new Error("session_failed");
      const session = (await res.json()) as GuestSession;
      setState({ status: "ready", session });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmAge = useCallback(async () => {
    await fetch("/api/session/guest", {
      method: "PATCH",
      headers: { "x-device-id": getDeviceId(), "content-type": "application/json" },
      body: JSON.stringify({ confirmAge: true }),
    });
    setState((prev) =>
      prev.status === "ready" ? { status: "ready", session: { ...prev.session, ageConfirmed: true } } : prev,
    );
  }, []);

  return { state, reload: load, confirmAge };
}
