# Staging environment

StudyUp promotes code through a permanent `staging` branch before `main`.
`vicdenz/study-up` is the canonical repository.

## Environment layout

| Stage | Git branch | Vercel target | Stable URL |
| --- | --- | --- | --- |
| Staging | `staging` | Preview | `https://study-up-git-staging-david-daniliucs-projects.vercel.app` |
| Production | `main` | Production | `https://study-up-pi.vercel.app` |

The current Vercel plan provides the standard Production, Preview, and
Development targets. It does not provide a paid Custom Environment. Staging
therefore follows Vercel's supported branch-based staging model: a permanent
branch-specific Preview deployment with its own stable alias.

The desired state is declared in
`infra/environments/staging.json` and enforced by `pnpm infra:verify`.

## Promotion flow

1. Open feature pull requests against `staging`.
2. Require the independent static, unit, Edge Function, browser E2E,
   performance, database, and authenticated integration jobs.
3. Test the stable staging URL.
4. Open a pull request from `staging` to `main`.
5. Merge only after staging verification is green.

The GitHub `staging` environment accepts deployments only from the `staging`
branch. The branch allows ordinary direct pushes, pulls, rebases, and merges;
it rejects force pushes and deletion. The seven quality checks run on staging
for feedback but are required for `main`, not for direct staging work.

The `main` branch owns the seven required checks and strict up-to-date rule.
It does not require an approval, which keeps the workflow practical for a
single maintainer.

## Supabase staging backend

Staging currently uses the main Supabase project. RLS and dedicated test users
provide user isolation, but staging is not infrastructure-isolated from
production. Do not run destructive tests or copy production user data into test
fixtures. The CI integration suite uses a disposable local Supabase stack.

`infra/environments/staging.json` records the future isolated-branch topology,
but it is not active while Supabase branching is unavailable on the current
plan. Do not treat that declaration as a deployed database.

## AI CORS policy

Supabase Edge Functions keep exact production and staging origins in
`ALLOWED_ORIGINS`. Vercel's immutable and branch Preview hostnames are covered
by this project-scoped pattern:

```dotenv
ALLOWED_ORIGIN_PATTERNS=https://study-*-david-daniliucs-projects.vercel.app
```

The pattern is HTTPS-only and tied to the Vercel team hostname. Unknown origins,
scheme changes, suffix-confusion domains, paths, and missing configuration fail
closed.

After changing either allowlist, redeploy both Edge Functions:

```bash
pnpm exec supabase functions deploy chat-with-gemini
pnpm exec supabase functions deploy generate-study-plan
```
