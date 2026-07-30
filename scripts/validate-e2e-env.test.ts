import { afterEach, describe, expect, test } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const validatorPath = resolve(process.cwd(), "scripts/validate-e2e-env.mjs");
const temporaryProjects: string[] = [];

const createProject = () => {
  const root = mkdtempSync(resolve(tmpdir(), "studyup-e2e-env-test-"));
  temporaryProjects.push(root);
  return root;
};

const validate = (
  mode: string,
  environment: Record<string, string | undefined> = {},
) => {
  const env = { ...process.env };
  delete env.E2E_BASE_URL;
  delete env.E2E_EMAIL;
  delete env.E2E_PASSWORD;
  delete env.E2E_SECONDARY_EMAIL;
  delete env.E2E_SECONDARY_PASSWORD;
  Object.assign(env, environment);

  return spawnSync(process.execPath, [validatorPath, mode], {
    cwd: createProject(),
    encoding: "utf8",
    env,
  });
};

afterEach(() => {
  for (const root of temporaryProjects.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("E2E environment validator", () => {
  test("requires the local browser environment file", () => {
    const result = validate("local");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".env.e2e.local is missing or unreadable");
  });

  test("accepts a readable local browser environment file", () => {
    const root = createProject();
    writeFileSync(resolve(root, ".env.e2e.local"), "E2E_EMAIL=user@example.test\n");

    const result = spawnSync(process.execPath, [validatorPath, "local"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("E2E local configuration is present");
  });

  test("requires both browser and function files for full local testing", () => {
    const root = createProject();
    writeFileSync(resolve(root, ".env.e2e.local"), "E2E_EMAIL=user@example.test\n");

    const result = spawnSync(process.execPath, [validatorPath, "local-full"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("supabase/.env.local is missing or unreadable");
  });

  test("accepts both full local test files", () => {
    const root = createProject();
    mkdirSync(resolve(root, "supabase"));
    writeFileSync(resolve(root, ".env.e2e.local"), "E2E_EMAIL=user@example.test\n");
    writeFileSync(resolve(root, "supabase/.env.local"), "GEMINI_API_KEY=test\n");

    const result = spawnSync(process.execPath, [validatorPath, "local-full"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("E2E local-full configuration is present");
  });

  test("reports every missing live setting together", () => {
    const result = validate("live");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("E2E_BASE_URL is required");
    expect(result.stderr).toContain("E2E_EMAIL must contain");
    expect(result.stderr).toContain("E2E_PASSWORD must contain");
    expect(result.stderr).toContain("E2E_SECONDARY_EMAIL");
  });

  test("accepts an HTTPS preview with dedicated credentials", () => {
    const result = validate("live", {
      E2E_BASE_URL: "https://studyup-preview.vercel.app",
      E2E_EMAIL: "studyup-e2e@example.test",
      E2E_PASSWORD: "a-long-test-password",
      E2E_SECONDARY_EMAIL: "studyup-e2e-two@example.test",
      E2E_SECONDARY_PASSWORD: "another-long-test-password",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("E2E live configuration is present");
  });

  test("accepts an HTTP loopback target for local verification", () => {
    const result = validate("live", {
      E2E_BASE_URL: "http://127.0.0.1:4173",
      E2E_EMAIL: "studyup-e2e@example.test",
      E2E_PASSWORD: "a-long-test-password",
      E2E_SECONDARY_EMAIL: "studyup-e2e-two@example.test",
      E2E_SECONDARY_PASSWORD: "another-long-test-password",
    });

    expect(result.status).toBe(0);
  });

  test.each([
    "http://studyup-preview.vercel.app",
    "ftp://127.0.0.1/resource",
    "not a url",
  ])("rejects unsafe or invalid live target %s", (baseUrl) => {
    const result = validate("live", {
      E2E_BASE_URL: baseUrl,
      E2E_EMAIL: "studyup-e2e@example.test",
      E2E_PASSWORD: "a-long-test-password",
      E2E_SECONDARY_EMAIL: "studyup-e2e-two@example.test",
      E2E_SECONDARY_PASSWORD: "another-long-test-password",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(
      /must use HTTPS unless it targets 127\.0\.0\.1|must be a valid absolute URL/,
    );
  });

  test("rejects malformed test-user credentials", () => {
    const result = validate("live", {
      E2E_BASE_URL: "https://studyup-preview.vercel.app",
      E2E_EMAIL: "not-an-email",
      E2E_PASSWORD: "short",
      E2E_SECONDARY_EMAIL: "studyup-e2e-two@example.test",
      E2E_SECONDARY_PASSWORD: "another-long-test-password",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("E2E_EMAIL must contain");
    expect(result.stderr).toContain("E2E_PASSWORD must contain");
  });

  test("requires both secondary isolation credentials", () => {
    const result = validate("live", {
      E2E_BASE_URL: "https://studyup-preview.vercel.app",
      E2E_EMAIL: "studyup-e2e@example.test",
      E2E_PASSWORD: "a-long-test-password",
      E2E_SECONDARY_EMAIL: "studyup-e2e-two@example.test",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "E2E_SECONDARY_EMAIL and E2E_SECONDARY_PASSWORD are required",
    );
  });

  test("accepts a complete secondary isolation account", () => {
    const result = validate("live", {
      E2E_BASE_URL: "https://studyup-preview.vercel.app",
      E2E_EMAIL: "studyup-e2e@example.test",
      E2E_PASSWORD: "a-long-test-password",
      E2E_SECONDARY_EMAIL: "studyup-e2e-two@example.test",
      E2E_SECONDARY_PASSWORD: "another-long-test-password",
    });

    expect(result.status).toBe(0);
  });

  test("rejects unknown modes", () => {
    const result = validate("production");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("mode must be one of: local, local-full, live");
  });
});
