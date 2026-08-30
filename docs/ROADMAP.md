# Bounce — Build Roadmap

Sequenced so each phase ships something testable end-to-end, per the instruction to work "one task at a time" and verify as we go. See `docs/PRD.md` and `docs/FSD.md` for the why/how behind each item.

Status as of this build: **Phase 0 and Phase 1 are code-complete and verified locally. Phase 2 is code-complete and verified locally.** Nothing has been deployed to a real VPS or tested against a live Stripe account — those need your credentials/infra and are called out explicitly below.

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
- [x] Report flow (reason picker) wired to the ban escalation ladder
- [x] Moderation scan endpoint + warn/ban wiring is real; the actual NSFW classifier in `src/lib/moderation/classify.ts` is a clearly-marked placeholder that always returns "safe" — **do not launch without replacing it**, see `docs/PRD.md` §6
- [x] Ban system (device fingerprint + IP hash), warn → hour → day → week → permanent
- [x] Coin balance (schema + starting grant of 20)
- [x] Stripe coin-pack purchase (Checkout + webhook) — code verified, not run against live Stripe keys
- [x] One ad placement (banner, between matches — never mid-call); currently a labeled placeholder box, no ad network wired in yet
- [x] Manual admin view: recent reports, ban a reported user, dismiss
- **Exit criteria**: two real devices can guest-match, video/text works, a report bans convincingly, a coin purchase completes end to end. *Verified*: two-client matchmaking, signaling relay, chat relay, and report→ban all confirmed live against a local Postgres. *Not verified*: an actual browser camera/mic handshake and a completed real Stripe payment — both need things this environment doesn't have (a real browser UI, live Stripe keys).

## Phase 2 — Retention & monetization depth
- [x] Optional account creation (NextAuth: Google + email magic link, both no-op until you set credentials), guest→account data migration verified
- [x] Interest tag matching + language filter (free)
- [x] Gender filter, coin/subscription-gated — **country filter deferred**, it needs a geo-IP lookup this build doesn't have; not implemented
- [x] Bounce+ subscription (Stripe subscription mode, entitlement checks gating ads + the gender filter)
- [x] Rematch ("bounce back") within 30s window
- [x] Daily streak + reward
- [x] Referral link + two-sided reward
- [x] Consent-based post-chat share card
- [x] Admin report queue (the ban/dismiss view from Phase 1 — a separate "dashboard" beyond that queue wasn't built, judged not worth the extra scope yet)
- [x] PWA installability (manifest, icons, minimal service worker)

## Phase 3 — Scale / stretch (only after Phase 1–2 are validated with real users)
- [ ] Group/interest rooms (3–8 people)
- [ ] Cosmetic gifting during chat
- [ ] Leaderboards (opt-in, nickname only)
- [ ] Re-evaluate infra: split TURN relay onto its own box if bandwidth is the bottleneck (see `docs/FSD.md` §2)

## Before public launch — do not skip (see README for the same list)
- Replace the placeholder NSFW classifier with a real model
- Replace the placeholder legal copy on `/terms`
- Set up the NCMEC CyberTipline reporting process (`docs/FSD.md` §9)
- Deploy to a real VPS, issue TLS, configure coturn with real credentials
- Confirm an ad network will accept the app before wiring `AdSlot` to a real network
- Set real Stripe keys and confirm a live checkout end to end

## Explicit non-goals until traction justifies them
Native mobile apps, creator payouts, paid moderation API, AI translation/chat features, country filter — see `docs/PRD.md` §10.
