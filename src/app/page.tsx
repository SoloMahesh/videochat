"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AgeGate } from "@/components/AgeGate";
import { useGuestSession } from "@/hooks/useGuestSession";
import { getDeviceId } from "@/lib/device";

function ReferralCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const ref = params.get("ref");
    if (!ref) return;
    fetch("/api/referral/claim", {
      method: "POST",
      headers: { "x-device-id": getDeviceId(), "content-type": "application/json" },
      body: JSON.stringify({ code: ref }),
    }).catch(() => {});
  }, [params]);

  return null;
}

const HIGHLIGHTS = [
  { k: "01", title: "One tap, no signup", body: "Guest mode is the whole product. Tap Start, you're talking." },
  { k: "02", title: "Matched by interest", body: "Type a few tags and we bias your match toward shared ground." },
  { k: "03", title: "Actually moderated", body: "Report in one tap. Automated screening catches the rest, fast." },
];

export default function LandingPage() {
  const { state, confirmAge } = useGuestSession();
  const { data: authSession } = useSession();

  return (
    <>
      <AmbientBackground />
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      {state.status === "ready" && !state.session.ageConfirmed && <AgeGate onConfirm={confirmAge} />}

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(255,86,48,0.14)]" />
          Bounce
        </div>
        <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-wide text-ink-muted">
          <Link href="/community-guidelines" className="hover:text-ink">
            Guidelines
          </Link>
          <Link href="/coins" className="hover:text-ink">
            Coins
          </Link>
          <Link href="/invite" className="hover:text-ink">
            Invite
          </Link>
          <Link href="/upgrade" className="hover:text-ink">
            Bounce+
          </Link>
          <Link href="/profile" className="hover:text-ink">
            Profile
          </Link>
          {!authSession && (
            <Link href="/sign-in" className="hover:text-ink">
              Sign in
            </Link>
          )}
          <Link href="/chat" className="rounded-full border border-line px-4 py-2 text-ink hover:border-accent">
            Start
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent-ink">Random video &amp; text chat</p>
        <h1 className="mt-4 max-w-2xl text-balance font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
          Talk to someone new. No account, no waiting room.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-muted">
          Bounce is a random video chat for people who miss what Omegle used to be — instant, alive, a little
          chaotic — minus the abuse and the ad clutter.
        </p>

        <div className="mt-9 flex items-center gap-4">
          <Link
            href="/chat"
            className="rounded-full bg-accent px-8 py-4 font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
          >
            Start chatting →
          </Link>
          <span className="font-mono text-xs text-ink-muted">
            {state.status === "ready"
              ? `${state.session.coinBalance} coins to start${state.session.streakCount > 1 ? ` · 🔥 ${state.session.streakCount} day streak` : ""}`
              : "loading…"}
          </span>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.k} className="glass rounded-xl2 p-6">
              <span className="font-mono text-xs text-accent-ink">{h.k}</span>
              <h3 className="mt-3 font-display text-lg font-bold">{h.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{h.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-10 font-mono text-xs text-ink-muted">
        18+ only · <Link href="/terms" className="underline underline-offset-2">Terms</Link> ·{" "}
        <Link href="/community-guidelines" className="underline underline-offset-2">
          Community Guidelines
        </Link>
      </footer>
    </>
  );
}
