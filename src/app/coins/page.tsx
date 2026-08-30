"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { COIN_PACKS } from "@/lib/payments/packs";

function PurchaseNotice() {
  const params = useSearchParams();
  const purchase = params.get("purchase");
  if (!purchase) return null;
  return (
    <div
      className={`mb-6 rounded-xl2 px-4 py-3 text-center text-sm shadow-flat ${
        purchase === "success" ? "bg-accent2-soft text-accent2" : "text-ink-muted"
      }`}
    >
      {purchase === "success" ? "Purchase complete — your balance is updated." : "Checkout cancelled."}
    </div>
  );
}

export default function CoinsPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function buy(packId: string) {
    setLoadingId(packId);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-hero-soft)]" />
          Bounce
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <Suspense fallback={null}>
          <PurchaseNotice />
        </Suspense>
        <h1 className="font-display text-2xl font-bold">Buy coins</h1>
        <p className="mt-2 text-sm text-ink-muted">Coins unlock filters, gifts, and rematch tokens.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {COIN_PACKS.map((pack) => (
            <div key={pack.id} className="card flex flex-col p-6 text-center">
              <span className="font-mono text-xs uppercase tracking-wide text-accent-ink">{pack.label}</span>
              <span className="mt-3 font-display text-3xl font-extrabold">{pack.coins}</span>
              <span className="text-xs text-ink-muted">coins</span>
              <button
                onClick={() => buy(pack.id)}
                disabled={loadingId === pack.id}
                className="btn btn-primary btn-sm mt-6 disabled:opacity-50"
              >
                {loadingId === pack.id ? "Redirecting…" : `$${pack.priceUsd.toFixed(2)}`}
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
