# Go-live checklist

An interactive, checkable version of this same list lives at
`docs/go-live-checklist.html` — open it in a browser and it saves your
progress locally as you check items off.

Everything code-shaped is done and verified (see `docs/ROADMAP.md` Phase 4).
What's left is entirely things only you can do — your accounts, your
credentials, your legal/business decisions. This is the complete, ordered
list. Follow it top to bottom; later steps depend on earlier ones.

Each step says exactly what to do and, where relevant, exactly what file or
env var it touches so you're never guessing.

## 1. Pick your domain and brand name

`docs/PRD.md` lists "Bounce" as the working name with "Flikk"/"Nextly" as
backups if the domain isn't free. Buy the domain now (Namecheap, Cloudflare
Registrar, etc.) — you'll need it for almost every step below. If you land
on a different name than "Bounce," a repo-wide find/replace of the display
strings (`src/app/layout.tsx`, `README.md`, the legal pages) is a later,
optional cleanup — it doesn't block launch.

## 2. Provision the VPS and point DNS at it

1. Provision a VPS — 2 vCPU / 4 GB RAM is enough at launch scale
   (`docs/PRD.md` §9). Hetzner, DigitalOcean, and Vultr all work; pick
   whichever's cheapest in a region close to your expected users.
2. Point your domain's DNS (A record) at the VPS's public IP.
3. Put Cloudflare in front of it (free tier: DNS + DDoS protection + CDN).
   Set the proxy status to "DNS only" (grey cloud) until TLS is issued in
   step 5, then switch to proxied (orange cloud) once the site is live.

## 3. Install Docker on the VPS

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in after this
docker compose version          # confirm it's available (bundled with Docker now)
```

## 4. Clone the repo and generate production secrets

```bash
git clone <your-repo-url> bounce && cd bounce
cp .env.example .env
```

Generate a strong random value for each of these and paste it into `.env`
(each command below prints one):

```bash
openssl rand -base64 32   # SESSION_SECRET
openssl rand -base64 32   # IP_HASH_SALT
openssl rand -base64 32   # ADMIN_TOKEN — this is your /admin login, save it in a password manager
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
```

Also set in `.env`:
- `APP_URL=https://yourdomain.com` (real domain, `https://` — this feeds
  the Stripe redirect URLs, NextAuth callback URLs, and the OpenGraph/social
  share metadata added in `src/app/layout.tsx`)
- `NEXTAUTH_URL` — same value as `APP_URL`
- `NODE_ENV=production`

Leave `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`EMAIL_SERVER`/`EMAIL_FROM`
blank for now if you're skipping steps 8–9 below — guest mode and Stripe
both work fine without them.

## 5. TURN server (coturn) credentials

Some fraction of users are behind restrictive NATs/firewalls where a direct
peer-to-peer WebRTC connection can't form; coturn relays their call instead.
Without this, those users' calls will just fail to connect.

1. Edit `docker/coturn/turnserver.conf`:
   - `user=bounce:CHANGE_ME_TURN_PASSWORD` → replace `CHANGE_ME_TURN_PASSWORD`
     with a strong password (reuse one of the `openssl rand -base64 32`
     values above, or generate a new one).
   - `realm=bounce.example.com` → your real domain.
   - Uncomment `external-ip=` and set it to the VPS's public IP.
2. In `.env`, set:
   ```
   NEXT_PUBLIC_TURN_URL=turn:yourdomain.com:3478
   NEXT_PUBLIC_TURN_USERNAME=bounce
   NEXT_PUBLIC_TURN_CREDENTIAL=<the password from turnserver.conf>
   ```

## 6. nginx config

Edit `docker/nginx/nginx.conf` and replace every `bounce.example.com` with
your real domain.

## 7. First boot + TLS

```bash
docker compose up -d --build
```

Wait for it to come up (`docker compose logs -f app`), then issue a real
TLS certificate:

```bash
# webroot mode against the certbot volume nginx already serves
docker run --rm -v $(pwd)/docker/nginx/certbot:/var/www/certbot \
  -v $(pwd)/docker/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com --email you@yourdomain.com --agree-tos --no-eff-email
```

Add the HTTPS `server` block to `docker/nginx/nginx.conf` (the file has a
comment marking where; point `ssl_certificate`/`ssl_certificate_key` at the
files Certbot just issued under `docker/nginx/ssl`), then:

```bash
docker compose restart nginx
```

Set a cron job to renew the cert before it expires (Let's Encrypt certs
last 90 days):

```bash
0 3 1 * * cd /path/to/bounce && docker run --rm -v $(pwd)/docker/nginx/certbot:/var/www/certbot -v $(pwd)/docker/nginx/ssl:/etc/letsencrypt certbot/certbot renew --quiet && docker compose restart nginx
```

## 8. Apply the database schema

```bash
docker compose exec app npx prisma migrate deploy
```

## 9. Stripe (live payments)

The checkout code builds prices dynamically (`src/lib/payments/stripe-provider.ts`)
— you do **not** need to create Products/Prices in the Stripe dashboard.

1. Create a Stripe account (or switch an existing one to Live mode) at
   dashboard.stripe.com.
2. Copy the **live** secret key into `.env` as `STRIPE_SECRET_KEY`
   (starts with `sk_live_`).
3. Developers → Webhooks → Add endpoint:
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Copy the signing secret into `.env` as `STRIPE_WEBHOOK_SECRET`
     (starts with `whsec_`).
4. Restart the app so it picks up the new env: `docker compose up -d`
5. **Test with a real card before announcing launch**: buy the smallest
   coin pack and confirm coins land on your account, then check
   `docker compose logs app` for webhook errors if they don't.

## 10. (Optional) Google sign-in

Guest mode and Stripe both work without this — skip it for a faster launch
and add it later if you want. To enable:

1. console.cloud.google.com → new project → OAuth consent screen (External,
   fill in app name/logo/support email) → Credentials → Create OAuth client
   ID (Web application).
2. Authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
3. Put the client ID/secret into `.env` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`, then `docker compose up -d` to restart.

