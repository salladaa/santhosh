# Hospital launch readiness

This is an acceptance record, not a claim of clinical certification or legal compliance. Application tests passing does not approve a hospital launch.

## Completed in code

- Real database and APIs; server-side roles and patient ownership.
- OPD appointments, visits, structured medicine instructions and private reports.
- IPD beds, admissions, nursing notes and discharge records.
- Invoice/payment history with partial-payment and duplicate-reference checks.
- English/Telugu common controls; IST/INR presentation.
- Password hashing, session revocation, request limits, encryption of report bytes, backup/restore scripts and audit entries.
- Automated integration tests exercising real HTTP requests and database persistence.

## Must be completed with the hospital before live use

- [ ] Named accountable hospital administrator and clinical owner approve the scope.
- [ ] Doctors/nurses verify their accounts, registration numbers, permission boundaries and clinical forms.
- [ ] Test actual registration → visit/prescription → report → appointment → billing flow with synthetic data on the hospital's tablets and phones.
- [ ] Test admission → nursing observations → discharge and verify bed release and patient visibility.
- [ ] Telugu-speaking staff review labels, instructions and remaining English helper/error text.
- [ ] Review identity verification, guardian/minor access, consent/notice, retention, corrections, access requests and account recovery processes.
- [ ] Deploy with HTTPS, encrypted persistent storage, private secrets, monitoring, gateway abuse protection and reviewed file scanning.
- [ ] Add a reviewed MFA/identity solution for staff before public production access; built-in accounts currently use password authentication only.
- [ ] Run an independent security review, including upload scanning, session handling, authorisation, backups, logs and device/session hygiene.
- [ ] Schedule encrypted offsite backups and demonstrate restoration, including report downloads, with original keys.
- [ ] Load-test expected concurrent users and record/report volumes. SQLite is one-server storage, not a multi-replica database.
- [ ] Define outage procedures, support ownership, maintenance windows and recovery expectations.
- [ ] Verify billing practices, required invoice details, reversals/refunds and tax handling for the hospital; the current ledger records simple charges and payments.

## India-specific review sources

The hospital should have its adviser review the applicable framework and commencement dates using the official [MeitY DPDP Rules page](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025). This code does not establish compliance by itself.

If ABDM interoperability is desired, review the official [ABDM Health Data Management Policy](https://abdm.gov.in/publications/policies_regulations/health_data_management_policy). The current portal has no ABHA or ABDM integration; it must not be represented as ABDM-certified. The government describes sandbox validation and security audits for integrations in its [ABDM implementation information](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2152537).

## Functional limits to decide before replacing all paper logs

The present inpatient feature is an admission/nursing-note/discharge register, not a complete ICU or medication-administration system. It has no bed-transfer workflow, nursing shift handover sign-off, fluid balance chart, medication administration reconciliation or automated clinical alerts. Prescriptions contain doctor-entered instructions but no drug-interaction checking or legally qualified electronic signatures. Do not discontinue existing clinical processes that these screens do not cover.
