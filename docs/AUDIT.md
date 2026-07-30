# StudyUp engineering audit

Audit date: 2026-07-29  
Audited baseline: `main` at `90ad09a`  
Remediation branch: `codex/vercel-migration-audit`

## Executive summary

The baseline was a functional hackathon prototype, but it was not production-ready. Its frontend build passed only because Vite transpiled TypeScript without type-checking. The repository had 22 known dependency vulnerabilities, 41 lint errors, 10 TypeScript errors, hard-coded Supabase configuration, no tests, a replay-breaking duplicate migration, a public materials bucket, and two critical AI endpoint authorization/input flaws.

The branch converts the app into a Vercel-ready static SPA while retaining Supabase as the backend. Critical and high-severity findings were remediated, strict checks were added, storage is private, AI calls are authenticated and bounded, and the dependency audit is clean.

## Findings and remediation

| Severity | Finding | Resolution |
| --- | --- | --- |
| Critical | `generate-study-plan` used a service-role client and accepted any assignment UUID, allowing one signed-in user to read another user's assignment and material content. | Replaced the admin client with a caller-scoped Supabase client. RLS now performs the ownership check and unauthorized IDs return 404. |
| Critical | `chat-with-gemini` fetched arbitrary URLs and buffered them without limits, enabling SSRF and memory exhaustion. | Restricted images to this project's HTTPS Supabase Storage URLs, disallowed redirects, added timeouts, limited requests to four images and 5 MB per image, and streamed with a hard byte cap. |
| High | The materials bucket was public even though the product claimed private user files. | The hardening migration makes the bucket private. The frontend now generates one-hour signed URLs after RLS-authorized reads. |
| High | Storage upload/delete policies did not consistently prove assignment ownership. | Replaced the policies with course and assignment ownership checks for insert, select, and delete. |
| High | 22 dependency advisories were present, including 14 high-severity advisories. | Updated the toolchain and runtime dependencies, replaced the vulnerable router with Wouter, and removed the obsolete Lovable tagger. `npm audit` now reports zero vulnerabilities. |
| High | A duplicate `study_sessions` migration made a clean database replay fail. | Removed the duplicate historical migration and added an idempotent forward hardening migration. |
| High | Supabase URL/key values were hard-coded in source. | Added required `VITE_SUPABASE_*` configuration, runtime validation, and a safe `.env.example`. |
| High | Upload functions exposed callback-style mutations while callers `await`ed them, so dialogs reported completion before uploads finished and errors escaped local handling. | Exposed `mutateAsync`, awaited actual storage/database completion, and kept progress and dialogs synchronized with the mutation. |
| Medium | A failed material metadata insert left an orphaned storage object; a failed storage delete removed its database record and made cleanup harder. | Added compensating cleanup after insert failure and retained metadata when storage deletion fails so deletion can be retried. |
| Medium | AI endpoints accepted unbounded prompt/context data and trusted model JSON. | Added body, message, context, image, output, session-count, duration, date, and timeout validation. |
| Medium | The configured `gemini-1.5-flash-latest` model was obsolete and the study-plan JSON option used the wrong REST casing. | Defaulted to the stable `gemini-3.6-flash`, made the model configurable, and changed the option to `responseMimeType`. |
| Medium | Note “AI summaries” only returned the first 100 characters and repeated generation inserted duplicate rows. | Connected summaries to the authenticated AI function and added a one-summary-per-note database invariant plus true upsert behavior. |
| Medium | Auth redirects happened in an effect after protected content rendered, and React Query cache data survived user changes. | Blocked protected rendering while redirecting and clear the entire query cache when the authenticated user changes. |
| Medium | Course selection was presented as optional even though `assignments.course_id` is required. | Made course selection mandatory and preselect it on course pages. |
| Medium | `datetime-local` values were displayed as UTC and persisted without an explicit offset. | Display local wall-clock time and convert it to ISO UTC at the persistence boundary. |
| Medium | Study-session creation discarded or obscured the selected time and closed before persistence completed. | Added a time field, preserved selected slot time, allowed today, and await creation before closing. |
| Medium | Direct Vercel navigation to routes such as `/courses/:id` would 404. | Added the documented Vite SPA rewrite in `vercel.json`. |
| Medium | The initial JavaScript bundle was about 1.3 MB minified. | Lazy-loaded every route. The entry chunk is now about 36 KB minified; large feature libraries load only on the pages that use them. |
| Medium | Type safety was disabled and CI-equivalent commands did not type-check or test. | Enabled strict TypeScript, unused-code and fallthrough checks; removed explicit `any`; added Vitest and a single `npm run check` gate. |
| Low | Dead prototype pages/components and obsolete Lovable metadata remained. | Removed unreachable code and replaced generated social/author metadata. |
| Low | Material action controls had broken `asChild` semantics and weak accessible names. | Restored actual buttons, added labels and disabled states, and opened new tabs with `noopener,noreferrer`. |

## Database and security notes

- The browser publishable key is not a secret. RLS is the security boundary. Service-role/secret keys must never be placed in Vercel or Vite browser variables.
- The new migration also adds ownership-aware note, study-session, and AI-chat policies; private storage limits uploads to 20 MB; and adds foreign-key access indexes.
- Supabase documents that user-invoked Edge Functions send the session JWT and should execute database work through a user-scoped client: <https://supabase.com/docs/guides/functions/auth>.
- Google lists stable model names and recommends a specific stable model for production rather than a hot-swapped `latest` alias: <https://ai.google.dev/gemini-api/docs/models>.

## Validation evidence

Run:

```bash
npm ci
npm run check
npm audit
```

Expected results:

- ESLint: zero errors and warnings
- TypeScript: zero errors with strict mode
- Vitest: 5 tests passing
- Vite production build: success
- npm audit: zero known vulnerabilities

## Residual risks and follow-up

These do not block the frontend migration, but should be completed before a large public launch:

1. Add per-user AI quotas/rate limits and budget alerts. Authentication prevents anonymous abuse but does not cap a signed-in user's Gemini spend.
2. Add integration tests against a disposable local Supabase stack for RLS, migrations, Storage, Auth redirects, and Edge Functions. Unit/static/build checks cannot prove deployed project configuration.
3. Add browser E2E tests for sign-up, course/assignment CRUD, uploads, note autosave, planner interactions, and AI error states.
4. Add production monitoring for frontend exceptions, Edge Function latency/errors, database health, storage growth, and Gemini spend.
5. Make activity creation transactional with the corresponding CRUD mutation if activity completeness becomes a product requirement.
6. Complete keyboard/touch interaction work for the drag-based weekly calendar and run a formal WCAG 2.2 AA audit.
7. Add an explicit license and privacy/data-retention policy before external distribution.
