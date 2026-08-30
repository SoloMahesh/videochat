import { AmbientBackground } from "@/components/AmbientBackground";

export const metadata = { title: "Community Guidelines — Bounce" };

const RULES = [
  "You must be 18 or older to use Bounce.",
  "No nudity, sexual content, or sexual solicitation.",
  "No harassment, hate speech, or threats.",
  "Never involve anyone who appears to be a minor — this is reported, not just banned.",
  "No recording or redistributing another person's video without consent.",
  "No spam, scams, or advertising your own service.",
];

export default function GuidelinesPage() {
  return (
    <>
      <AmbientBackground />
      <main className="mx-auto max-w-2xl px-6 py-16 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">Keeping Bounce livable</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Community Guidelines</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Automated screening and reports enforce these in real time. Breaking one gets you a warning first, then an
          escalating ban — see <code className="font-mono">docs/PRD.md</code> §6 for the exact ladder.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {RULES.map((rule) => (
            <li key={rule} className="card px-5 py-4 text-sm text-ink-muted">
              {rule}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
