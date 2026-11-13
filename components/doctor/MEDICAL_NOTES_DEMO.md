# Medical notes demonstration

Visit-linked notes are derived directly from `medicalVisits`. Each visit appears
once with its diagnosis, observations and treatment recommendations. Historical
`medicalNotes` mirrors with matching visit IDs are ignored, and new visits no longer
create mirrors. Unmatched legacy notes remain visible. Filters select notes by
recorded diagnosis/observation content, or by follow-up note type; a combined visit
entry may therefore appear under both diagnosis and observation filters.

New records use `standaloneNotes`, with a unique ID, `patientId`, note type, visit
date, original clinical text, doctor, creation timestamp and optional `visitId`.
Saving a standalone note never creates or changes a medical visit. A linked
standalone note is its own record, not a copy of the visit. Existing visits remain
session-only; after refresh a retained visit ID is shown with an unavailable-details
message rather than recreating or fabricating its visit.

Fictional standalone records persist under
`nomu.doctor.demoStandaloneNotes.v1`. This versioned browser-local demo storage is
not a clinical backend or authorization mechanism. Do not enter real patient or
medical information. Invalid rows are ignored with a visible warning; blocked or
full storage reports that changes are available only in memory. Other storage keys
are untouched. Browser/site-data clearing removes these demo notes.

To test, add a medical visit with diagnosis and observations, then open Medical
Notes & Diagnosis. Confirm it appears once. Add a standalone note, try the filters
and View Details, refresh and verify the standalone record remains. Test another
child and both languages. To reset only notes, remove the named key in browser
storage tools and refresh.

Edit Note is available only for standalone records. Updates retain the same ID,
child ID, original author, creation time, visit date and visit link. Only note type
and clinical text change; the same storage key persists updates. An unchanged
visit link remains valid after refresh even if its session-only visit is no longer
available. Visit-derived and legacy entries are read-only in this interface.
