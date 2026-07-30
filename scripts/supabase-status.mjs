import { execFileSync } from "node:child_process";

export const readLocalSupabaseStatus = () => {
  let output;

  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "The local Supabase stack is not running. Start Docker, then run `npm run supabase:start`.",
    );
  }

  const values = Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=(?:"(.*)"|(.*))$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2] ?? match[3] ?? ""]),
  );

  const apiUrl = values.API_URL;
  const publishableKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
  const serviceRoleKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;

  if (!apiUrl || !publishableKey) {
    throw new Error("Supabase CLI status did not return an API URL and public key.");
  }

  const hostname = new URL(apiUrl).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error(`Refusing to use a non-local Supabase URL: ${apiUrl}`);
  }

  return { apiUrl, publishableKey, serviceRoleKey };
};
