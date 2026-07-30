import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readLocalSupabaseStatus } from "./supabase-status.mjs";

const { apiUrl, publishableKey, serviceRoleKey } = readLocalSupabaseStatus();

if (!serviceRoleKey) {
  throw new Error("Supabase CLI status did not return a local service-role key.");
}

const email = "studyup-e2e@local.test";
const password = "StudyUp-local-e2e-only-2026!";
const adminClient = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: userPage, error: listError } =
  await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

if (listError) throw listError;

const existingUser = userPage.users.find((user) => user.email === email);
const userResult = existingUser
  ? await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    })
  : await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Local", last_name: "E2E" },
    });

if (userResult.error) throw userResult.error;

const publicClient = createClient(apiUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: signInError } = await publicClient.auth.signInWithPassword({
  email,
  password,
});
if (signInError) throw signInError;
await publicClient.auth.signOut();

const envContents = [
  "# Generated for localhost-only Playwright tests. Do not commit.",
  `VITE_SUPABASE_URL=${apiUrl}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
  `E2E_EMAIL=${email}`,
  `E2E_PASSWORD=${password}`,
  "",
].join("\n");

writeFileSync(".env.e2e.local", envContents, { mode: 0o600 });
console.log(
  "Created, authenticated, and refreshed the local E2E user and .env.e2e.local.",
);
