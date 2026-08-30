"use client";

import { useState } from "react";

export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/90 px-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-xl2 p-8 animate-fade-in">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Before you bounce in</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink">You have to be 18 or older</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Bounce connects you with strangers over live video. It&rsquo;s only for adults, and it&rsquo;s moderated —
          nudity, harassment, and anything involving a minor gets you removed and reported.
        </p>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-line bg-surface-2 accent-accent"
          />
          <span>
            I&rsquo;m 18 or older and I agree to the{" "}
            <a href="/terms" className="text-accent-ink underline underline-offset-2">
              Terms
            </a>{" "}
            and{" "}
            <a href="/community-guidelines" className="text-accent-ink underline underline-offset-2">
              Community Guidelines
            </a>
            .
          </span>
        </label>

        <div className="mt-7 flex flex-col gap-2">
          <button
            type="button"
            disabled={!agreed}
            onClick={onConfirm}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
          <a
            href="https://www.google.com"
            className="rounded-full px-6 py-3 text-center text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            I&rsquo;m under 18, take me back
          </a>
        </div>
      </div>
    </div>
  );
}
