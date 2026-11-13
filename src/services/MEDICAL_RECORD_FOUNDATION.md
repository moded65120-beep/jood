# Phase 1 shared medical record foundation

## Identity and access contract

`demoChildAccess.js` explicitly maps the future Mother route aliases:

| Alias | Canonical ID | Profile policy |
| --- | --- | --- |
| adam | demo-child-3 | Existing Adam Ahmad profile, DOB, IDs and records remain unchanged. The Mother branch's illustrative age is not imported. |
| lina | demo-child-lina | New separate fictional Lina profile. DOB, age, file number and national ID are unknown, not inferred from the Mother branch's age label. |

`demo-mother-sara` is linked only to these two canonical IDs. `demo-doctor-sarah-ahmad` has an explicit demo eligibility list; its initial patient list remains the original eight. Existing additional assignments are imported from the legacy follow-up child IDs and from note/assessment owners. Lina is available in the canonical store and Mother read selectors, but is not automatically added to the doctor's patient list. Doctor `assignChild` can explicitly assign an eligible canonical ID; the current Add Existing Patient dialog retains its original registered-child fixture choices in Phase 1. No child is matched by name or repurposed. No actual Mother identity or access grant is inferred from these fictional IDs.

## Ownership and persistence

`MedicalRecordProvider` is mounted once under the existing LanguageProvider in `main.jsx`. It owns one repository snapshot; DoctorDashboard now owns only UI state and its separate Calendar hook. No App routes, locale dictionaries, Mother files, Calendar code, growth chart, vaccination or milestone code were changed.

The versioned snapshot key is `nomu.demo.sharedMedicalRecords.v1`. It contains canonical child records (including profiles, existing clinical measurements, visits, prescriptions, notes, assessments and void metadata, clinical follow-ups), doctor patient-list assignments and a revision. Successful doctor commands write one complete validated snapshot before publishing it to React. Failed validation/storage writes return false without reporting successful saves. Data remains available during navigation and after refresh in the same browser.

On first load without a snapshot, the existing loaders read these keys:

- `nomu.doctor.demoStandaloneNotes.v1`
- `nomu.doctor.demoClinicalAssessments.v1`
- `nomu.doctor.demoFollowUpAppointments.v1`

The legacy keys remain byte-for-byte intact: no deletion, empty-array overwrite or second persistence effect writes them. The first successful medical command checkpoints imported data into the shared snapshot, which becomes authoritative for subsequent loads. Do not run an older doctor client that continues writing legacy keys alongside this client. Unexpected changes before the first checkpoint, invalid/partial legacy input, an invalid snapshot, or an unavailable browser store block writes and surface an existing localized storage warning. The old localized notes storage warning is reused without changing locale files; operation-specific form errors still appear on failed commands. Incompatible raw bytes remain available for manual review/recovery. A newer snapshot written by another repository instance is not silently overwritten. This comparison is a best-effort stale-write guard, not transactional multi-user concurrency.

The repository does not manufacture visits, diagnoses, medications or assessments. Notes derived from visits remain a read projection using clinicalNotesFor; they are not duplicate stored notes. A prescription's optional visit link remains unchanged. Assessment void reason, actor, timestamp and original clinical content remain intact; voided assessments remain non-editable. Current follow-up summaries are recalculated from appointments without rewriting historical visit dates. Calendar booking requests are untouched and never converted to clinical follow-ups.

Previously memory-only visits/prescriptions from an older app instance cannot be recovered after they were lost on refresh. This implementation cannot inspect or recover another browser's state. It does not silently import the Mother branch's fixture diagnoses, prescriptions or clinical measurements. Only validated legacy storage and the new snapshot are loaded. In-memory original visit text handling (including the existing visit save helper's trimming) is unchanged; migration/read selectors do not translate or rewrite stored clinical text.

## Future Mother read-only API

Use `useMotherMedicalRecords(motherId)` inside the existing provider. It returns only `children` and `getMedicalRecord(idOrAlias)`. Unknown mothers, unknown children, or unlinked children return an empty list/null. Returned models are deeply cloned and frozen: nested arrays and objects cannot mutate the source. There are no save/edit/void/assign functions in this API. `medicalRecordSelectors.js` also provides these pure selectors for future tests or adapters. The underlying clinical data remains keyed by canonical child ID and stable record IDs.

Phase 2 must coordinate MotherDashboard/ChildOverview fixture replacement and route-alias resolution with the Mother developer, fill missing canonical profile information explicitly, preserve her existing layout, and use read selectors rather than importing Doctor forms. Existing names and clinical text must remain unaltered on language changes. Optional extra doctor patient choices (including Lina) require graceful unknown-age/date displays before exposing them in the Add Existing Patient UI. No Mother integration is implemented now.

## Limitations and backend work

Only fictional demo data belongs in browser storage. localStorage is neither secure medical storage nor cross-user/device/browser synchronization. Frontend hooks and relationship checks are not authorization: callers can tamper with the browser. A backend must authenticate users, authorize each doctor/child and mother/child relationship, enforce read-only mother endpoints, derive audit actors/timestamps from the session, validate writes, preserve immutable void history, handle concurrency/idempotency and persist records with database foreign keys. Real shared identity must come from that backend, not demo route aliases.

Run `node src/services/medicalRecordRepository.check.mjs`, existing doctor checks, `npm run lint` and `npm run build`. Automated tests use isolated fictional storage; they never clear or change actual browser localStorage. Manual verification: save a visit and prescription, refresh, reselect the child, verify history; edit a note, add/edit/void an assessment, set/reschedule/cancel a clinical follow-up, navigate between children, switch language and open Calendar. No live browser interactions are claimed by the Node tests.
