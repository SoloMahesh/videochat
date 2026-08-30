# Bounce

Random video & text chat — no signup, matched by shared interests, moderated for real. See `docs/PRD.md`, `docs/FSD.md`, and `docs/ROADMAP.md` for the product plan and architecture behind this build.

## Local development

```bash
cp .env.example .env        # fill in SESSION_SECRET, IP_HASH_SALT, ADMIN_TOKEN at minimum
npm install
npm run db:push             # applies prisma/schema.prisma to your local Postgres
npm run dev                 # runs the custom server (Next.js + Socket.io) on :3000
```

Requires a local Postgres reachable at `DATABASE_URL`. Redis is optional locally — the matchmaking queue runs in-memory in the single Node process either way (see `docs/FSD.md` §2); set `REDIS_URL` only if you want to exercise it.

Camera/mic access requires HTTPS or `localhost` — `npm run dev` on `localhost:3000` works without extra setup.

## Production deploy (single VPS, no CI/CD by design)

1. Provision a VPS (2 vCPU / 4 GB is enough at launch scale — `docs/PRD.md` §9), point your domain's DNS at it, put Cloudflare in front (free tier: DNS + DDoS + CDN).
2. Install Docker + Docker Compose on the VPS.
3. Clone this repo onto the box, `cp .env.example .env` and fill in real production secrets (Stripe live keys, a strong `SESSION_SECRET`/`IP_HASH_SALT`/`ADMIN_TOKEN`, a TURN credential).
4. Edit `docker/nginx/nginx.conf` and `docker/coturn/turnserver.conf` — replace `bounce.example.com` and the coturn placeholders with your real domain/IP/credentials.
5. `docker compose up -d --build`
6. Issue a TLS cert (Certbot, webroot mode against `docker/nginx/certbot`), then add the HTTPS server block to `docker/nginx/nginx.conf` and reload nginx.
7. Run `docker compose exec app npx prisma migrate deploy` to apply the schema.

To ship a change later: `git pull`, `docker compose build`, `docker compose up -d`, then `docker compose exec app npx prisma migrate deploy` if the schema changed. This is a manual checklist, not a pipeline, per the project's low-ops constraint.

### Stripe webhook

Point a Stripe webhook endpoint at `https://<your-domain>/api/payments/webhook` for the `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` events, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. The first covers both coin-pack purchases and new Bounce+ subscriptions; the other two keep subscription status in sync (renewals, failed payments, cancellations).

### Before public launch — do not skip

- Replace the placeholder legal copy in `src/app/terms/page.tsx` with reviewed Terms of Service.
- `src/lib/moderation/classify.ts` runs a real skin-tone-ratio heuristic today (not a no-op), but it's a low-precision signal, not a trained model — replace or supplement it with a real classifier before real users are on this. See `docs/PRD.md` §6.
- Set up the NCMEC CyberTipline reporting process referenced in `docs/FSD.md` §9.
- Confirm an ad network will accept the app before wiring `src/components/AdSlot.tsx` to a real network.

## Project layout

- `src/app` — Next.js App Router pages and API routes
- `src/lib` — matchmaking queue, WebRTC signaling (`lib/socket`), moderation, payments, session/ban logic
- `src/hooks` / `src/components` — client-side WebRTC, guest session, and UI
- `server.ts` — custom Node server attaching Socket.io to the same process as Next.js (see `docs/FSD.md` §1 for why)
- `prisma/schema.prisma` — data model
- `docker-compose.yml`, `docker/` — app + Postgres + Redis + coturn + nginx for the VPS deploy
- `legacy/` — the original static prototype this repo started from, kept for reference only
