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
  node_major="$(node -p 'process.versions.node.split(\".\")[0]')"
  expected_pnpm="$(node -p 'require(\"./package.json\").packageManager.split(\"@\")[1]')"
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

run_database_suite() {
  require_command docker

  if pnpm exec supabase status >/dev/null 2>&1; then
    log "Using the Supabase stack that was already running"
  else
    log "Starting a disposable Supabase test stack"
    supabase_owned=1
    pnpm supabase:start:test
  fi

  log "Replaying migrations and seed data"
  pnpm db:reset
  log "Running pgTAP schema and RLS tests"
  pnpm db:test
  log "Linting the database schema"
  pnpm db:lint
}

usage() {
  cat <<'EOF'
Usage: pnpm test:suite <mode> [additional Playwright arguments]

Modes:
  bootstrap   Install frozen dependencies and the matching Chromium binary.
  quick       Lint, type-check, unit test, verify infrastructure, and build.
  unit        Run unit tests with enforced coverage and CI-ready reports.
  public      Run public desktop and mobile Playwright product tests.
  database    Start an owned test stack, replay migrations, run pgTAP, clean up.
  local       Validate local credentials and run authenticated CRUD tests.
  local-full  Validate local Gemini config and run all authenticated tests.
  live        Require deployed-test credentials and test the deployed product.
  ci          Run static checks, coverage, and public Playwright tests.
  all         Run quick, coverage, public browser, and database suites.

Examples:
  pnpm test:suite bootstrap
  pnpm test:suite public --workers=1
  pnpm test:suite database
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
  public)
    pnpm test:e2e:public:ci "$@"
    ;;
  database)
    run_database_suite
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
    pnpm test:ci:e2e "$@"
    ;;
  all)
    pnpm check
    pnpm audit --audit-level=high
    pnpm test:unit:coverage
    pnpm test:e2e:public:ci "$@"
    run_database_suite
    ;;
  *)
    usage
    fail "unknown mode '$MODE'"
    ;;
esac
