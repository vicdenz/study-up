import { accessSync, constants } from "node:fs";

const mode = process.argv[2];

const fail = (messages) => {
  console.error("E2E configuration is invalid:");
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
};

const requireFiles = (paths) => {
  const errors = [];

  for (const path of paths) {
    try {
      accessSync(path, constants.R_OK);
    } catch {
      errors.push(`${path} is missing or unreadable`);
    }
  }

  if (errors.length > 0) fail(errors);
};

if (mode === "local") {
  requireFiles([".env.e2e.local"]);
} else if (mode === "local-full") {
  requireFiles([".env.e2e.local", "supabase/.env.local"]);
} else if (mode === "live") {
  const errors = [];
  const baseUrl = process.env.E2E_BASE_URL;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!baseUrl) {
    errors.push("E2E_BASE_URL is required");
  } else {
    try {
      const url = new URL(baseUrl);
      if (url.protocol !== "https:" && url.hostname !== "127.0.0.1") {
        errors.push("E2E_BASE_URL must use HTTPS unless it targets 127.0.0.1");
      }
    } catch {
      errors.push("E2E_BASE_URL must be a valid absolute URL");
    }
  }

  if (!email || !email.includes("@")) {
    errors.push("E2E_EMAIL must contain the dedicated test user's email");
  }
  if (!password || password.length < 8) {
    errors.push("E2E_PASSWORD must contain the dedicated test user's password");
  }

  if (errors.length > 0) fail(errors);
} else {
  fail(["mode must be one of: local, local-full, live"]);
}

console.log(`E2E ${mode} configuration is present.`);
