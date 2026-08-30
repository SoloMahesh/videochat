"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { useGuestSession } from "@/hooks/useGuestSession";

const PERKS = [
  "No ads, ever",
  "Unlock gender + language filters",
  "Priority matchmaking queue",
  "A monthly coin stipend",
];

function SubscribeNotice() {
  const params = useSearchParams();
  const result = params.get("subscribe");
  if (!result) return null;
  return (
    <div
      className={`mb-6 rounded-xl2 px-4 py-3 text-center text-sm shadow-flat ${
        result === "success" ? "bg-accent2-soft text-accent2" : "text-ink-muted"
      }`}
    >
      {result === "success" ? "You're on Bounce+ — ads are off and filters are unlocked." : "Checkout cancelled."}
    </div>
  );
}

export default function UpgradePage() {
  const { state } = useGuestSession();
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  const alreadySubscribed = state.status === "ready" && state.session.subscribed;

  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-hero-soft)]" />
          Bounce
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <Suspense fallback={null}>
          <SubscribeNotice />
        </Suspense>

        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Bounce+</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Skip the ads, unlock the filters</h1>

        <div className="card mt-8 p-8">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold">$4.99</span>
            <span className="text-sm text-ink-muted">/ month</span>
          </div>
          <ul className="mt-6 flex flex-col gap-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm text-ink">
                <span className="text-accent">✓</span> {perk}
              </li>
            ))}
          </ul>

          {alreadySubscribed ? (
            <p className="mt-8 rounded-xl2 bg-accent2-soft px-6 py-3 text-center text-sm font-medium text-accent2">
              You&rsquo;re already on Bounce+
            </p>
          ) : (
            <button onClick={subscribe} disabled={loading} className="btn btn-primary btn-md mt-8 w-full disabled:opacity-50">
              {loading ? "Redirecting…" : "Subscribe"}
            </button>
          )}
        </div>
      </main>
    </>
  );
}
