# Bounce — Build Roadmap

Sequenced so each phase ships something testable end-to-end, per the instruction to work "one task at a time" and verify as we go. See `docs/PRD.md` and `docs/FSD.md` for the why/how behind each item.

Status as of this build: **Phase 0, Phase 1, and Phase 2 are code-complete and verified against a real production build** (`next build` + the custom server run with `NODE_ENV=production`, not just `next dev`) — see the note below on why that distinction mattered. Nothing has been deployed to a real VPS or tested against a live Stripe account — those need your credentials/infra and are called out explicitly below.

**A cross-check pass against `docs/PRD.md`'s own feature list** (prompted by "is everything actually done") found two MVP-tier items that had been skipped (Block, the panic key) and several V2 items not yet built (Safe Mode, profile editing, share buttons, friends/DM). All are now built and verified below. That same pass also surfaced a real bug, not a missing feature: `server.ts` (run directly by `tsx`) and Next's API routes (bundled separately by webpack) were two different in-memory instantiations of `src/lib/socket/server.ts`, so any API route calling `emitToUser`/`forceEndSessionForUser` — the DM live-push and, more importantly, the moderation "ban"-severity force-disconnect — was silently writing to a socket registry nobody was reading from. Confirmed this reproduced in an actual production build, not just `next dev`, then fixed it by moving that shared state onto `globalThis` (the same pattern already used for the Prisma client singleton) and re-verified both paths live in production mode afterward. Everything under "verified" below was re-run in production mode after that fix, not just the earlier dev-mode passes.

## Phase 0 — Foundations (infra + skeleton, no product features yet)
- [x] Next.js 14 + TypeScript project scaffold with custom `server.ts` (Socket.io attached)
- [x] Tailwind + design tokens (color/type system) wired up
- [x] Prisma schema from `docs/FSD.md` §3, verified against a local Postgres
- [x] Redis client wired (`src/lib/redis.ts`) but **not yet used** — matchmaking runs in-memory in the single Node process by design (`docs/FSD.md` §2); Redis is provisioned in `docker-compose.yml` for when rate-limiting/presence actually need it, not required to run today
- [x] Docker Compose for app/Postgres/Redis/coturn/Nginx (written, not yet run against a real VPS)
- [ ] VPS provisioned, domain pointed, Cloudflare in front, Certbot cert issued — **your infra, follow the README deploy runbook**
- [x] Base landing page (public, no login) with the visual identity from the design direction

## Phase 1 — MVP core loop (the thing that has to work before anything else matters)
- [x] Guest session issuance (signed cookie + device fingerprint)
- [x] 18+ age gate + ToS click-through (once per device)
- [x] Camera/mic permission flow + text-only fallback mode
- [x] Matchmaking queue + Socket.io signaling relay
- [x] WebRTC P2P connection code path; coturn TURN fallback is configured in `docker-compose.yml`/`docker/coturn` but needs real credentials + your VPS's public IP before it does anything — see README
- [x] Skip / Stop controls, instant and reliable
- [x] Text chat alongside video
- [x] Block — persistent, no-report way to never match a specific device again (separate from Report/ban)
- [x] Panic key — Esc during a search or call instantly does what Stop does
- [x] Report flow (reason picker) wired to the ban escalation ladder
- [x] Moderation scan endpoint + warn/ban wiring is real, **and now actually force-disconnects the live call** (the cross-module bug above meant it silently didn't, before this pass); `src/lib/moderation/classify.ts` runs a real skin-tone-ratio heuristic (decoded via `sharp`) rather than a no-op — a genuine, decades-old signal, not a trained model, so it over-flags things like beach photos/closeups and under-flags nudity outside its RGB assumptions. **Do not launch on this alone** — swap in a real trained classifier (open model or a paid API) first, see `docs/PRD.md` §6
- [x] Ban system (device fingerprint + IP hash), warn → hour → day → week → permanent
- [x] Coin balance (schema + starting grant of 20)
- [x] Stripe coin-pack purchase (Checkout + webhook) — code verified, not run against live Stripe keys
- [x] One ad placement (banner, between matches — never mid-call); currently a labeled placeholder box, no ad network wired in yet
- [x] Manual admin view: recent reports, ban a reported user, dismiss
- **Exit criteria**: two real devices can guest-match, video/text works, a report bans convincingly, a coin purchase completes end to end. *Verified*: two-client matchmaking, signaling relay, chat relay, report→ban, Block, the panic key (real browser), and the moderation force-disconnect all confirmed live in a production build. *Not verified*: an actual browser camera/mic WebRTC handshake between two peers and a completed real Stripe payment — both need things this environment doesn't have (two real browsers/cameras, live Stripe keys).

## Phase 2 — Retention & monetization depth
- [x] Optional account creation (NextAuth: Google + email magic link, both no-op until you set credentials), guest→account data migration verified
- [x] Interest tag matching + language filter (free)
- [x] Gender filter, coin/subscription-gated — **country filter deferred**, it needs a geo-IP lookup this build doesn't have; not implemented
- [x] Bounce+ subscription (Stripe subscription mode, entitlement checks gating ads + the gender filter)
- [x] Rematch ("bounce back") within 30s window
- [x] Daily streak + reward
- [x] Referral link + two-sided reward
- [x] Consent-based post-chat share card, with a real Share action (Web Share API + clipboard fallback)
- [x] Safe Mode — mutual-consent video blur for new/free users on their first few video chats
- [x] Lightweight profile editing (emoji avatar, display name, default interest tags)
- [x] Friends (mutual add after a chat, same pattern as Rematch) + a basic DM between friends, with live push when both are online
- [x] Admin report queue (the ban/dismiss view from Phase 1 — a separate "dashboard" beyond that queue wasn't built, judged not worth the extra scope yet)
- [x] PWA installability (manifest, icons, minimal service worker)
- [ ] Cosmetic gifts sendable mid-chat — **not built**. Explicitly deferred: needs an actual gift/animation catalog (art assets this environment can't produce) for a feature the PRD itself already flagged as revenue-thin (no payout, platform-only). Revisit once there's real usage to justify the art budget.

## Phase 3 — Scale / stretch (only after Phase 1–2 are validated with real users)
- [ ] Group/interest rooms (3–8 people)
- [ ] Leaderboards (opt-in, nickname only)
- [ ] Re-evaluate infra: split TURN relay onto its own box if bandwidth is the bottleneck (see `docs/FSD.md` §2)

## Before public launch — do not skip (see README for the same list)
- Replace the skin-tone-heuristic NSFW classifier with a real trained model (or a paid API) — it functions today but is low-precision by nature
- Replace the placeholder legal copy on `/terms`
- Set up the NCMEC CyberTipline reporting process (`docs/FSD.md` §9)
- Deploy to a real VPS, issue TLS, configure coturn with real credentials
- Confirm an ad network will accept the app before wiring `AdSlot` to a real network
- Set real Stripe keys and confirm a live checkout end to end

## Explicit non-goals until traction justifies them
Native mobile apps, creator payouts, paid moderation API, AI translation/chat features, country filter, cosmetic gifting — see `docs/PRD.md` §10.
