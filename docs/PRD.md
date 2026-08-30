# Bounce — Product Requirements Document

Working name: **Bounce** (bounce to your next conversation). Backups if the domain isn't free: **Flikk**, **Nextly**. Swap the name in `docs/` and the UI copy once you've picked one — nothing below depends on the final choice.

Status: v1 draft, pre-build. Owner: solo dev. Last updated 2026-08-30.

## 1. Vision

Omegle shut down in 2023 under moderation and legal pressure. OmeTV and the rest of the field survived by doing the bare minimum on safety while adding gimmicks (coin gifting, filters) with dated, ad-choked UIs. The opening for Bounce: **the same instant, no-login stranger connection that made Omegle addictive, wrapped in a product that is fast, feels safe, looks like 2026, and is honest about how it makes money.**

One sentence: *Bounce is a random video & text chat app you can join in one tap with no signup, matched by shared interests, kept clean by lightweight automated moderation, and monetized through cosmetic and convenience upgrades rather than dark patterns.*

## 2. Why people used Omegle (design against this, not against a feature checklist)

- **Zero friction.** No signup, no profile, click and you're talking to a stranger in under 3 seconds. Every second of friction we add loses users. Guest mode is not a fallback tier — it is the primary product.
- **Variable reward.** Every "Next" press is a slot-machine pull — could be boring, could be a great conversation, could be a laugh. The skip button is the single most important interaction in the app; it must be instant (no confirm dialogs, no spinner over 300ms) and always available.
- **Low social stakes.** Nobody here knows you IRL. That's freeing, but it's also why abuse happens — anonymity needs a safety net, not a login wall, or the product stops being what people came for.
- **A story to tell.** "I met someone wild on Omegle" was itself the viral loop, spread by word of mouth and screenshots/clips, not by the app's own referral program. We should make good moments easy to *capture and share* (with consent) rather than try to manufacture virality with gimmicks.

## 3. Target audience

Primary: 16–29 (with an 18+ gate — see §6), bored, mobile-first, used to TikTok-speed content, has used or heard of Omegle/OmeTV. Motivated by curiosity, boredom relief, practicing a language, or just wanting to talk to someone new tonight.

Two usage modes to design for explicitly, because they want different things:
- **Grazers** — here for 90 seconds between other apps, want instant match, instant skip, zero commitment. This is 80% of traffic and where ad revenue lives.
- **Regulars** — come back nightly, want filters (gender/country/interest), want to not lose a good match, are the ones who'll pay.

## 4. Competitive snapshot

| | Omegle (defunct) | OmeTV | Chatspin / CooMeet | **Bounce** |
|---|---|---|---|---|
| Login required | No | No | CooMeet: yes | No (guest-first) |
| Moderation | Minimal → shut down | Basic, slow reports | Basic | Report + automated NSFW screening + fast ban |
| Interest matching | Text tags only | No | Limited | Tags + language + (later) AI topic match |
| Monetization | None (its downfall) | Coins, ads, filters paywall | Subscription-heavy, pushy | Coins + one clean subscription + non-intrusive ads |
| UI | 2009-era | Cluttered, ad-heavy | Cluttered | Minimal, motion-forward, mobile-first |
| Group/community features | No | Limited | No | V2: interest rooms |

Takeaway: nobody in this space has a **good** product. The bar to be "better than Omegle and OmeTV" is UI polish, matching quality, and trust — not feature count.

## 5. Feature list

Status legend: **MVP** = phase 1 launch, **V2** = first growth phase after MVP validates, **V3** = scale/stretch.

### 5.1 Core matching & chat
- MVP — One-tap "Start" → matched to a random stranger, video + audio + text chat in the same window
- MVP — Text-only mode toggle (lower bandwidth, camera-shy users, mobile data)
- MVP — Skip / Next (instant, no confirm) and Stop
- MVP — Guest mode: no account, no email, just a device-bound session
- MVP — Interest tags (typed, comma-separated like original Omegle) bias matchmaking toward shared tags
- V2 — Gender filter, country/region filter (paid — see monetization)
- V2 — Language filter
- V2 — "Rematch" — reconnect with your last partner if you both tap it within 30s of disconnecting
- V3 — Themed/interest rooms (group video, 3–8 people) — this is the "8+" bubble in the reference screenshot

