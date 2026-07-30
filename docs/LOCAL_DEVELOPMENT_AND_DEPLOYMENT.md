# Local development, testing, and deployment

## One-time maintainer checklist

These control-plane steps require a human project owner:

1. Install and start Docker Desktop. Allocate enough memory for the local
   Supabase stack.
2. Use Node 22:

   ```bash
   nvm install
   nvm use
   npm ci
   ```

3. Authenticate and link the Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref samjothygejcrgxizdra
   ```

4. Confirm the production database major version with `show server_version;`.
   If it differs from `major_version = 17` in `supabase/config.toml`, update the
   committed local setting before relying on migration replay.
5. Rotate and verify Gemini using
   [`SECRETS_AND_E2E.md`](SECRETS_AND_E2E.md).
6. Connect the GitHub repository to Vercel, set Node.js 22, and configure only
   these browser-safe variables for Preview and Production:

   ```dotenv
   VITE_SUPABASE_URL=https://samjothygejcrgxizdra.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

7. Create protected GitHub environments named `preview` and `production`.
   Configure:

   - Repository/environment variable `VERCEL_ORG_ID`
   - Repository/environment variable `VERCEL_PROJECT_ID`
   - Environment secret `VERCEL_TOKEN`
   - Preview secrets `E2E_EMAIL` and `E2E_PASSWORD` for a dedicated test user

Protect the `production` environment with required reviewer approval. Never add
the Gemini key, Supabase service-role key, database password, or E2E password to
a `VITE_*` variable.

## Run the frontend against hosted Supabase

This is the shortest path when you only need the UI:

```bash
nvm use
npm ci
cp .env.example .env.local
```

Fill in the hosted project's public URL and publishable key, then:

```bash
npm run dev
```

Open <http://127.0.0.1:8080>.

## Run the entire product locally

The local backend is a real Supabase stack—Postgres, Auth, PostgREST, Storage,
Studio, and the local email viewer—rather than a database mock. It is intended
only for localhost development and testing.

First configure the server-only Gemini key:

```bash
cp supabase/.env.example supabase/.env.local
```

Replace the placeholder in `supabase/.env.local`, then start and initialize:

```bash
npm run supabase:start
npm run db:reset
npm run env:local
npm run e2e:user:local
npm run dev:local
```

Open:

- App: <http://127.0.0.1:8080>
- Supabase Studio: <http://127.0.0.1:54323>
- Local email viewer: <http://127.0.0.1:54324>

`env:local` creates a private `.env.local` from the running local stack.
`e2e:user:local` creates or refreshes a localhost-only user and writes private
credentials to `.env.e2e.local`. Both files are ignored by Git.

If you do not need local AI functions, run `npm run dev` after `env:local`
instead of `dev:local`. Stop the stack without deleting its data:

```bash
npm run supabase:stop
```

## Test commands

### Fast gate

```bash
npm run check
npm audit
```

This runs lint, application and Playwright type-checking, unit tests,
infrastructure invariant checks, and the production build.

### Public browser product tests

Install Chromium once:

```bash
npx playwright install chromium
```

Then run:

```bash
npm run test:e2e:public
```

This suite starts Vite automatically and does not require a real backend.

### Disposable database and RLS tests

With Docker running:

```bash
npm run supabase:start:test
npm run db:reset
npm run db:test
npm run db:lint
```

`db:reset` destroys only the local test database, replays every committed
migration, and applies `supabase/seed.sql`. `db:test` runs the pgTAP schema and
cross-user RLS suite transactionally. Never add `--linked` when working with the
production project.

### Authenticated local product tests

After `supabase:start`, `env:local`, and `e2e:user:local`:

```bash
npm run test:e2e:local
```

That performs real local Auth and course CRUD. For the complete local Gemini
journey, keep `npm run supabase:functions` running in another terminal and run:

```bash
npm run test:e2e:local:full
```

### Deployed product tests

Use the **Live product verification** GitHub workflow, or run:

```bash
E2E_BASE_URL=https://your-preview.vercel.app \
E2E_EMAIL=studyup-e2e@example.com \
E2E_PASSWORD="$STUDYUP_E2E_PASSWORD" \
npm run test:e2e:live -- --project=chromium
```

## Deploy Supabase changes

Review before changing a hosted database:

```bash
npm run supabase:deploy:check
```

After review:

```bash
npm run supabase:deploy
```

The second command applies pending migrations and deploys both authenticated Edge
Functions. Gemini secrets are managed separately because secret rotation should
never be implicit in an application deployment.

## Deploy Vercel

The recommended default is Vercel's Git integration: pull requests receive
preview deployments and merging the protected production branch creates a
production deployment.

For a reproducible manual deployment, run the **Deploy Vercel** GitHub workflow.
It:

1. Runs every repository quality gate.
2. Pulls the selected Vercel environment configuration.
3. Builds a prebuilt artifact.
4. Deploys exactly that artifact to Preview or Production.

Production uses the protected GitHub environment approval. Reports and backend
source are excluded from frontend uploads through `.vercelignore`.

Local CLI equivalents are:

```bash
npm run vercel:link
npm run vercel:pull
npm run vercel:build
npm run deploy:preview
```

Production is always explicit:

```bash
npm run deploy:production
```

## Hosted testing database option

For pull-request environments, enable Supabase Branching through the Supabase
GitHub integration with working directory `.` and automatic branching. Each
preview branch is isolated and receives migrations, functions, Auth, Storage,
and the non-sensitive `supabase/seed.sql`; production data is not copied.

Use hosted preview branches when a PR needs a shareable full-stack environment.
Use the local disposable stack for fast CI migration/RLS tests. Keep both:
preview branches test cloud configuration, while local replay catches migration
and RLS regressions without persistent infrastructure cost.

Official references:

- <https://supabase.com/docs/guides/local-development/cli-workflows>
- <https://supabase.com/docs/guides/database/testing>
- <https://supabase.com/docs/guides/deployment/branching/github-integration>
- <https://vercel.com/docs/cli/pull>
- <https://vercel.com/docs/deployments/overview>
