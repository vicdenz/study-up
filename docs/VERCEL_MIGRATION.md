# Vercel migration plan

## Target architecture

```text
Browser
  -> Vercel CDN (React/Vite static SPA)
  -> Supabase Auth + PostgREST + private Storage
  -> Supabase Edge Functions
  -> Gemini API
```

Only the static frontend moves from Lovable to Vercel. Supabase remains the database, authentication provider, file store, and server-side AI runtime. This minimizes migration risk and prevents Gemini or database secret keys from entering the browser bundle.

## Phase 0: ownership and backups

Owner: project maintainer  
Rollback point: current Lovable deployment

1. Confirm administrative access to GitHub, Vercel, Supabase, DNS, and Gemini billing.
2. Export a Supabase database backup and record the current Auth URL configuration, Storage policies, Edge Function secrets, and deployed function versions.
3. Keep the existing Lovable deployment and DNS record live until the production verification window is complete.
4. Decide the production hostname, for example `studyup.example.com`, before configuring allowlists.

Exit criteria: backups are restorable and every control plane has a named owner.

## Phase 1: prepare Supabase

Owner: backend maintainer

1. Install and authenticate the Supabase CLI.
2. Link the intended project:

   ```bash
   supabase link --project-ref <project-ref>
   ```

3. Review the pending SQL, then apply it:

   ```bash
   supabase db diff --linked
   supabase db push --dry-run
   supabase db push
   ```

4. Set server-only secrets:

   ```bash
   supabase secrets set GEMINI_API_KEY=<key>
   supabase secrets set GEMINI_MODEL=gemini-3.6-flash
   supabase secrets set ALLOWED_ORIGINS=https://<production-host>,http://localhost:8080
   ```

5. Deploy both functions:

   ```bash
   supabase functions deploy chat-with-gemini
   supabase functions deploy generate-study-plan
   ```

6. In Supabase Auth URL Configuration, set the future production URL as the Site URL and add the Vercel preview/production callback URLs needed for email confirmation.
7. Verify that an existing user can still list and open their own materials through signed URLs and cannot access another test user's records.

The bucket changes from public to private. Existing stored object paths remain valid, but old public URLs stop working; the updated frontend replaces them with signed URLs.

Exit criteria: migrations and functions are deployed, cross-user negative tests pass, and the old frontend's core non-file flows still work.

## Phase 2: create the Vercel preview

Owner: frontend/deployment maintainer

1. Import the GitHub repository into Vercel.
2. Use repository root `.` and framework preset `Vite`.
3. Select Node.js 22 in Project Settings.
4. Keep the repository commands:

   - Install: `npm ci`
   - Build: `npm run build`
   - Output: `dist`

5. Add these Vercel environment variables to Preview and Production:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

6. Do not add `GEMINI_API_KEY`, a Supabase secret key, or a service-role key to Vercel. They belong only in Supabase Edge Function secrets.
7. Deploy a preview. Vercel's Vite guidance requires a rewrite for SPA deep links; this is already encoded in `vercel.json`: <https://vercel.com/docs/frameworks/frontend/vite>.
8. Add the preview's stable branch alias to the Supabase `ALLOWED_ORIGINS` secret and redeploy both Edge Functions before testing AI calls.

Exit criteria: preview build succeeds and its deployment contains only the two expected public configuration variables.

The repository now also includes a protected manual deployment workflow that
pulls Vercel configuration, runs the complete quality gate, builds a prebuilt
artifact, and deploys that exact artifact. Configure `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` as described in
[`LOCAL_DEVELOPMENT_AND_DEPLOYMENT.md`](LOCAL_DEVELOPMENT_AND_DEPLOYMENT.md).

## Phase 3: preview verification

Owner: QA/product

Use two isolated test users.

1. Open `/`, `/auth`, `/dashboard`, and a copied deep link such as `/courses/<id>` directly.
2. Test sign-up confirmation, sign-in, refresh, sign-out, and switching between the two users in one browser.
3. Create, edit, complete, and delete a course assignment.
4. Create and autosave a note; generate its AI summary twice and confirm only one current summary appears.
5. Upload a text file, PDF, and image; view and delete each; reject an empty and over-20-MB file.
6. Confirm that one user cannot query or generate a signed URL for the other user's material.
7. Create a study session from a dragged time slot and verify the local time after refresh.
8. Generate and add a study plan; verify every session is before the assignment due date.
9. Exercise AI chat with text and a stored image. Confirm arbitrary external image URLs are rejected.
10. Check responsive layouts, keyboard focus, browser console errors, Supabase logs, and Gemini usage.

Exit criteria: no severity-1/2 defects, no cross-user access, and all critical journeys pass in supported browsers.

The automated baseline is documented in
[`SECRETS_AND_E2E.md`](SECRETS_AND_E2E.md). Run the public suite in pull requests
and the credential-gated live suite against the preview after Supabase functions
and secrets are deployed.

## Phase 4: production and DNS cutover

Owner: deployment maintainer  
Recommended window: low traffic

1. Promote the verified commit to a Vercel production deployment.
2. Add the production custom domain in Vercel and complete its DNS verification.
3. Update `ALLOWED_ORIGINS` in Supabase to include the final HTTPS origin and redeploy both Edge Functions.
4. Confirm Supabase Auth Site URL and redirect allowlist use the final domain.
5. Lower DNS TTL in advance if replacing an existing hostname, then update the DNS record.
6. Run the critical smoke suite again against the custom domain.
7. Monitor Vercel, Supabase, and Gemini errors/usage closely for at least 24 hours.

Exit criteria: custom-domain smoke tests pass, error rates are stable, and the old deployment receives no required traffic.

## Rollback

Frontend rollback is independent of the database:

1. Reassign the custom domain to the last known-good Vercel deployment, or restore the prior DNS target.
2. Keep the additive hardening migration in place; do not make Storage public or restore the ownership bypass.
3. If an Edge Function regression is isolated, redeploy its prior known-good code while preserving caller-scoped authorization.
4. If private-file viewing is the only regression, fix signed URL generation; never expose the bucket as a shortcut.
5. Record the incident, affected deployment IDs, timestamps, and user impact before resuming rollout.

## Post-migration backlog

- Add GitHub branch protection requiring `npm run check`.
- Expand the Playwright and disposable Supabase baselines to cover uploads,
  assignment/note/planner flows, and Edge Function HTTP behavior.
- Enable Supabase automatic preview branches when the team needs hosted,
  per-pull-request databases in addition to the disposable local CI stack.
- Add AI quotas, spend alerts, and application monitoring.
- Add a production Open Graph image using the final canonical domain.
- Remove the Lovable deployment only after the agreed retention window.
