# Testing and CI command reference

All commands run from the repository root with Node 22 and the pnpm version
pinned in `package.json`.

## One-time setup

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

The equivalent bootstrap command is:

```bash
pnpm test:suite bootstrap
```

## Test suite matrix

| Suite | Command | External requirements | Purpose |
| --- | --- | --- | --- |
| Quick gate | `pnpm test:suite quick` | None | Lint, types, unit tests, infra checks, build, and audit |
| Unit + coverage | `pnpm test:suite unit` | None | Vitest with per-file 100% thresholds for covered pure utilities |
| Edge Functions | `pnpm test:suite functions` | Deno 2 | Request parsing, CORS, safe errors, and quota enforcement |
| Public product | `pnpm test:suite public` | Playwright browsers | Chromium, Firefox, WebKit, Pixel, and iPhone profiles without a backend |
| Performance | `pnpm test:e2e:performance` | Chromium | Production bundle, navigation/paint budgets, and bounded concurrent load |
| Database | `pnpm test:suite database` | Docker | Migration replay, pgTAP schema/RLS tests, and schema lint |
| Product integration | `pnpm test:suite integration` | Docker and Chromium | Disposable Auth, two-user isolation, Storage bytes, email, and Gemini UI contract |
| Local CRUD | `pnpm test:suite local` | Local Supabase and `.env.e2e.local` | Authenticated course CRUD |
| Local full | `pnpm test:suite local-full` | Local Supabase, E2E credentials, Gemini secret, served functions | CRUD and Gemini |
| Deployed product | `pnpm test:suite live` | Preview URL and dedicated account | Deployed Auth, CRUD, and Gemini |
| CI without database | `pnpm test:suite ci` | Chromium | Static, coverage, and public browser gates |
| Everything | `pnpm test:suite all` | Chromium and Docker | Quick, coverage, browser, and database gates |

Run the shell entry point directly when pnpm script aliases are unavailable:

```bash
bash scripts/test-suite.sh quick
bash scripts/test-suite.sh public --workers=1
bash scripts/test-suite.sh database
```

The database runner detects whether Supabase was already running. It stops the
stack on exit only when it started that stack itself, including on interruption
or test failure.

## Focused commands

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:unit:coverage
pnpm test:unit:watch
pnpm test:functions
pnpm infra:verify
pnpm build
pnpm performance:bundle
pnpm audit --audit-level=high
```

Public browser tests:

```bash
pnpm test:e2e:public
pnpm test:e2e:public:ci
pnpm test:e2e:public:ci --workers=1
```

The CI variant executes desktop Chromium, Firefox, and WebKit plus emulated
Pixel and iPhone profiles. Tests fail on uncaught page errors, browser console
errors, HTTP 5xx responses, accessibility regressions, responsive overflow,
offline-state regressions, and the reviewed Chromium visual baseline. The public
suite also includes a 320px-wide narrow-phone check for landing-page and sign-up
actions, creator links, and horizontal overflow.
Playwright captures traces, screenshots, videos, an HTML report, and JUnit XML.

Production performance and static-load budgets:

```bash
pnpm test:e2e:performance
```

This builds and serves the production artifact, enforces bundle-size ceilings,
checks navigation/paint timing, and sends 200 requests at concurrency 10 with a
500 ms local p95 ceiling. It is a regression gate for this static frontend, not
a substitute for capacity testing Supabase or Gemini. The production stylesheet
has a 125 KB uncompressed ceiling; the responsive application shell is included
in that budget.

Database tests:

```bash
pnpm supabase:start:test
pnpm db:reset
pnpm db:test
pnpm db:lint
pnpm supabase:stop --no-backup
```

Prefer `pnpm test:suite database` because it provides reliable cleanup. Database
commands target the local stack only. Never add `--linked`.

Authenticated integration tests:

```bash
pnpm test:suite integration --workers=1
```

The runner owns and cleans up a full local Supabase stack when necessary. It
creates two confirmed localhost-only users and verifies Auth persistence,
course/assignment/note CRUD, tenant isolation, private file upload and exact
downloaded bytes, confirmation-email contents, planner keyboard behavior, and
the browser-to-Edge-Function Gemini response contract. The deterministic
contract response avoids external Gemini charges; the live suite below remains
the provider canary.

## Local authenticated product tests

Prepare the local stack once:

```bash
pnpm supabase:start
pnpm db:reset
pnpm env:local
pnpm e2e:user:local
```

Then run:

```bash
pnpm test:suite local
```

For the Gemini journey, configure `supabase/.env.local`, keep the functions
runtime open in another terminal, and run:

```bash
pnpm supabase:functions
pnpm test:suite local-full
```

## Deployed product verification

Use a dedicated, low-privilege test user:

```bash
E2E_BASE_URL=https://your-preview.vercel.app \
E2E_EMAIL=studyup-e2e@example.com \
E2E_PASSWORD="$STUDYUP_E2E_PASSWORD" \
E2E_SECONDARY_EMAIL=studyup-e2e-two@example.com \
E2E_SECONDARY_PASSWORD="$STUDYUP_E2E_SECONDARY_PASSWORD" \
VERCEL_AUTOMATION_BYPASS_SECRET="$STUDYUP_VERCEL_BYPASS_SECRET" \
pnpm test:suite live
```

The runner exits before Playwright starts if any required setting is missing or
invalid. Both low-privilege accounts are mandatory so cross-user isolation
cannot silently skip. Live CRUD uses unique names and attempts cleanup even
when an assertion fails.
For protected Vercel previews, store the automation bypass secret in the
protected CI environment. Playwright supplies it as a request header rather than
putting it in logs or URLs.

Playwright mobile profiles reproduce browser engines, viewport, input, and user
agent behavior but are not physical devices. A true-device run requires an
external device-cloud account (for example BrowserStack or Sauce Labs) and must
be treated as a separate protected workflow so its credentials are never
available to untrusted pull requests.

## CI entry points and artifacts

Future CI providers can call these independent commands:

```bash
CI=true pnpm test:ci:static
CI=true pnpm test:ci:unit
CI=true pnpm test:ci:functions
CI=true pnpm test:ci:e2e
pnpm test:suite database
```

Generated reports are ignored by Git and written below `artifacts/`:

- `artifacts/coverage/`: HTML, LCOV, and JSON coverage
- `artifacts/vitest/junit.xml`: unit-test JUnit report
- `artifacts/playwright/junit.xml`: browser-test JUnit report
- `artifacts/playwright/report/`: Playwright HTML report
- `artifacts/playwright/test-results/`: traces, screenshots, and videos

GitHub Actions uploads these directories even when tests fail, unless the
workflow was cancelled.
