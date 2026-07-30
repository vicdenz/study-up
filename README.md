<div align="center">
  <img alt="StudyUp logo" src="studyup-logo.svg" width="100" />
  <h1>StudyUp</h1>
  <p>An AI-powered academic workspace for courses, assignments, notes, materials, planning, and tutoring.</p>
</div>

## Architecture

- React 19, TypeScript, Vite, Tailwind CSS, and shadcn/ui
- Supabase Auth, PostgreSQL with RLS, private Storage, and Edge Functions
- Gemini API calls made only from authenticated Supabase Edge Functions
- Static frontend deployment on Vercel

Vercel hosts the browser application. Supabase remains the stateful backend and AI-function runtime; no database credentials or Gemini secrets are deployed to the browser.

## Local setup

Requirements:

- Node.js 22 (`nvm use` reads the committed `.nvmrc`)
- Corepack with pnpm 11.18.0 (`corepack enable` if `pnpm` is unavailable)
- Docker Desktop for the local Supabase-compatible test stack
- A Gemini API key

Install dependencies and configure browser-safe environment variables:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

Never use a Supabase secret/service-role key in a `VITE_*` variable. Vite embeds those variables in the public browser bundle.

Apply the database migrations and configure Edge Function secrets:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set GEMINI_API_KEY=<key>
supabase secrets set GEMINI_MODEL=gemini-3.6-flash
supabase secrets set ALLOWED_ORIGINS=http://localhost:8080
supabase functions deploy chat-with-gemini
supabase functions deploy generate-study-plan
```

Start the app:

```bash
pnpm dev
```

For an entirely local backend, database tests, local Edge Functions, and a
generated test user, follow
[docs/LOCAL_DEVELOPMENT_AND_DEPLOYMENT.md](docs/LOCAL_DEVELOPMENT_AND_DEPLOYMENT.md).

## Quality gates

```bash
pnpm test:suite quick
pnpm test:suite unit
pnpm test:suite public
pnpm test:suite database
```

The quick gate runs ESLint, strict TypeScript, unit tests, infrastructure
verification, a production build, and an audit. The browser suite covers
navigation, auth boundaries, desktop/mobile Chromium, accessibility, browser
errors, server failures, and responsive overflow.

See [docs/TESTING.md](docs/TESTING.md) for the complete local/CI command matrix,
coverage reports, database cleanup behavior, and deployed-product tests.

Live product tests require a deployed URL and a dedicated test account. They
exercise course CRUD and make a real authenticated Gemini request. See
[docs/SECRETS_AND_E2E.md](docs/SECRETS_AND_E2E.md) for safe secret rotation and
test commands.

## Deployment

The repository includes `vercel.json` for Vite builds, SPA deep-link rewrites, immutable asset caching, and baseline security headers. Follow [docs/VERCEL_MIGRATION.md](docs/VERCEL_MIGRATION.md) for the staged migration and rollback procedure.

The audit and remediation record is in [docs/AUDIT.md](docs/AUDIT.md).
The exact operator setup, local commands, test matrix, and protected Vercel
deployment workflow are in
[docs/LOCAL_DEVELOPMENT_AND_DEPLOYMENT.md](docs/LOCAL_DEVELOPMENT_AND_DEPLOYMENT.md).

## License

No license file is currently included. Add one before accepting external contributions or redistributing the project.
