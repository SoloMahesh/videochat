"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { getDeviceId } from "@/lib/device";

export default function InvitePage() {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral/me", { headers: { "x-device-id": getDeviceId() } })
      .then((r) => r.json())
      .then((data) => setLink(data.url))
      .catch(() => {});
  }, []);

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(255,86,48,0.14)]" />
          Bounce
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Bring a friend</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Invite friends, you both get coins</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Share your link. When a friend joins through it and finishes their first chat, you each get 50 coins.
        </p>

        <div className="glass mt-8 flex items-center gap-3 rounded-xl2 p-4">
          <span className="flex-1 truncate font-mono text-sm text-ink-muted">{link ?? "loading…"}</span>
          <button
            onClick={copy}
            disabled={!link}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </main>
    </>
  );
}
