#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-help}"
if [[ $# -gt 0 ]]; then
  shift
fi

cd "$PROJECT_ROOT"

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf 'test-suite: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command '$1' was not found"
}

verify_toolchain() {
  require_command node
  require_command pnpm

  local node_major
  local expected_pnpm
  local actual_pnpm
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  expected_pnpm="$(node -p 'require("./package.json").packageManager.split("@")[1]')"
  actual_pnpm="$(pnpm --version)"

  [[ "$node_major" == "22" ]] ||
    fail "Node 22 is required (found $(node --version)); run 'nvm use'"
  [[ "$actual_pnpm" == "$expected_pnpm" ]] ||
    fail "pnpm $expected_pnpm is required (found $actual_pnpm); run 'corepack enable'"
}

supabase_owned=0
cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [[ "$supabase_owned" == "1" ]]; then
    log "Stopping the disposable Supabase stack"
    pnpm supabase:stop --no-backup || true
  fi

  exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start_owned_supabase() {
  local start_command="$1"
  local retry_delay="${SUPABASE_START_RETRY_DELAY_SECONDS:-5}"
  local attempt

  supabase_owned=1
  for attempt in 1 2 3; do
    if pnpm "$start_command"; then
      return 0
    fi

    if [[ "$attempt" -lt 3 ]]; then
      log "Supabase startup failed (attempt $attempt/3); cleaning partial state before retry"
      pnpm supabase:stop --no-backup || true
      sleep "$retry_delay"
    fi
  done

  return 1
}

run_database_suite() {
  require_command docker

  if pnpm exec supabase status >/dev/null 2>&1; then
    log "Using the Supabase stack that was already running"
  else
    log "Starting a disposable Supabase test stack"
    start_owned_supabase "supabase:start:test"
  fi

  log "Replaying migrations and seed data"
  pnpm db:reset
  log "Running pgTAP schema and RLS tests"
  pnpm db:test
  log "Linting the database schema"
  pnpm db:lint
}

run_product_integration_suite() {
  require_command docker

  if pnpm exec supabase status >/dev/null 2>&1; then
    log "Using the Supabase stack that was already running"
    pnpm supabase:start
  else
    log "Starting a disposable full Supabase product-test stack"
    start_owned_supabase "supabase:start"
  fi

  log "Replaying migrations and configuring isolated product-test users"
  pnpm db:reset
  pnpm env:local --force
  pnpm e2e:user:local
  log "Running authenticated, isolation, storage, email, and AI-contract tests"
  pnpm test:e2e:integration "$@"
}

usage() {
  cat <<'EOF'
Usage: pnpm test:suite <mode> [additional Playwright arguments]

Modes:
  bootstrap   Install frozen dependencies and the matching Chromium binary.
  quick       Lint, type-check, unit test, verify infrastructure, and build.
  unit        Run unit tests with enforced coverage and CI-ready reports.
  functions   Run isolated Edge Function request and quota tests with Deno.
  public      Run public desktop and mobile Playwright product tests.
  database    Start an owned test stack, replay migrations, run pgTAP, clean up.
  integration Run authenticated two-user, storage, email, and AI-contract tests.
  local       Validate local credentials and run authenticated CRUD tests.
  local-full  Validate local Gemini config and run all authenticated tests.
  live        Require deployed-test credentials and test the deployed product.
  ci          Run static checks, coverage, and public Playwright tests.
  all         Run quick, coverage, public browser, and database suites.

Examples:
  pnpm test:suite bootstrap
  pnpm test:suite public --workers=1
  pnpm test:suite database
  pnpm test:suite integration --workers=1
  E2E_BASE_URL=https://preview.example.app E2E_EMAIL=user@example.test \
    E2E_PASSWORD=secret pnpm test:suite live
EOF
}

if [[ "$MODE" == "help" || "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  usage
  exit 0
fi

verify_toolchain

case "$MODE" in
  bootstrap)
    log "Installing the frozen dependency graph"
    pnpm install --frozen-lockfile
    log "Installing the Chromium binary used by Playwright"
    pnpm exec playwright install chromium
    ;;
  quick)
    pnpm check
    pnpm audit --audit-level=high
    ;;
  unit)
    pnpm test:unit:coverage
    ;;
  functions)
    require_command deno
    pnpm test:functions
    ;;
  public)
    pnpm test:e2e:public:ci "$@"
    ;;
  database)
    run_database_suite
    ;;
  integration)
    run_product_integration_suite "$@"
    ;;
  local)
    node scripts/validate-e2e-env.mjs local
    pnpm supabase:status
    pnpm test:e2e:local "$@"
    ;;
  local-full)
    node scripts/validate-e2e-env.mjs local-full
    pnpm supabase:status
    pnpm test:e2e:local:full "$@"
    ;;
  live)
    node scripts/validate-e2e-env.mjs live
    pnpm test:e2e:live --project=chromium "$@"
    ;;
  ci)
    pnpm test:ci:static
    pnpm test:ci:unit
    require_command deno
    pnpm test:ci:functions
    pnpm test:ci:e2e "$@"
    ;;
  all)
    pnpm check
    pnpm audit --audit-level=high
    pnpm test:unit:coverage
    require_command deno
    pnpm test:ci:functions
    pnpm test:e2e:public:ci "$@"
    run_database_suite
    ;;
  *)
    usage
    fail "unknown mode '$MODE'"
    ;;
esac
