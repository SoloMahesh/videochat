"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";

type Friend = { id: string; name: string | null; image: string | null };

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => setFriends(data.friends ?? []))
      .catch(() => setFriends([]));
  }, []);

  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(255,86,48,0.14)]" />
          Bounce
        </Link>
        <Link href="/chat" className="font-mono text-xs text-ink-muted hover:text-ink">
          Back to chat
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Outside random matching</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Friends</h1>
        <p className="mt-2 text-sm text-ink-muted">
          People you both added after a chat. No one lands here without both sides agreeing.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          {friends === null && <p className="text-sm text-ink-muted">Loading…</p>}
          {friends?.length === 0 && (
            <p className="glass rounded-xl2 p-6 text-center text-sm text-ink-muted">
              No friends yet — the option to add someone shows up after a chat ends.
            </p>
          )}
          {friends?.map((f) => (
            <Link
              key={f.id}
              href={`/friends/${f.id}`}
              className="glass flex items-center gap-3 rounded-xl2 p-4 transition hover:border-accent"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg">
                {f.image ?? "👤"}
              </span>
              <span className="text-sm font-medium text-ink">{f.name ?? "Anonymous"}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
