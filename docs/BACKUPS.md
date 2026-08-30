# Backups

The Postgres database is the only stateful thing on the VPS that isn't
reconstructable from source (docs/FSD.md "Backups"). Everything below is
already built and tested (`scripts/backup-db.sh`, `scripts/restore-db.sh`);
the parts that need *your* accounts/credentials are called out explicitly.

## What's already done for you

- `scripts/backup-db.sh` — dumps the `bounce` database, gzips it, optionally
  GPG-encrypts it (symmetric passphrase), optionally uploads it off-box via
  `rclone`, and prunes local copies older than `BACKUP_RETENTION_DAYS`.
- `scripts/restore-db.sh` — decrypts (if needed) and restores a dump,
  dropping and recreating the `bounce` database. Prompts for confirmation
  since it's destructive.
- Both scripts auto-detect docker-compose vs. a bare-metal/local Postgres
  (they use `docker compose exec` against the `postgres` service when it's
  running, otherwise `DATABASE_URL` directly) — no flags to remember.
- Verified end-to-end on 2026-08-30: ran a real backup, encrypted it,
  decrypted it, restored it into the database, and confirmed row counts
  matched exactly before and after.

## What you need to do

1. **Add a strong passphrase.** Generate one (e.g. `openssl rand -base64
   32`) and set `BACKUP_GPG_PASSPHRASE` in your production `.env`. Save it
   in your password manager too — if you lose it, your backups are
   unrecoverable. Without this set, backups are still taken but left
   unencrypted on disk, which is not safe for off-box storage.

2. **Pick off-box storage and install `rclone`.** Backups must leave the
   VPS — a disk failure or a compromised box should not be able to destroy
   both the live database and its backups. Any object storage works
   (Backblaze B2 and Cloudflare R2 both have free tiers large enough for a
   database this size and no egress fees on R2):
   ```bash
   curl https://rclone.org/install.sh | sudo bash
   rclone config   # walks you through adding a remote, e.g. named "b2"
   ```
   Then set `BACKUP_RCLONE_REMOTE=b2:your-bucket-name/bounce-backups` in
   `.env`.

3. **Add the cron job** (as the user that can run `docker compose`, or
   root):
   ```bash
   crontab -e
   # nightly at 3:10am server time
   10 3 * * * cd /path/to/bounce && ./scripts/backup-db.sh >> /var/log/bounce-backup.log 2>&1
   ```

4. **Run a restore drill before you rely on it.** Backups no one has ever
   restored are not backups. Once a real nightly backup exists:
   ```bash
   ./scripts/restore-db.sh backups/bounce-<timestamp>.sql.gz.gpg
   ```
   on a throwaway VPS or a local copy of the stack — never against
   production just to "test" it. Confirm the app comes up and a spot-check
   of user/session counts looks right. Repeat this after any major schema
   migration.

5. **(Optional, later)** Once this is stable, consider a second, less
   frequent copy in a different provider/region than your primary bucket,
   for the small extra cost — belt and suspenders against a provider-level
   outage.
