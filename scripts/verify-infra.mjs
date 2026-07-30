import { readFileSync, readdirSync } from "node:fs";

const fail = (message) => {
  throw new Error(`Infrastructure validation failed: ${message}`);
};

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
if (vercel.framework !== "vite") fail("vercel.json must use the Vite framework.");
if (vercel.installCommand !== "npm ci") fail("Vercel install must be reproducible.");
if (vercel.buildCommand !== "npm run build") fail("Unexpected Vercel build command.");
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