### 5.2 Trust & safety (see §6, this is not optional scope)
- MVP — 18+ age gate + ToS/consent screen before first camera access
- MVP — One-tap Report (with reason) + auto-skip the reported user immediately
- MVP — Block (persistent, never match this device again)
- MVP — Automated NSFW frame sampling on both video streams, self-hosted, free — auto-warns then auto-bans on repeat/severe hits
- MVP — Panic key (Esc / shake-to-end on mobile) instantly kills camera + connection
- MVP — IP + device-fingerprint ban list, cheap ban-evasion friction
- V2 — Manual moderation queue/admin dashboard for reviewed reports
- V2 — "Safe Mode" — new/free accounts start video-blurred until both sides tap "I'm comfortable"
- V3 — Trust score per session (weights matching priority away from repeatedly-reported users)

### 5.3 Accounts (optional, not required to use the app)
- MVP — Optional sign-up (email or Google) to keep coin balance, subscription, and blocked-user list across devices
- V2 — Lightweight profile: display name, avatar, interest tags, streak count
- V2 — Friends: mutual "Add" after a chat, DM outside random matching

### 5.4 Monetization (see §7 for full detail)
- MVP — Coin balance for guests and accounts, Stripe checkout for coin packs
- MVP — Non-intrusive ads for free-tier users (banner + occasional interstitial between matches, never mid-call)
- MVP — Gender filter + country filter gated behind coins or subscription
- V2 — Bounce+ subscription (ad-free, unlimited filters, priority queue, monthly coin stipend)
- V2 — Cosmetic gifts sendable mid-chat (animated sticker/effect), revenue-split-free since it's platform-only (no payout to the recipient in v1 — avoids becoming a "cam site" liability)
- V2 — Referral rewards (both sides get coins when an invited friend completes their first chat)
- V3 — Creator/host mode for interest rooms with paid entry or tipping, revisit legal/liability implications before building

