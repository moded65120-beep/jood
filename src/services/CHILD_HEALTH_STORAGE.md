# Child health demo persistence

These repositories use localStorage only. Role props and demo identities are UI
conventions, not secure authorization. A backend can replace these repository APIs
without moving schedule/skill definitions out of Haneen's components.

- `vaccinationRepository.read(childId)` returns active vaccination records.
- `importRecords(childId, records)` preserves existing parent records, including
  duplicate/conflicting historical rows, and is idempotent for repeated snapshots.
- `saveVisit(childId, record, { expectedRecords, sourceRecords })` stores one
  complete visit update: administration, appointment, history and/or doctor notes.
  `expectedRecords` contains the group's records when the editor opened. Stale,
  completed and conflicting groups cannot be overwritten. Vaccination appointments
  never write to the medical follow-up repository or booking/calendar storage.
- `milestonesRepository.read(childId, motherId)` returns responses by skill ID.
- `saveResponse(childId, motherId, skillId, { answer?, note? })` patches only the
  supplied fields. Answers are `yes`, `notYet`, `unsure` or `null` (clear).
- Both repositories expose `subscribe(listener)` for same-document changes,
  browser storage events, and focus/pageshow reconciliation. Reads return copies.

All IDs resolve through `demoChildAccess.js`; unknown child IDs are rejected. No
birth dates are invented. Milestones default to the existing demo mother ID; a
parent may explicitly pass `motherId`, and Doctor reads use that same identity.

The separate namespaces are `nomu.demo.vaccinations.v1.*` and
`nomu.demo.milestones.v1.*`. Writes append unique entries rather than rewriting a
shared array. Concurrent vaccination edits of the same baseline retain both
versions for the existing conflict UI. Milestone field patches use logical order
with an entry-ID tie-breaker; different skills, mothers and fields remain separate.
Concurrent edits to the same milestone field resolve deterministically.

The component storage hooks expose errors and milestone `saving`/`saved`/`failed`
status. Autosave happens on each answer/note change. Failed milestone drafts stay
visible with Retry; failures are never reported as saved. Corrupt data is left
intact and blocks further writes to its bucket. Browser quota/storage errors are
surfaced. This append-only demo log grows with edits; no destructive compaction or
automatic migration of unrelated existing storage is performed.

The Mother child Vaccinations and Milestones sections now render the components
through MotherChildHealth, using the Mother medical read model for canonical
profiles and real DOBs. DoctorChildHealth now embeds editable Vaccinations and
read-only Milestones in the existing patient record sections. Doctor milestone
reads use the existing child-to-mother mapping; unmapped children show an empty
read-only view, without assigning a fabricated mother identity. Existing optional vaccination callbacks remain supported;
the shared repository also saves notes-only updates, which those callbacks missed.
