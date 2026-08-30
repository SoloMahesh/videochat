"use client";

import { useState } from "react";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AgeGate } from "@/components/AgeGate";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useWebRTC, type ChatMode, type ReportReason } from "@/hooks/useWebRTC";
import { useModerationScan } from "@/hooks/useModerationScan";
import { AdSlot } from "@/components/AdSlot";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "NUDITY", label: "Nudity or sexual content" },
  { value: "HARASSMENT", label: "Harassment or hate speech" },
  { value: "MINOR_SUSPECTED", label: "This looks like a minor" },
  { value: "SPAM", label: "Spam or advertising" },
  { value: "OTHER", label: "Something else" },
];

export default function ChatPage() {
  const { state, confirmAge } = useGuestSession();
  const rtc = useWebRTC();
  const [mode, setMode] = useState<ChatMode>("VIDEO");
  const [tagsInput, setTagsInput] = useState("");
  const [draft, setDraft] = useState("");
  const [showReport, setShowReport] = useState(false);

  useModerationScan({ active: rtc.status === "connected" && mode === "VIDEO", videoRef: rtc.localVideoRef });

  if (state.status !== "ready") {
    return (
      <>
        <AmbientBackground />
        <div className="flex min-h-screen items-center justify-center font-mono text-sm text-ink-muted">
          {state.status === "banned" ? "This device is currently banned from Bounce." : "Loading…"}
        </div>
      </>
    );
  }

  const interestTags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <>
      <AmbientBackground />
      {!state.session.ageConfirmed && <AgeGate onConfirm={confirmAge} />}

      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(255,86,48,0.14)]" />
          Bounce
        </Link>
        <Link href="/coins" className="font-mono text-xs text-ink-muted hover:text-ink">
          {state.session.coinBalance} coins
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24">
        {rtc.status === "idle" && (
          <div className="glass mx-auto max-w-md rounded-xl2 p-8 animate-fade-in">
            <h1 className="font-display text-2xl font-bold">Ready when you are</h1>
            <p className="mt-2 text-sm text-ink-muted">Pick a mode, add a few interests if you want, then bounce in.</p>

            <div className="mt-6 flex gap-2">
              {(["VIDEO", "TEXT"] as ChatMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    mode === m ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {m === "VIDEO" ? "Video" : "Text only"}
                </button>
              ))}
            </div>

            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="interests, comma, separated"
              className="mt-4 w-full rounded-full border border-line bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />

            <button
              onClick={() => rtc.start({ mode, interestTags })}
              className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Start
            </button>
            <AdSlot />
          </div>
        )}

        {rtc.status === "searching" && (
          <div className="glass mx-auto max-w-md rounded-xl2 p-8 text-center animate-fade-in">
            <p className="font-mono text-sm uppercase tracking-wide text-accent-ink animate-pulse">Searching…</p>
            <p className="mt-2 text-sm text-ink-muted">Looking for someone to bounce with.</p>
            <button onClick={rtc.stop} className="mt-6 rounded-full border border-line px-5 py-2 text-sm text-ink-muted hover:text-ink">
              Cancel
            </button>
            <AdSlot />
          </div>
        )}

        {rtc.status === "banned" && (
          <div className="glass mx-auto max-w-md rounded-xl2 p-8 text-center animate-fade-in">
            <p className="font-display text-lg font-bold">You&rsquo;ve been banned</p>
            <p className="mt-2 text-sm text-ink-muted">This device was reported and confirmed for a guideline violation.</p>
          </div>
        )}

        {rtc.status === "error" && (
          <div className="glass mx-auto max-w-md rounded-xl2 p-8 text-center animate-fade-in">
            <p className="font-display text-lg font-bold">Couldn&rsquo;t connect</p>
            <p className="mt-2 text-sm text-ink-muted">Check your camera/mic permissions and try again.</p>
            <button onClick={rtc.stop} className="mt-6 rounded-full border border-line px-5 py-2 text-sm text-ink-muted hover:text-ink">
              Back
            </button>
          </div>
        )}

        {rtc.status === "connected" && (
          <div className="animate-fade-in">
            {rtc.warning && (
              <div className="mb-4 rounded-xl2 border border-accent/40 bg-accent-soft px-4 py-2 text-center text-sm text-accent-ink">
                {rtc.warning}
              </div>
            )}

            {rtc.sharedTags.length > 0 && (
              <p className="mb-3 text-center font-mono text-xs text-ink-muted">
                shared interest: {rtc.sharedTags.join(", ")}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
              <div className="relative aspect-video overflow-hidden rounded-xl2 border border-line bg-surface-2">
                {mode === "VIDEO" ? (
                  <video ref={rtc.remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-xs text-ink-muted">text mode</div>
                )}
                {mode === "VIDEO" && (
                  <video
                    ref={rtc.localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-3 right-3 h-24 w-32 rounded-lg border border-line object-cover"
                  />
                )}
              </div>

              <div className="flex h-[min(60vh,420px)] flex-col rounded-xl2 border border-line bg-surface">
                <div className="flex-1 overflow-y-auto p-3">
                  {rtc.messages.map((m, i) => (
                    <div key={i} className={`mb-2 flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                      <span
                        className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                          m.from === "me" ? "bg-accent text-white" : "bg-surface-2 text-ink"
                        }`}
                      >
                        {m.text}
                      </span>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    rtc.sendMessage(draft);
                    setDraft("");
                  }}
                  className="flex gap-2 border-t border-line p-3"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Say something…"
                    className="flex-1 rounded-full border border-line bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                  <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
                    Send
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <button onClick={rtc.skip} className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:brightness-110">
                Next →
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink-muted hover:text-ink"
              >
                Report
              </button>
              <button onClick={rtc.stop} className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink-muted hover:text-ink">
                Stop
              </button>
            </div>
          </div>
        )}
      </main>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/90 px-4 backdrop-blur-sm">
          <div className="glass w-full max-w-sm rounded-xl2 p-6 animate-fade-in">
            <h2 className="font-display text-lg font-bold">Report this person</h2>
            <div className="mt-4 flex flex-col gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    rtc.report(r.value);
                    setShowReport(false);
                  }}
                  className="rounded-xl2 border border-line px-4 py-3 text-left text-sm text-ink hover:border-accent hover:bg-accent-soft"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowReport(false)} className="mt-4 text-sm text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
