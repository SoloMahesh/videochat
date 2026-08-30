export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[13px] font-medium text-accent-ink">
      [{children}]
    </mark>
  );
}
