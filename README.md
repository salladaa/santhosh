# Sri Allada Hospitals

Hospital administration and patient portal for a **single hospital instance**, with outpatient and inpatient workflows, English/Telugu interface labels, INR billing, and IST dates.

**Release status: functional pilot, not approved for live clinical use.** The application has a real server and persistent database. Cloud deployment and hospital acceptance/security review are still required. Use a separate deployment and database for each hospital; this is not a shared multi-tenant SaaS.

## See the frontend AND backend

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Choose the Administrator demo account and sign in. Then open **System status** (`/admin/system`) for actual database health, schema version, live table counts, encryption configuration and last recorded backup. This screen is administrator-only.

Node 22.13+ is required; CI and Docker use Node 24. SQLite is provided by Node's built-in `node:sqlite` module. No separate database service is needed for this single-instance deployment.

Demo accounts: `admin@hospital.com` / `admin123`; `john@hospital.com` / `john123`; `sarah@hospital.com` / `sarah123`. These are public sample credentials, not production accounts. New passwords require 12–128 characters.

## Implemented workflows

| Area                | What works                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration        | Patient accounts, contact details, optional DOB/address/emergency contact/allergies; search by name, email, phone or ID                                                                                    |
| Staff               | Named doctor and nurse accounts, registration number, administrator-controlled enable/disable, immediate session revocation                                                                                |
| Outpatient          | Patient appointment requests, staff confirmation/rescheduling, collision checks, check-in, completion and cancellation                                                                                     |
| Visits              | Attributed visit history, complaint, diagnosis, vitals, care notes, medicine name/dose/frequency/duration/instructions and follow-up                                                                       |
| Reports             | PDF/JPEG/PNG upload up to 10 MB; encrypted report bytes; authenticated downloads limited to staff and the owning patient                                                                                   |
| Inpatient           | Wards/beds, admission, one active admission per patient, one occupant per bed, nursing observations, discharge summary and bed release                                                                     |
| Billing             | Numbered invoices, line items, partial payments, cash/UPI/card/bank references, duplicate-receipt and overpayment checks; amounts stored in paise                                                          |
| Patient access      | Own appointments, visit/prescription history, report downloads, invoices and inpatient/discharge history                                                                                                   |
| Language/mobile     | English/Telugu controls and common labels; responsive tablet/mobile layouts; web-app manifest for home-screen use; printable records                                                                       |
| Security/operations | Salted password hashes, server-side roles/ownership, expiring opaque sessions, password change, origin checks, request limits, account throttling, activity/access logs, encrypted backup/verified restore |

Clinical text remains exactly as staff enter it. It is **not machine-translated**, medically interpreted or automatically prescribed. Some explanatory text and validation messages remain English; Telugu wording needs hospital staff review before rollout.

## First-use workflow

1. Sign in as administrator, go to **Staff**, and create doctor/nurse accounts with verified registration details.
2. Register a patient under **Patients**. Give the patient their credentials privately after identity/guardian verification.
3. Book an appointment under **Appointments**, or let the patient request one. Staff confirm requests.
4. Open the patient record as a doctor to record a visit and medicine instructions; staff can upload a report.
5. Add beds under **Inpatient care**, admit a patient, record nursing observations and complete a discharge summary.
6. Use **Billing** to create an invoice and record payments already received. There is no online payment collection.
7. Sign in as the patient from another browser/device to verify their own information.
8. Check **System status** and **Activity log** to see persistence and attribution.

## Production configuration

Copy `.env.example` to your environment/secret manager and fill it privately. Do not send credentials in chat or commit filled environment files.

- `PORTAL_DEMO=false`: no sample accounts/data. A demo database cannot be opened with demo mode disabled.
- `PORTAL_DB_PATH`: writable database path on a persistent volume. Default `.portal/portal.sqlite` in development.
- `PORTAL_ADMIN_EMAIL`, `PORTAL_ADMIN_PASSWORD`: bootstrap administrator for a **new** database only. Password at least 12 characters. Use Account to rotate it later.
- `PORTAL_ORIGIN`: exact public HTTPS origin, without trailing slash.
- `PORTAL_REPORT_KEY`: independent 32-byte key encoded as 64 hexadecimal characters, for AES-256-GCM report encryption. Losing/changing it makes existing reports unreadable; retain the original key securely.
- `PORTAL_BACKUP_KEY`: separate 32-byte hex key for encrypted database backups.
- `PORTAL_BACKUP_DIR`: protected backup directory.
- `PORTAL_DOMAIN`: domain used by the Docker/Caddy deployment.

Use a secure random generator or secret manager for keys. Do not use example passwords/keys. Demo report keys live in the demo database solely for local testing.

```sh
npm run build
npm start
```

The build packages a standalone Node server and its public assets. Production cookies require HTTPS. See [deployment instructions](docs/DEPLOYMENT.md) and [launch readiness](docs/LAUNCH_READINESS.md).

## Database and existing data

SQLite stores real persistent records, not browser localStorage. Schema migrations preserve the earlier patient/user data. Tables include patients, users, sessions, appointments, visits, reports, invoices, payments, beds, admissions, nursing_notes and audit_events. Report content is encrypted in the database, keeping backup/restore atomic with its metadata.

Legacy medicine names, treatment, checkup dates and bill fields remain historical fields. New appointments, clinical history and invoices use separate tables. **Existing numeric legacy balances are not converted from CAD to INR or imported into invoices.** Review old balances before creating new INR invoices. Old browser-only records are still not automatically imported; the old localStorage is left untouched.

Patients with hospital history cannot be deleted. Clinical visits and nursing notes are retained as history; record a new entry for a correction. Current audit records are stored in the same database and are not tamper-evident against a database administrator.

## Backup and recovery

```sh
# Uses PORTAL_DB_PATH, PORTAL_BACKUP_DIR and PORTAL_BACKUP_KEY from the shell.
npm run backup
# Restore into a NEW path; existing files are never overwritten.
npm run restore -- /secure/backups/hospital-TIMESTAMP.sah /secure/recovery/hospital.sqlite
```

Scripts use shell environment variables; they do not automatically read `.env.local`. Backups are consistent SQLite snapshots encrypted with AES-256-GCM. Restore authenticates the backup and checks SQLite integrity and foreign keys before writing the destination. Keep the report encryption key as well as the backup key. Configure daily/offsite backups and rehearse restoration; a successful local backup alone is not disaster recovery.

## Verification

```sh
npm run lint
npm run typecheck
npm run format:check
npm run build
npm test
npm audit --omit=dev
```

Tests run an isolated standalone production server on port 3107 with a temporary database. They cover authentication, roles, patient isolation, persistence/restarts, input/origin validation, conflicts, clinical records, encrypted reports, invoices, beds/admission/discharge, password rotation, staff disabling, and encrypted backup/restore. They never use the development database. GitHub Actions runs these checks on pushes and pull requests.

## Deliberate boundaries

No ABDM/ABHA integration, insurer claims, pharmacy inventory, laboratory analyser integration, medication administration chart, accounting refunds/credit notes, payroll, emergency triage, offline medical-data storage, automatic SMS/WhatsApp, self-service password recovery, or MFA is implemented. Report file-type checks are not malware scanning. Install/use a reviewed file-scanning workflow before public report uploads. Native app-store binaries are not supplied; this is a responsive web app.

SQLite requires one server with persistent local storage; do not deploy unchanged to ephemeral serverless storage or multiple replicas. For larger multi-hospital operations, move to a shared database/object-storage design with tenant isolation and load testing. Cloud costs, domain, identity/MFA service, backup retention, consent/privacy notices and clinical acceptance remain deployment decisions.
