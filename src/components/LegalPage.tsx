import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(255,86,48,0.14)]" />
          Bounce
        </Link>
        <nav className="flex gap-4 font-mono text-xs text-ink-muted">
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/community-guidelines" className="hover:text-ink">
            Guidelines
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent-ink">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 font-mono text-xs text-ink-muted">Last updated {updated}</p>

        <div className="legal-content mt-10 flex flex-col gap-6 text-sm leading-relaxed text-ink-muted">
          {children}
        </div>
      </main>
    </>
  );
}