### 5.5 Growth / viral mechanics
- MVP — Shareable "match card" *after* a chat ends, only with both users' explicit consent, no camera capture without both taps — a fun stat card (topic matched, emoji reaction, country flags), not a recording
- MVP — Daily streak counter + small coin reward, classic Duolingo-style retention hook
- V2 — Referral link with a visible reward on both ends ("bring a friend, you both get 50 coins")
- V2 — Social share buttons pre-filled with a fun, safe line (never auto-shares anything with strangers' images/audio)
- V3 — Public leaderboard: friendliest / most active (opt-in, nickname only)

### 5.6 Non-functional requirements
- P50 time-to-match under 4s at moderate load; P50 camera-granted-to-first-frame under 2s
- No call audio/video is ever recorded or stored server-side — signaling only touches metadata (see §6 legal note)
- Mobile web first-class (this audience is majority mobile); installable PWA in V2
- WCAG AA-reasonable contrast/focus states even though the audience skews casual — cheap to do right from day one
- Uptime target 99% (not 99.99% — this is a solo, low-budget project; brief downtime is an acceptable tradeoff, see `docs/ROADMAP.md` budget notes)

## 6. Trust & safety — required baseline, not a "nice to have"

Anonymous stranger video chat carries real legal exposure: minors appearing on camera, CSAM reporting obligations (US platforms must report to NCMEC — see 18 U.S.C. §2258A), and general abuse. This is the reason Omegle actually died — moderation debt, not lack of users. Bounce ships with:

1. **Hard 18+ gate** at first visit (self-attestation + ToS click-through). Not perfect, but it is the legally-expected baseline and it is free.
2. **Self-hosted NSFW classification** on periodic frame samples from both peers (open-source model, e.g. NSFW.js/an open TF.js model, run server-side on decoded snapshot frames — cheap, no third-party API bill). First hit = warning overlay, repeated/severe hit = auto-disconnect + temp ban, tracked per device fingerprint.
3. **One-tap report** with a reason, logged with a short server-side snapshot hash (not full video) for review — never store raw call media.
4. **NCMEC reporting pipeline** wired in from day one even at tiny scale: any confirmed CSAM match/report goes through the legally required reporting flow. This is a process + a form, not a big engineering lift — document the runbook in `docs/FSD.md` §Operations.
5. **Ban system**: device fingerprint + IP + (if logged in) account, escalating: warn → 1hr → 24hr → 7 day → permanent, with a simple appeal form.

This is scoped to be affordable solo-dev work (self-hosted models, no paid moderation API) while covering the realistic risk — see the "Solid baseline" tier this PRD assumes throughout.

## 7. Monetization strategy

Assumption baked into the whole plan: **most users will never pay.** Design monetization to (a) extract real willingness-to-pay from the minority who want control/status, and (b) monetize the free majority passively via ads, without ever making the free experience feel punished — a bad free experience kills the word-of-mouth loop this product depends on.

| Stream | Mechanic | Who pays | Notes |
|---|---|---|---|
| Ads | Banner between/around matches + occasional interstitial on skip (never mid-call, never over video) | Free users (majority) | Start with one network (e.g. Google AdSense / Ezoic-style), swap later if fill rate is bad |
| Coins (consumable) | Buy coin packs via Stripe → spend on gender/country filter sessions, cosmetic gifts, "un-skip"/rematch tokens | Casual spenders | Classic free-to-play consumable pattern, low commitment |
| Bounce+ (subscription) | Monthly: ad-free, all filters unlocked, priority matchmaking, monthly coin stipend | Regulars/power users (§3) | The predictable-revenue anchor; price it like a coffee, not a SaaS tool |
| Referral-driven growth | Not direct revenue, but lowers CAC to ~$0, which matters most given the low budget | — | Treat this as the real growth engine before ever paying for ads |

Everything payment-related is isolated behind a single `PaymentProvider` abstraction (see `docs/FSD.md` §Architecture) so Stripe is a swappable adapter, not scattered through the app.

## 8. What "viral" actually means here (be honest about mechanics)

Growth loops that are realistic for a solo, low-budget, no-marketing-team launch:
1. **Word of mouth from a good core loop** — this is 90% of it. If matching is fast and safe, people bring friends the way they did for Omegle, unprompted.
2. **Consent-based shareable moments** (§5.5) that look good posted to a story/TikTok, driving curiosity clicks — no cost to us beyond the feature.
3. **Two-sided referral reward** — cheap to run, gives an incentive on top of #1.
4. **SEO-friendly, fast public landing page** with no login wall (this doc's own instruction: "public under login also") so search and shared links land straight on a working product, not a signup form.

No paid growth in the MVP budget (§9) — the product has to prove the loop organically first.

## 9. Budget (solo dev, side-hustle constraints)

| Item | Cost | Notes |
|---|---|---|
| VPS | ~$6–12/mo (e.g. Hetzner CX22 2vCPU/4GB or DigitalOcean equivalent) | Runs the Next.js app, Postgres, Redis, coturn (TURN relay) — see `docs/FSD.md` §Infrastructure for why one box is enough at launch |
| Domain | ~$12/yr | |
| Cloudflare | $0 (free tier) | DNS, DDoS protection, CDN for static assets |
| TURN bandwidth | Included in VPS bandwidth allowance at launch scale; watch this first if costs grow | Video relay is the one cost that scales with users |
| NSFW moderation | $0 | Self-hosted open model, no per-call API fee |
| Stripe | 2.9% + $0.30 per transaction | Standard, no monthly fee |
| Ad network | $0 to join | Revenue share, not a cost |
| **Total recurring** | **~$10–15/mo to start** | Re-evaluate the VPS tier once concurrent sessions regularly exceed ~150–200 (see roadmap scaling notes) |

## 10. Out of scope for MVP (explicitly deferred, don't build yet)

- Native mobile apps (mobile web first; PWA in V2)
- Group video rooms beyond 1:1 (V3)
- Any payout/creator-earnings feature (real legal/compliance weight, revisit only if the product has traction)
- Third-party paid moderation API (revisit if self-hosted NSFW screening proves insufficient at scale)
- Real-time translation / AI chat features
