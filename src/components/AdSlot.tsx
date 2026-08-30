/**
 * A single banner placement shown only between matches — never mid-call
 * (PRD §7/§5.4: ads are never intrusive on the actual chat). This renders a
 * placeholder box; wire in your ad network's snippet here once one is
 * confirmed to accept a stranger-chat app (FSD §10 open question). Hide it
 * entirely for Bounce+ subscribers once that entitlement check exists.
 */
export function AdSlot() {
  return (
    <div className="mt-6 flex h-16 items-center justify-center rounded-xl2 border border-dashed border-line font-mono text-[11px] uppercase tracking-wide text-ink-muted">
      ad placement — free tier only
    </div>
  );
}
