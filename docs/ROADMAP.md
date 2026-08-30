# Bounce — Build Roadmap

Sequenced so each phase ships something testable end-to-end, per the instruction to work "one task at a time" and verify as we go. See `docs/PRD.md` and `docs/FSD.md` for the why/how behind each item.

## Phase 0 — Foundations (infra + skeleton, no product features yet)
- [ ] Next.js 14 + TypeScript project scaffold with custom `server.ts` (Socket.io attached)
- [ ] Tailwind + design tokens (color/type system) wired up
- [ ] Prisma schema from `docs/FSD.md` §3, Postgres running locally + on VPS
- [ ] Redis running locally + on VPS
- [ ] Docker Compose for app/Postgres/Redis/coturn/Nginx
- [ ] VPS provisioned, domain pointed, Cloudflare in front, Certbot cert issued
- [ ] Base landing page (public, no login) with the visual identity from the design direction

## Phase 1 — MVP core loop (the thing that has to work before anything else matters)
- [ ] Guest session issuance (signed cookie + device fingerprint)
- [ ] 18+ age gate + ToS click-through (once per device)
- [ ] Camera/mic permission flow + text-only fallback mode
- [ ] Matchmaking queue (Redis) + Socket.io signaling relay
- [ ] WebRTC P2P connection + coturn TURN fallback
- [ ] Skip / Stop controls, instant and reliable
- [ ] Text chat alongside video
- [ ] Report flow (reason picker) wired to the ban escalation ladder
- [ ] Self-hosted NSFW frame-sampling moderation on outgoing streams
- [ ] Basic ban system (device fingerprint + IP hash), warn → temp → permanent
- [ ] Coin balance (schema + starting grant), no spending yet
- [ ] Stripe coin-pack purchase (Checkout + webhook)
- [ ] One ad placement (banner, between matches — never mid-call)
- [ ] Manual admin view: recent reports, ban/unban a user
- **Exit criteria**: two real devices can guest-match, video/text works, a report bans convincingly, a coin purchase completes end to end.

## Phase 2 — Retention & monetization depth
- [ ] Optional account creation (NextAuth), guest→account data migration
- [ ] Interest tag matching improvements + language filter
- [ ] Gender + country filters, coin/subscription-gated
- [ ] Bounce+ subscription (Stripe subscription mode, entitlement checks)
- [ ] Rematch ("bounce back") within 30s window
- [ ] Daily streak + reward
- [ ] Referral link + two-sided reward
- [ ] Consent-based post-chat share card
- [ ] Moderation admin dashboard (queue, not just a raw list)
- [ ] PWA installability

## Phase 3 — Scale / stretch (only after Phase 1–2 are validated with real users)
- [ ] Group/interest rooms (3–8 people)
- [ ] Cosmetic gifting during chat
- [ ] Leaderboards (opt-in, nickname only)
- [ ] Re-evaluate infra: split TURN relay onto its own box if bandwidth is the bottleneck (see `docs/FSD.md` §2)

## Explicit non-goals until traction justifies them
Native mobile apps, creator payouts, paid moderation API, AI translation/chat features — see `docs/PRD.md` §10.
