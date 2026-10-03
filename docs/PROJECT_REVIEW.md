# Sri Allada Hospitals: project review

## Original prototype

The original application provided patient registration, simple appointment and medicine fields, bill totals, and separate administrator/patient screens. Data and roles were controlled in the browser. It established the workflow but did not provide shared, protected hospital records.

## Implemented in version 0.2.0

| Area       | Current behavior                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Identity   | Server sessions, hashed passwords, admin/doctor/nurse/patient roles, account password changes, staff suspension                      |
| Records    | Persistent SQLite database, migrations, patient ownership checks, demographics and allergies, version conflict checks                |
| Outpatient | Appointment requests, approval, doctor and patient overlap checks, rescheduling, attributed consultation and prescription history    |
| Inpatient  | Wards/beds, admission, occupancy checks, nursing observations, discharge summary and patient history                                 |
| Reports    | Authenticated uploads/downloads, PDF/image validation, encrypted attachments, access audit                                           |
| Billing    | INR invoice line items, partial payments, receipt references, duplicate and overpayment checks                                       |
| Interface  | Hospital name and supplied photo, responsive staff/patient workspaces, English/Telugu navigation and key labels, printable summaries |
| Operations | Live database status and audit screen, encrypted backup and restore commands, production packaging, deployment guide and GitHub CI   |

Integration tests verify authorization, ownership isolation, stale edits, clinical workflows, persistence, encrypted reports, backup recovery and the production demo-data guard. These are software checks, not clinical acceptance or independent security certification.

## Recommended next work

These priorities follow observed gaps in this repository:

1. Complete a supervised hospital trial with synthetic records: review clinical fields, Telugu wording, bedside tablet usability and printed prescriptions/discharge summaries.
2. Add MFA and verified account recovery, reception/billing roles, access reviews and hospital-specific consent/retention procedures.
3. Add bed transfers, medication administration records, fluid balance, structured vital-sign charts and clinical sign-off according to the hospital's documented practice.
4. Add reminders through a consent-aware SMS/WhatsApp provider, with delivery tracking and minimal information in notifications.
5. Add pharmacy stock, laboratory orders/results, insurer workflows, refunds and reconciliation if required by the hospital.
6. Add operational reporting and a validated legacy-data import. Introduce PostgreSQL before multiple app replicas or multi-hospital tenancy.

## Release status

This is a functional single-hospital pilot. Cloud deployment is prepared but requires a hosting account, persistent storage, domain and operating configuration. See [launch readiness](LAUNCH_READINESS.md) for remaining requirements before real patient use and [deployment](DEPLOYMENT.md) for setup and recovery.
