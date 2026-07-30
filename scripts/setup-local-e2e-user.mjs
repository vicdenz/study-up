import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readLocalSupabaseStatus } from "./supabase-status.mjs";

const { apiUrl, publishableKey, serviceRoleKey } = readLocalSupabaseStatus();

if (!serviceRoleKey) {
  throw new Error("Supabase CLI status did not return a local service-role key.");
}

const password = "StudyUp-local-e2e-only-2026!";
const users = [
  {
    email: "studyup-e2e@local.test",
    firstName: "Local",
    lastName: "Primary",
  },
  {
    email: "studyup-e2e-secondary@local.test",
    firstName: "Local",
    lastName: "Secondary",
  },
];
const adminClient = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: userPage, error: listError } =
  await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

if (listError) throw listError;

for (const user of users) {
  const existingUser = userPage.users.find(
    ({ email }) => email === user.email,
  );
  const userResult = existingUser
    ? await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName,
        },
      })
    : await adminClient.auth.admin.createUser({
        email: user.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName,
        },
      });

  if (userResult.error) throw userResult.error;
}

const publicClient = createClient(apiUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: signInError } = await publicClient.auth.signInWithPassword({
  email: users[0].email,
  password,
});
if (signInError) throw signInError;
await publicClient.auth.signOut();

const envContents = [
  "# Generated for localhost-only Playwright tests. Do not commit.",
  `VITE_SUPABASE_URL=${apiUrl}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
  `E2E_EMAIL=${users[0].email}`,
  `E2E_PASSWORD=${password}`,
  `E2E_SECONDARY_EMAIL=${users[1].email}`,
  `E2E_SECONDARY_PASSWORD=${password}`,
  "E2E_MAIL_URL=http://127.0.0.1:54324",
  "",
].join("\n");

writeFileSync(".env.e2e.local", envContents, { mode: 0o600 });
console.log(
  "Created two authenticated local E2E users and .env.e2e.local.",
);
