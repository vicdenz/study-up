import { existsSync, readFileSync, readdirSync } from "node:fs";

const fail = (message) => {
  throw new Error(`Infrastructure validation failed: ${message}`);
};

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const packageManifest = JSON.parse(readFileSync("package.json", "utf8"));
const pnpmWorkspace = readFileSync("pnpm-workspace.yaml", "utf8");

if (packageManifest.packageManager !== "pnpm@11.18.0") {
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
  "test:ci:e2e",
  "test:suite",
]) {
  if (!packageManifest.scripts?.[requiredScript]) {
    fail(`package.json is missing the ${requiredScript} test entry point.`);
  }
}
if (vercel.framework !== "vite") fail("vercel.json must use the Vite framework.");
if (vercel.installCommand !== "pnpm install --frozen-lockfile") {
  fail("Vercel install must use pnpm's frozen lockfile.");
}
if (vercel.buildCommand !== "pnpm build") fail("Unexpected Vercel build command.");
if (vercel.outputDirectory !== "dist") fail("Vercel output directory must be dist.");
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
for (const functionName of ["chat-with-gemini", "generate-study-plan"]) {
  const functionBlock = new RegExp(
    `\\[functions\\.${functionName}\\][\\s\\S]*?verify_jwt\\s*=\\s*true`,
  );
  if (!functionBlock.test(config)) fail(`${functionName} must verify JWTs.`);
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
