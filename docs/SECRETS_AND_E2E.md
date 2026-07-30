# Secrets verification and browser product testing

## What can and cannot be verified locally

The repository contains no secret values, which is the correct state. Secret
metadata and live Gemini behavior can only be verified after authenticating the
Supabase CLI and providing a dedicated test account. A successful frontend build
does not prove that `GEMINI_API_KEY` is present or that the configured model is
available.

The Supabase project reference in `supabase/config.toml` is
`hzkwaecgggkjikwlvghi`. Never commit access tokens, Gemini keys, test-user
credentials, or a service-role key.

For local development, copy `supabase/.env.example` to
`supabase/.env.local`. That ignored file is read only by locally served Edge
Functions. The browser continues to receive only the local public key generated
by `pnpm env:local`.

## Rotate and verify Gemini

Authenticate and inspect secret metadata. `supabase secrets list` shows names and
digests, not the secret values:

```bash
supabase login
supabase secrets list --project-ref hzkwaecgggkjikwlvghi
```

Rotate the key without writing it to a repository file or shell history. This
command expects zsh and the repository's already-linked Supabase project:

```zsh
read -s "k?Gemini API key: "; echo; pnpm exec supabase secrets set "GEMINI_API_KEY=$k"; unset k
```

Paste the command as one complete line. A terminal may visually wrap it, but an
actual newline before `GEMINI_API_KEY` causes Supabase CLI to receive no secret
argument. An HTML `502 Bad Gateway` response is a transient Supabase control
plane failure; wait briefly and retry the same command. Configure the
non-sensitive model separately with
`pnpm exec supabase secrets set GEMINI_MODEL=gemini-3.6-flash`.

Set the exact Vercel preview and production origins, plus local development:

```bash
supabase secrets set --project-ref hzkwaecgggkjikwlvghi \
  ALLOWED_ORIGINS=https://preview.example.com,https://studyup.example.com,http://localhost:8080
```

Deploy the audited function code and inspect logs:

```bash
supabase functions deploy chat-with-gemini --project-ref hzkwaecgggkjikwlvghi
supabase functions deploy generate-study-plan --project-ref hzkwaecgggkjikwlvghi
supabase functions list --project-ref hzkwaecgggkjikwlvghi
```

The definitive Gemini check is the live Playwright test below. It signs in,
invokes `chat-with-gemini` through the real UI, and requires an exact model
response. That validates the frontend configuration, Supabase Auth, Edge
Function deployment, origin allowlist, `GEMINI_API_KEY`, configured model, and
Gemini network path together.

## Playwright suites

Install the three browser engines once:

```bash
pnpm exec playwright install chromium firefox webkit
```

The public suite starts the local Vite server with inert browser-safe Supabase
configuration. It covers landing/auth navigation, protected deep-link redirects,
desktop Chromium/Firefox/WebKit, Pixel and iPhone profiles, serious
accessibility violations, offline recovery, visual regression, and horizontal
overflow:

```bash
pnpm test:e2e:public
```

The live suite must target a deployed preview and a dedicated, low-privilege test
user. It creates and removes one uniquely named course and makes a real Gemini
request. Load `STUDYUP_E2E_PASSWORD` from your secret manager first:

```bash
E2E_BASE_URL=https://your-preview.vercel.app \
E2E_EMAIL=studyup-e2e@example.com \
E2E_PASSWORD="$STUDYUP_E2E_PASSWORD" \
E2E_SECONDARY_EMAIL=studyup-e2e-two@example.com \
E2E_SECONDARY_PASSWORD="$STUDYUP_E2E_SECONDARY_PASSWORD" \
VERCEL_AUTOMATION_BYPASS_SECRET="$STUDYUP_VERCEL_BYPASS_SECRET" \
pnpm test:e2e:live --project=chromium
```

Both accounts are required by the live configuration validator; the isolation
journey cannot silently skip in the protected workflow.
The Vercel bypass secret is required only when Deployment Protection is enabled.
Keep it in the protected `preview` GitHub environment; Playwright sends it as an
HTTP header and never places it in the deployment URL.

The database enforces independent hourly and daily limits for chat and study
plan generation. A `429` from either function therefore means the current usage
window is exhausted; wait until the reported reset time instead of rotating the
Gemini secret.

Do not use a maintainer's personal account. If the live course test fails before
cleanup, remove the uniquely prefixed `E2E Course ...` record from the test
account before rerunning.

GitHub Actions runs static, unit, Deno, database, bundle/performance, five-profile
public-browser, and disposable authenticated product-integration gates for
branch pushes and pull requests. The manually triggered
**Live product verification**
workflow accepts a deployment URL and reads both test accounts from the
protected `preview` GitHub environment. It makes the real Gemini call. Run it
after Supabase or Vercel preview deployment. Do not expose those secrets to
untrusted pull-request workflows.
