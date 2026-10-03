# Deploying a hospital instance

## State of this release

The Docker and reverse-proxy files are prepared. No cloud resources, domain, payment account, or public hospital service have been created. The application must pass the hospital's acceptance and security review before real patient data is entered.

The GitHub repository stores application source only. Never store a live database, report, backup, private key or filled environment file there, especially in a public repository.

## Deployment topology

```text
Patient / staff phone, tablet, laptop
                  |
              HTTPS domain
                  |
              Caddy proxy
                  |
         Node 24 standalone app
                  |
       Persistent local SQLite volume
       (encrypted report content)
                  |
      Encrypted backups → separate private storage
```

One app instance per hospital and one replica. Do not share a SQLite file across network filesystems or create independent replicas with different local databases. Choose a server/region and data-handling agreement appropriate to the hospital; this project does not decide data residency obligations for you.

## Server setup

1. Provision a persistent Linux server with Docker/Compose, restricted administrator SSH, firewall, disk encryption, monitoring and enough storage for reports. Keep the database network-private.
2. Point the chosen domain's DNS at the server. Allow public TCP 80/443 for Caddy, not the app's port 3000.
3. Check out a reviewed release. Copy `.env.example` to a protected `.env` and set every Compose-required value. File permissions should restrict it to the deployment owner.
4. Use a **new** production database, `PORTAL_DEMO=false`, a unique administrator password and independent report/backup keys. Store recovery copies of keys in a secret manager.
5. Run `docker compose up --build -d` from the project directory. Caddy is configured to obtain TLS for the domain; DNS must be ready.
6. Sign in at `https://YOUR-DOMAIN`, visit System status and verify configuration and health. Change the administrator password from Account.
7. Create named staff accounts. Verify a sample patient sees only their own records. Complete `LAUNCH_READINESS.md` before patient use.

Docker is not available in the development environment used for this iteration, so the Docker image and Caddy deployment still need to be built and tested on the target server. The application itself is tested using the packaged standalone production server.

## Backups

Run `docker compose exec -T app node scripts/backup.mjs` from a daily scheduler on the server. It writes encrypted `.sah` files to `/data/backups` and records success for System status. Alert on failures; do not silently ignore nonzero exits. Copy encrypted backups to a separate private storage account/bucket and implement the hospital's retention policy. A backup on the same disk will not survive disk loss.

Restore a selected backup to a NEW database path in a separate recovery environment using `scripts/restore.mjs`. Use the original report key when starting the restored app. Verify patient counts, report downloads, appointments and admissions. Document the achieved recovery time and data-loss window.

## Updates

Back up first, test migrations on a restored copy, then deploy the reviewed build. Database migrations run on startup and preserve existing records. Do not blindly roll application code back across schema changes. Keep a verified pre-upgrade backup and restoration instructions.

## HTTPS, mobile and caching

The app uses Secure cookies in production and checks the exact configured public origin for mutations. The manifest supports home-screen use on compatible browsers. Patient records are deliberately not cached for offline access. A working connection is required; maintain the hospital's downtime process.

## Remaining infrastructure choices

Cloud provider/account, domain, region, cost limit, backup destination/retention, alert recipients, malware scanning, stronger identity/MFA and patient account-recovery workflow still need to be selected. Do not expose the local development server to the internet as a deployment substitute.
