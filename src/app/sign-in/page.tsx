"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { AmbientBackground } from "@/components/AmbientBackground";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <>
      <AmbientBackground />
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Keep your coins across devices</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Sign in to Bounce</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Optional — you can keep using Bounce as a guest. Signing in just keeps your coin balance and history
          synced.
        </p>

        <button
          onClick={() => signIn("google")}
          className="mt-6 rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-accent"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        {sent ? (
          <p className="rounded-xl2 border border-accent2/40 bg-accent2-soft px-4 py-3 text-center text-sm text-accent2">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn("email", { email, redirect: false });
              setSent(true);
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-full border border-line bg-surface-2 px-4 py-3 text-sm focus:border-accent focus:outline-none"
            />
            <button type="submit" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white">
              Email me a sign-in link
            </button>
          </form>
        )}
      </main>
    </>
  );
}
