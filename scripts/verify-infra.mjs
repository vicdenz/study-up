import { existsSync, readFileSync, readdirSync } from "node:fs";

const fail = (message) => {
  throw new Error(`Infrastructure validation failed: ${message}`);
};

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const packageManifest = JSON.parse(readFileSync("package.json", "utf8"));
const pnpmWorkspace = readFileSync("pnpm-workspace.yaml", "utf8");
const vercelIgnore = readFileSync(".vercelignore", "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

if (packageManifest.packageManager !== "pnpm@10.34.5") {
  fail("package.json must pin the approved pnpm release.");
}
if (!pnpmWorkspace.includes('packages:\n  - "."')) {
  fail("pnpm-workspace.yaml must declare the project root.");
}
if (!existsSync("pnpm-lock.yaml") || existsSync("package-lock.json")) {
  fail("The repository must use only the committed pnpm lockfile.");
}
for (const sectionName of ["dependencies", "devDependencies"]) {
  for (const [name, version] of Object.entries(
    packageManifest[sectionName] ?? {},
  )) {
    if (/^[~^]/.test(version)) {
      fail(`${sectionName}.${name} must use an exact version.`);
    }
  }
}
for (const requiredScript of [
  "test:ci:static",
  "test:ci:unit",
  "test:ci:functions",
  "test:ci:e2e",
  "test:suite",
]) {
  if (!packageManifest.scripts?.[requiredScript]) {
    fail(`package.json is missing the ${requiredScript} test entry point.`);
  }
}
if (vercel.framework !== "vite") fail("vercel.json must use the Vite framework.");
if ("installCommand" in vercel) {
  fail("Vercel must detect pnpm from pnpm-lock.yaml instead of overriding installation.");
}
if (vercel.buildCommand !== "pnpm build") fail("Unexpected Vercel build command.");
if (vercel.outputDirectory !== "dist") fail("Vercel output directory must be dist.");
if (vercelIgnore.includes("supabase")) {
  fail(
    ".vercelignore must root the Supabase backend pattern as /supabase so it does not exclude src/integrations/supabase.",
  );
}
if (!vercelIgnore.includes("/supabase")) {
  fail(".vercelignore must exclude the root /supabase backend directory.");
}
if (
  !vercel.rewrites?.some(
    ({ source, destination }) =>
      source === "/(.*)" && destination === "/index.html",
  )
) {
  fail("The SPA deep-link rewrite is missing.");
}

const vercelText = JSON.stringify(vercel);
for (const forbiddenName of [
  "GEMINI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
]) {
  if (vercelText.includes(forbiddenName)) {
    fail(`${forbiddenName} must not be configured in the browser deployment.`);
  }
}

const config = readFileSync("supabase/config.toml", "utf8");
if (!/site_url\s*=\s*"https:\/\/[^"]+\.vercel\.app"/.test(config)) {
  fail("Hosted Supabase Auth must use an HTTPS Vercel site URL.");
}
for (const redirectUrl of [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:4173",
]) {
  if (!config.includes(`"${redirectUrl}"`)) {
    fail(`Supabase Auth must preserve the local redirect ${redirectUrl}.`);
  }
}
if (!/max_frequency\s*=\s*"1m"/.test(config) || !/otp_length\s*=\s*8/.test(config)) {
  fail("Hosted email Auth must retain the one-minute throttle and eight-digit OTP.");
}
const totpSection = config.match(
  /\[auth\.mfa\.totp\]([\s\S]*?)(?=\n\[|$)/,
)?.[1];
if (
  !totpSection ||
  !/enroll_enabled\s*=\s*true/.test(totpSection) ||
  !/verify_enabled\s*=\s*true/.test(totpSection)
) {
  fail("Hosted Supabase Auth must keep TOTP enrollment and verification enabled.");
}
for (const functionName of ["chat-with-gemini", "generate-study-plan"]) {
  const header = `[functions.${functionName}]`;
  const sectionStart = config.indexOf(header);
  const sectionRemainder = config.slice(sectionStart + header.length);
  const nextSection = sectionRemainder.search(/\r?\n\[/);
  const section = nextSection === -1
    ? sectionRemainder
    : sectionRemainder.slice(0, nextSection);
  if (sectionStart === -1 || !/verify_jwt\s*=\s*true/.test(section)) {
    fail(`${functionName} must verify JWTs.`);
  }
}

const migrationNames = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"));
for (const name of migrationNames) {
  if (!/^\d{14}_.+\.sql$/.test(name)) {
    fail(`Migration ${name} must use the <timestamp>_<name>.sql format.`);
  }
}
const migrationVersions = migrationNames.map((name) => name.split("_")[0]);
if (new Set(migrationVersions).size !== migrationVersions.length) {
  fail("Migration version prefixes must be unique.");
}

console.log("Vercel, Supabase, function-auth, and migration invariants are valid.");