## 11. (Optional) Email magic-link sign-in

Also optional — skip if Google sign-in + guest mode is enough for launch.

1. Get SMTP credentials from any provider (Resend, Postmark, SES, even a
   plain Gmail app password for very low volume).
2. Set in `.env`:
   ```
   EMAIL_SERVER=smtp://user:pass@smtp.yourprovider.com:587
   EMAIL_FROM=Bounce <noreply@yourdomain.com>
   ```
3. Restart: `docker compose up -d`

## 12. Legal — fill in the placeholders and get a real review

`/terms` and `/privacy` are launch-ready drafts, not filler text — but every
bracketed, highlighted field (rendered via the `Fill` component in
`src/app/terms/page.tsx` and `src/app/privacy/page.tsx`) is a real fact only
you can supply:

- Your company/legal name and business address or jurisdiction
- Support email, DMCA agent email, privacy/security contact emails
- Governing-law jurisdiction and the liability cap you're comfortable with
- Third-party processors you actually use (email provider, hosting
  provider) and the region your server is in

**Then have an actual lawyer review both pages** before real users see
them — this repo can produce a solid, grounded draft, but it cannot give
you legal advice or sign off on jurisdiction-specific compliance
(COPPA/GDPR/CCPA exposure in particular, given the video-chat-with-strangers
nature of the product).

## 13. NCMEC CyberTipline account (US legal requirement)

If you'll have US users, operators of platforms like this have a legal
obligation to report suspected CSAM to NCMEC. The app already tags reports
as `MINOR_SUSPECTED` and skips them straight to a permanent ban
(`docs/FSD.md` §9) — the reporting itself is a manual step only you can do:

1. Register an account at report.cybertip.org as an Electronic Service
   Provider.
2. Write down (in your own ops notes, not this repo) the exact steps for
   when a `MINOR_SUSPECTED` report or a moderation snapshot scored as
   suspected CSAM comes in via `/admin`, so you're not figuring it out for
   the first time under pressure.

## 14. Ad network (optional — you can launch without it)

`src/components/AdSlot.tsx` is a labeled placeholder; nothing shows until
you wire in a real network. Stranger-video-chat apps are a narrow niche —
many mainstream networks (AdSense) won't accept this category, so budget
time to find one that does (traffic-arbitrage/adult-adjacent networks are
generally more permissive; read their content policy before integrating).
Once you have a snippet, swap it into `AdSlot.tsx` — that part's a small,
mechanical code change.

## 15. Backups

Already built and tested (`scripts/backup-db.sh`, `scripts/restore-db.sh`)
— see `docs/BACKUPS.md` for the full guide. Minimum before launch:

1. Generate a passphrase (`openssl rand -base64 32`), set
   `BACKUP_GPG_PASSPHRASE` in `.env`, save it in your password manager.
2. Set up an off-box storage bucket (Backblaze B2 or Cloudflare R2) and
   `rclone`, set `BACKUP_RCLONE_REMOTE` in `.env`.
3. Add the cron line from `docs/BACKUPS.md`.
4. Run one restore drill before you trust it.

## 16. Uptime monitoring (free, 5 minutes)

Not built into the app — a healthy app can't tell you it's down. Use a
free external monitor:
1. Sign up at UptimeRobot (or healthchecks.io) — free tier is enough.
2. Add an HTTP(S) monitor pointed at `https://yourdomain.com`, checked
   every 5 minutes, with an email/SMS alert on failure.

## 17. Final smoke test before announcing launch

Do this against the real production URL, not localhost:
- [ ] Load the homepage over HTTPS — padlock, no mixed-content warnings
- [ ] Accept the age gate, start a guest session
- [ ] Open the site in two separate browsers/devices, match, confirm video
      and text chat both work
- [ ] Report the other side from one client, confirm the ban lands
      (check `/admin` with your `ADMIN_TOKEN`)
- [ ] Buy the smallest coin pack with a real card, confirm coins land
- [ ] Subscribe to Bounce+ with a real card, confirm entitlement flips
- [ ] Confirm `/terms` and `/privacy` show your real filled-in details, not
      bracketed placeholders
- [ ] Confirm a nightly backup actually ran (`ls backups/` or check your
      off-box bucket) the morning after your first cron-scheduled run

## Ongoing operations

- **Shipping a change**: `git pull`, `docker compose build`,
  `docker compose up -d`, then `docker compose exec app npx prisma migrate
  deploy` if the schema changed. Manual, by design (`docs/FSD.md` — no
  CI/CD for a solo-operator low-ops target).
- **Watch the `/admin` report queue** regularly, especially in the first
  weeks — the NSFW classifier and rate limits reduce abuse, they don't
  eliminate it.
- **Re-run a restore drill** after any schema migration (step 15).
