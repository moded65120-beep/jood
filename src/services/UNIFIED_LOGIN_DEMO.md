# Unified login demo

## Home presentation compatibility

Authenticated account metadata selects the home presentation: Sara's provisioned Mother account has `accountSource: 'provisioned-demo'` and `homePresentation: 'legacy-mother'`; accounts read from the registration store have `accountSource: 'registration'` and `homePresentation: 'parent'`. The provisioned Father keeps the new Parent home. The protected legacy Mother session also uses Sara's original home. Metadata is derived by the authentication service, so existing stored registrations and sessions need no migration. Role prefixes do not select a home design.

`LegacyMotherHome.jsx` recovers the latest pre-redesign home from commit `26525e2` (welcome, interactive child cards and Parenting Tips), with the separate appointment section recovered from `405b129` using current `getScheduledFollowUps` records and working existing navigation links. `ParentHome.jsx` preserves the new table design for registered parents. Both render inside the unchanged shared layout and access guard; no child relationships or clinical content are changed.

## Explicit family linking

`demoChildAccess.js` owns the development-only `demoFamilies` mapping. Exact identities `3000000001 / mother`, `4000000001 / father`, and legacy `1234567890 / mother` share `demo-mother-sara`, linked only to `demo-child-3` (alias `adam`, canonical name Adam Ahmad) and `demo-child-lina` (alias `lina`). Login and Parent Home resolve the family through this mapping, never through ID prefixes or a caller-supplied family claim. Registered accounts are resolved the same way: absent an explicit pre-existing mapping, they have zero children. No new relationships are inferred during registration.

`demoChildIdentity()` exposes canonical profile fields, exact linked parent IDs, and the canonical medical-record ID without copying clinical records. Missing fields remain null. The Parent layout checks exact child access before mounting any nested child content; unrelated canonical IDs are denied even for the linked demo family. The home design remains visible for unlinked accounts. No storage migration, child creation, doctor assignment, or medical-content update occurs.

Legacy Parent child-detail fixtures still differ from canonical records in names, age labels, measurements, visits and clinical fixture content. This change preserves those existing views; it does not migrate or overwrite medical content. Canonical Parent Home and shared health views continue to read the existing shared records. A separately reviewed integration is needed to replace the remaining legacy detail fixtures with read-only canonical selectors.

## Parent self-registration (development only)

The existing `/mother/register` form accepts only Mother (10 digits beginning `300`) or Father (10 digits beginning `400`). Selected role and prefix must agree. All fields are required; emails are normalized for duplicate checks, passwords require eight characters, and confirmation must match. Built-in and legacy IDs are reserved. Built-in accounts currently have no email addresses, so email uniqueness applies to registered accounts.

New accounts use the dedicated localStorage key `nomu.demo.parentAccounts.v1`. Each stores its ID, role, name, email, random salt, and PBKDF2-SHA-256 password hash (100,000 iterations), never plaintext passwords. Invalid/unavailable storage prevents registration without overwriting it. Existing storage keys and medical data are untouched. Browser storage is inspectable and tamperable: this is fictional development data only, not secure production identity management. Cross-tab account creation still requires transactional backend uniqueness enforcement.

Registration returns to `/login` with a success notification. Unified login verifies the saved password and routes to `/mother`; the registered account has no family scope. The minimal Parent layout guard renders the existing no-children empty state for every nested destination and does not mount demo-family notifications or content. Existing demo family accounts retain their original pages. No children or ownership relationships are created. Real family linking, independent parent profiles, email verification, password recovery, database uniqueness, secure password storage, and server-side authorization require backend integration.

`/login` reuses Home's full-screen original video shell and unchanged reduced-motion/Pause/Play effects. The landing CTA links to it. Language changes do not key/remount the video. There is one Sign Up link, to the existing `/mother/register`. That form remains a Mother registration demonstration; Father registration and staff enrollment are not implemented. No staff self-registration is introduced.

## Explicit fictional credentials

| ID | Password | Role | Destination |
| --- | --- | --- | --- |
| 1000000001 | Demo@1234 | Doctor | /doctor |
| 2000000001 | Demo@1234 | Nurse | /doctor |
| 3000000001 | Demo@1234 | Mother | /mother |
| 4000000001 | Demo@1234 | Father | /mother |

The previous per-role unified passwords (`NomuDoctor123!`, `NomuNurse123!`, `NomuMother123!`, and `NomuFather123!`, respectively) remain accepted for compatibility. The shared demo password is accepted only for the four exact IDs above; no child mappings, medical data, or storage keys were changed.

These are intentionally public fictional demo credentials, not real accounts. Passwords are compared using SHA-256 digests, never persisted in localStorage or sessionStorage. Only an allowlisted account ID is stored under `nomu.demo.unifiedAuth.v1` in sessionStorage. Credential verification precedes role/prefix verification. Prefixes never authenticate arbitrary IDs. Frontend code/hashes/session flags are inspectable and tamperable, so this is navigation demonstration only, NOT secure authentication. Backend identity verification and authorization remain essential. Web Crypto requires a secure browser context (localhost or HTTPS); without it login fails closed.

The legacy exact accounts remain available through the unchanged `/doctor/login` and `/mother/login` forms: `9876543210 / Doctor123!` and `1234567890 / Demo123!`. Their IDs do not match the new prefixes, so they are not accepted by unified login. New unified sessions supersede/clear old navigation flags. Logout clears unified and legacy authentication keys only, never medical or booking data. Failed unified attempts cannot fall back to old stored flags. Browser-storage failure supports the same-document demo session only; refresh will require login again.

## Least-privilege limitations

Nurses share the Doctor Dashboard shell and patient-list overview but cannot open medical record editing or Calendar management, add patients, or invoke the dashboard's clinical mutation callbacks. Full nurse read/access/clinical permissions are deliberately not invented. The UI explains the limitation. Doctor-only permissions must eventually be checked server-side on every operation, not inferred from a dashboard path.

The Father account is explicitly defined as a fictional co-parent in the existing `demo-mother-sara` household. Existing child/medical/booking repositories and IDs are unchanged. This is one shared demo family, not a generic grant to all fathers. Mother/Father role identity and account names remain distinct even though the current parent implementation uses one static family scope. Father profile/settings editing is blocked because those editors are Mother-specific. A backend and per-parent data wiring are needed for real family relationships, independent profiles, and registration. The existing parent dashboard's medical read-only behavior is unchanged.

Protected route components use the existing authentication adapters, now aware of exact unified roles; wrong-dashboard roles and unauthenticated direct visits redirect to `/login`. Old login components are not rewritten. Shared medical state and persistence are untouched. No new dashboard is introduced.

Run `node src/services/unifiedDemoAuth.check.mjs`, existing doctor checks, `npm run lint`, and `npm run build`. Tests use isolated fake storage and server-rendered markup. Live form submission, red-error visuals, keyboard/password toggle, video playback, and all four browser route journeys require manual browser verification if no browser is connected.
