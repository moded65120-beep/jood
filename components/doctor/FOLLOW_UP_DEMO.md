# Follow-up appointment demo

Fictional appointments are stored under the single browser localStorage key
`nomu.doctor.demoFollowUpAppointments.v1`.

The versioned payload contains assigned mock child IDs and appointment records:
`id`, `patientId`, `date`, `time`, `reason`, `instructions`, `status`, and optional
`visitId`. It does not persist names, medical visits, clinical notes or prescriptions.
Use fictional text only. This is temporary local demo persistence, not a medical
backend, role check, or cross-user synchronization mechanism.

The child's `followUpAppointments` array is authoritative. Overview and patient-list
`nextFollowUp` fields derive from its earliest scheduled appointment dated today or
later. Past dates alone never imply missed attendance. Only explicitly recorded
`missed` status belongs in the Missed category. Cancelled and past records remain
in the list. Editing an upcoming record keeps its ID.

Existing mock next-date fields migrate to deterministic legacy appointment IDs.
New modal appointments use child-prefixed UUIDs. Visit follow-ups reuse a scheduled
appointment for the same date or reschedule the current appointment for a latest
visit; otherwise they create a visit-linked record. Original visit history is never
rewritten. Repeating the same visit action does not duplicate its appointment.

Loading validates version, dates, times, IDs, statuses and text lengths, accepts only
registered fictional child IDs, and ignores invalid rows with a visible warning.
Blocked or full browser storage produces an in-memory-only warning. No unrelated
localStorage keys are changed. Browser/site-data clearing removes this demo data.

To reset only this feature, remove `nomu.doctor.demoFollowUpAppointments.v1` in the
browser's storage tools and refresh. To test, save a new appointment, refresh,
reopen the child, edit/reschedule the row, then cancel it and refresh again. Confirm
the next-date displays and retained history. Medical visits and prescriptions still
use the existing in-memory demo approach.
