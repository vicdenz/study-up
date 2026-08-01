# Security operations

## Trust boundaries

The Vercel deployment is a public static browser application. Only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong there; every
`VITE_*` value is embedded in downloadable JavaScript. Supabase row-level
security, private Storage policies, and caller-scoped Edge Function clients are
the authorization boundary.

Keep these values server-side and out of Git, Vercel browser variables, logs,
URLs, and test artifacts:

- `GEMINI_API_KEY`
- Supabase secret/service-role keys and database passwords
- `VERCEL_TOKEN` and `VERCEL_AUTOMATION_BYPASS_SECRET`
- E2E account passwords and provider access tokens

Local secrets belong only in ignored `.env.local`, `.env.e2e.local`, and
`supabase/.env.local` files. Commit placeholder values only to the corresponding
`.env.example` files.

## Supabase Edge Function secrets

Rotate Gemini without putting the value in a file or shell history. Run this as
one complete zsh line from the linked repository:

```zsh
read -s "k?Gemini API key: "; echo; pnpm exec supabase secrets set "GEMINI_API_KEY=$k"; unset k
```

An actual newline before `GEMINI_API_KEY` splits the command and sends no
argument. If Supabase returns an HTML `502 Bad Gateway`, do not change or expose
the key; wait briefly and retry the same command.

Configure the model and exact browser origins separately:

```bash
pnpm exec supabase secrets set GEMINI_MODEL=gemini-3.6-flash
pnpm exec supabase secrets set ALLOWED_ORIGINS=https://study-up-pi.vercel.app,https://study-up-git-staging-david-daniliucs-projects.vercel.app,http://127.0.0.1:8080
pnpm exec supabase secrets set 'ALLOWED_ORIGIN_PATTERNS=https://study-*-david-daniliucs-projects.vercel.app'
pnpm exec supabase functions deploy chat-with-gemini
pnpm exec supabase functions deploy generate-study-plan
```

`supabase secrets list` exposes names and digests, not values. Verify a rotation
with the protected **Live product verification** workflow; a successful build
does not prove the provider key works.

## CI and deployment credentials

GitHub environments hold deployment and live-test secrets. Production deployment
credentials belong in the protected `production` environment; preview test
credentials belong in `preview`. Use dedicated low-privilege test accounts with
no production user data.

The live workflow refuses to send credentials to arbitrary URLs. Built-in
StudyUp Vercel hosts are allowed; add a custom production origin through the
`E2E_ALLOWED_ORIGINS` environment variable as a comma-separated list of exact
origins. Never use a wildcard for this setting.

GitHub secret scanning, push protection, Dependabot security updates, SHA-pinned
actions, read-only workflow permissions, and non-persisted checkout credentials
are enabled. Treat every leak as compromised: revoke or rotate the credential
first, then remove it from history and investigate usage.

## Operational checks

Before promotion:

```bash
pnpm infra:verify
pnpm audit --audit-level=high
pnpm test:suite unit
pnpm test:suite functions
pnpm test:suite database
```

Periodically review Supabase Auth redirects, RLS/storage tests, Edge Function
origin allowlists, GitHub environment access, unused tokens, Gemini quota and
billing alerts, and Vercel environment variables.
