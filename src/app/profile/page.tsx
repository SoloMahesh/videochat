"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { getDeviceId } from "@/lib/device";

const AVATARS = ["🦊", "🐨", "🐢", "🦄", "🐙", "🦁", "🐝", "🐧", "🦋", "🐬", "🌵", "🍉"];

type Profile = {
  name: string | null;
  avatar: string | null;
  gender: string | null;
  defaultInterestTags: string[];
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { headers: { "x-device-id": getDeviceId() } })
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name ?? "");
        setTagsInput(data.defaultInterestTags.join(", "));
      })
      .catch(() => {});
  }, []);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "x-device-id": getDeviceId(), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const data = await res.json();
    setProfile((prev) => (prev ? { ...prev, ...data } : prev));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!profile) {
    return (
      <>
        <AmbientBackground />
        <div className="flex min-h-screen items-center justify-center font-mono text-sm text-ink-muted">Loading…</div>
      </>
    );
  }

  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-hero-soft)]" />
          Bounce
        </Link>
        {saved && <span className="font-mono text-xs text-accent2">Saved</span>}
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Your profile</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Nothing required — Bounce works fine without this</h1>

        <div className="card mt-8 p-6">
          <label className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Avatar</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => patch({ avatar: a })}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition ${
                  profile.avatar === a ? "bg-accent-soft shadow-inset-sm" : "shadow-flat hover:shadow-extrude-sm"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <label className="mt-6 block font-mono text-[10px] uppercase tracking-wide text-ink-muted">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => patch({ name })}
            maxLength={24}
            placeholder="Anonymous"
            className="input2 mt-2"
          />

          <label className="mt-6 block font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            Default interests
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={() => patch({ defaultInterestTags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="music, hiking, games"
            className="input2 mt-2"
          />
          <p className="mt-2 text-xs text-ink-muted">Pre-fills the interests box on the chat page.</p>
        </div>
      </main>
    </>
  );
}
