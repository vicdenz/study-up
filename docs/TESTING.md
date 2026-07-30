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
| Public product | `pnpm test:suite public` | Chromium | Desktop and mobile Playwright tests without a backend |
| Database | `pnpm test:suite database` | Docker | Migration replay, pgTAP schema/RLS tests, and schema lint |
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
pnpm audit --audit-level=high
```

Public browser tests:

```bash
pnpm test:e2e:public
pnpm test:e2e:public:ci
pnpm test:e2e:public:ci --workers=1
```

The CI variant always executes both desktop Chromium and mobile Chromium. Tests
fail on uncaught page errors, browser console errors, and HTTP 5xx responses.
Playwright captures traces, screenshots, videos, an HTML report, and JUnit XML.

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
pnpm test:suite live
```

The runner exits before Playwright starts if any required setting is missing or
invalid. Live CRUD uses a unique course name and attempts cleanup even when an
assertion fails. To enable the optional cross-user isolation journey, also set
`E2E_SECONDARY_EMAIL` and `E2E_SECONDARY_PASSWORD` for a second dedicated
low-privilege account.

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
