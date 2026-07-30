import { existsSync, writeFileSync } from "node:fs";
import { readLocalSupabaseStatus } from "./supabase-status.mjs";

const outputPath = ".env.local";

if (existsSync(outputPath) && !process.argv.includes("--force")) {
  throw new Error(
    `${outputPath} already exists. Re-run with \`pnpm env:local --force\` to replace it.`,
  );
}

const { apiUrl, publishableKey } = readLocalSupabaseStatus();
const contents = [
  "# Generated from the local Supabase stack. Do not commit.",
  `VITE_SUPABASE_URL=${apiUrl}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
  "",
].join("\n");

writeFileSync(outputPath, contents, { mode: 0o600 });
console.log(`Wrote ${outputPath} for ${apiUrl}.`);
