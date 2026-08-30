export const metadata = { title: "Terms — Bounce" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-ink">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Legal</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Terms of Service</h1>
      <p className="mt-6 text-sm leading-relaxed text-ink-muted">
        Placeholder — replace with reviewed legal terms before public launch. At minimum this needs: the 18+
        requirement, a no-recording/no-redistribution clause for the anonymous nature of chats, the moderation and
        ban policy referenced in <code className="font-mono">docs/PRD.md</code> §6, refund policy for coin
        purchases, and a DMCA/CSAM reporting contact. Do not launch on this placeholder text.
      </p>
    </main>
  );
}
