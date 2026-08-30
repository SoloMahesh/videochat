export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <div className="absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-accent/25 blur-[120px] animate-drift" />
      <div className="absolute right-[-10%] top-[20%] h-[460px] w-[460px] rounded-full bg-accent2/20 blur-[120px] animate-drift-slow" />
      <div className="absolute bottom-[-15%] left-[20%] h-[400px] w-[400px] rounded-full bg-accent2/10 blur-[110px] animate-drift" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]" />
    </div>
  );
}
