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
  const secondaryEmail = process.env.E2E_SECONDARY_EMAIL;
  const secondaryPassword = process.env.E2E_SECONDARY_PASSWORD;
  const configuredOrigins = (process.env.E2E_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!baseUrl) {
    errors.push("E2E_BASE_URL is required");
  } else {
    try {
      const url = new URL(baseUrl);
      const isHttps = url.protocol === "https:";
      const isLoopbackHttp =
        url.protocol === "http:" && url.hostname === "127.0.0.1";
      if (!isHttps && !isLoopbackHttp) {
        errors.push("E2E_BASE_URL must use HTTPS unless it targets 127.0.0.1");
      }
      const trustedStudyUpHost =
        url.hostname === "study-up-pi.vercel.app" ||
        /^study-up(?:-[a-z0-9-]+)?-david-daniliucs-projects\.vercel\.app$/.test(
          url.hostname,
        );
      const explicitlyAllowed = configuredOrigins.includes(url.origin);
      if (
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash ||
        (!isLoopbackHttp && !trustedStudyUpHost && !explicitlyAllowed)
      ) {
        errors.push(
          "E2E_BASE_URL must be an approved StudyUp origin with no credentials, path, query, or fragment",
        );
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
  if (!secondaryEmail || !secondaryPassword) {
    errors.push(
      "E2E_SECONDARY_EMAIL and E2E_SECONDARY_PASSWORD are required for live isolation testing",
    );
  } else if (
    !secondaryEmail.includes("@") || secondaryPassword.length < 8
  ) {
    errors.push("Secondary E2E credentials must identify a dedicated test user");
  }

  if (errors.length > 0) fail(errors);
} else {
  fail(["mode must be one of: local, local-full, live"]);
}

console.log(`E2E ${mode} configuration is present.`);
