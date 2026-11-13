# Active doctor profile replacement

This is an active-profile replacement, not a rewrite of clinical history.

| Stable clinical/booking ID | Active profile | Unified demo login ID |
| --- | --- | --- |
| ahmad | Dr. Ahmad Khaled | 1000000002 |
| rania | Dr. Reem Al-Zahrani | 1000000003 |
| omar | Dr. Omar Haddad | 1000000004 |
| demo-doctor-sarah-ahmad | Dr. Lina Mansour | 1000000001 |
| yazan | Dr. Yazan Ibrahim | 1000000005 |
| fadi | Dr. Fadi Nasser | 1000000006 |

The legacy doctor login still resolves to the same stable Lina identity. Its credential checks and session marker are unchanged. Additional exact allowlisted demo accounts use the existing shared demo-password convention; no password storage or authentication architecture was added. These are frontend navigation permissions, not secure authentication.

Existing medical/booking storage keys, IDs, patient links, request statuses and persisted payloads are not rewritten. Stored clinical author names remain snapshots: old Sarah/Ahmad/Rania names in historical medical records and historical translation keys are intentionally retained. Future clinical entries use the new active name. Mother account Sara is unrelated and unchanged.

Yazan and Fadi have no initial patients or copied histories. Their new demo schedules are initialized through the existing doctor scheduling model; Lina continues using the existing ID-keyed calendar. Ahmad, Reem and Omar retain the original Mother booking schedules unchanged.

Images are mapped explicitly by stable ID in doctorDirectory.js. The public defaults are not modified. Current uploaded photos are resolved through doctorPhotoRepository.js and useDoctorPhoto.js. IndexedDB stores only blobs under the owning doctor's stable ID; it does not store them in localStorage or synchronize other browsers/devices. Both dashboards read the same repository on this origin. Open pages refresh photos after local saves or when regaining focus.

Only the authenticated doctor may save their own photo through the demo UI/service. Nurses and parents cannot upload. A future backend must authenticate and authorize uploads and repeat format/size validation server-side. No backend is connected.

Manual browser checks: sign into each demo account, open Profile, preview/cancel/save a valid JPG/PNG/WebP, refresh, inspect the same ID's Mother booking card, and switch language. Verify rejection of non-images, undecodable files and files over 2 MiB. Native IndexedDB, file picker and responsive rendering require browser verification.

## Files created

- src/services/doctorDirectory.js
- src/services/currentDoctorProfile.js
- src/services/doctorPhotoRepository.js
- src/services/doctorProfiles.test.js
- src/services/DOCTOR_PROFILE_MIGRATION.md
- src/hooks/useDoctorPhoto.js
- src/components/common/DoctorPortrait.jsx
- src/components/common/DoctorSelectionCard.jsx
- src/components/common/DoctorSelectionCard.css
- src/components/doctor/DoctorPhotoEditor.jsx
- src/components/doctor/DoctorPhotoEditor.css

## Files modified

- src/services/unifiedDemoAuth.js (profile/account metadata only; credential verification algorithm unchanged)
- src/services/demoChildAccess.js (explicit empty relationships for independent doctors)
- src/components/doctor/appointmentsData.js (initial schedules for the two new identities only)
- src/components/doctor/DoctorAvatar.jsx
- src/pages/doctor/DoctorDashboard.jsx
- src/pages/mother/bookingAvailabilityDemo.js
- src/pages/mother/PortalBooking.jsx
- src/pages/mother/BookAppointment.jsx
- src/pages/mother/MotherAppointments.jsx
- src/pages/mother/LegacyMotherHome.jsx
- src/pages/mother/RescheduleAppointment.jsx
- src/components/mother/ChildDemoBookings.jsx
- src/components/mother/MotherRescheduleModal.jsx
- src/locales/en/translations.js
- src/locales/ar/translations.js
- src/services/motherBookingRequests.test.js
- src/services/motherDemoBookings.test.js

## Verification

19 focused profile/photo/booking/rescheduling tests pass. Existing medical-repository, doctor-calendar/approval, unified-authentication and bilingual doctor UI checks pass. Build and lint pass. Build reports existing large-bundle warnings. Browser file-picker, native IndexedDB reload, image decoding and responsive visual checks remain manual; automated photo tests use an in-memory IndexedDB adapter.
