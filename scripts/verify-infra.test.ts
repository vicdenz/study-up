import { afterEach, describe, expect, test } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const verifierPath = resolve(process.cwd(), "scripts/verify-infra.mjs");
const temporaryProjects: string[] = [];

const writeJson = (root: string, path: string, value: unknown) => {
  writeFileSync(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`);
};

const createProject = () => {
  const root = mkdtempSync(resolve(tmpdir(), "studyup-infra-test-"));
  temporaryProjects.push(root);
  mkdirSync(resolve(root, "supabase/migrations"), { recursive: true });

  writeJson(root, "package.json", {
    packageManager: "pnpm@10.34.5",
    scripts: {
      "test:ci:static": "true",
      "test:ci:unit": "true",
      "test:ci:functions": "true",
      "test:ci:e2e": "true",
      "test:suite": "true",
    },
    dependencies: { react: "19.2.8" },
    devDependencies: { vite: "8.1.5" },
  });
  writeJson(root, "vercel.json", {
    framework: "vite",
    buildCommand: "pnpm build",
    outputDirectory: "dist",
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  });
  writeFileSync(resolve(root, ".vercelignore"), "/supabase\n");
  writeFileSync(resolve(root, "pnpm-workspace.yaml"), 'packages:\n  - "."\n');
  writeFileSync(resolve(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(
    resolve(root, "supabase/config.toml"),
    [
      "[auth]",
      'site_url = "https://study-up.vercel.app"',
      "additional_redirect_urls = [",
      '  "http://localhost:8080",',
      '  "http://127.0.0.1:8080",',
      '  "http://127.0.0.1:4173",',
      "]",
      "[auth.email]",
      'max_frequency = "1m"',
      "otp_length = 8",
      "[auth.mfa.totp]",
      "enroll_enabled = true",
      "verify_enabled = true",
      "[functions.chat-with-gemini]",
      "verify_jwt = true",
      "[functions.generate-study-plan]",
      "verify_jwt = true",
      "",
    ].join("\n"),
  );
  writeFileSync(
    resolve(root, "supabase/migrations/20260730000000_valid.sql"),
    "select 1;\n",
  );

  return root;
};

const runVerifier = (root: string) =>
  spawnSync(process.execPath, [verifierPath], {
    cwd: root,
    encoding: "utf8",
  });

const readPackage = (root: string) =>
  JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as Record<
    string,
    unknown
  >;

afterEach(() => {
  for (const root of temporaryProjects.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("infrastructure verifier", () => {
  test("accepts the repository's required deployment invariants", () => {
    const result = runVerifier(createProject());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Vercel, Supabase, function-auth, and migration invariants are valid.",
    );
  });

  test("rejects an unapproved pnpm version", () => {
    const root = createProject();
    const manifest = readPackage(root);
    writeJson(root, "package.json", {
      ...manifest,
      packageManager: "pnpm@11.18.0",
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must pin the approved pnpm release");
  });

  test("requires the project root in the pnpm workspace", () => {
    const root = createProject();
    writeFileSync(resolve(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must declare the project root");
  });

  test("rejects a second package-manager lockfile", () => {
    const root = createProject();
    writeFileSync(resolve(root, "package-lock.json"), "{}\n");

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("only the committed pnpm lockfile");
  });

  test("rejects dependency ranges", () => {
    const root = createProject();
    const manifest = readPackage(root);
    writeJson(root, "package.json", {
      ...manifest,
      dependencies: { react: "^19.2.8" },
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("dependencies.react must use an exact version");
  });

  test("requires every CI entry point", () => {
    const root = createProject();
    const manifest = readPackage(root);
    writeJson(root, "package.json", {
      ...manifest,
      scripts: { "test:ci:static": "true" },
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing the test:ci:unit test entry point");
  });

  test("rejects a custom Vercel install command", () => {
    const root = createProject();
    writeJson(root, "vercel.json", {
      framework: "vite",
      installCommand: "pnpm install --frozen-lockfile",
      buildCommand: "pnpm build",
      outputDirectory: "dist",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("detect pnpm from pnpm-lock.yaml");
  });

  test("requires the Vite framework and build output", () => {
    const root = createProject();
    writeJson(root, "vercel.json", {
      framework: "nextjs",
      buildCommand: "pnpm build",
      outputDirectory: "build",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must use the Vite framework");
  });

  test("requires the SPA deep-link rewrite", () => {
    const root = createProject();
    writeJson(root, "vercel.json", {
      framework: "vite",
      buildCommand: "pnpm build",
      outputDirectory: "dist",
      rewrites: [],
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SPA deep-link rewrite is missing");
  });

  test("rejects an unrooted Supabase ignore that hides the browser client", () => {
    const root = createProject();
    writeFileSync(resolve(root, ".vercelignore"), "supabase\n");

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "does not exclude src/integrations/supabase",
    );
  });

  test("requires the backend directory to remain excluded from browser deploys", () => {
    const root = createProject();
    writeFileSync(resolve(root, ".vercelignore"), "docs\n");

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "must exclude the root /supabase backend directory",
    );
  });

  test.each([
    "GEMINI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ])("rejects browser deployment exposure of %s", (secretName) => {
    const root = createProject();
    writeJson(root, "vercel.json", {
      framework: "vite",
      buildCommand: "pnpm build",
      outputDirectory: "dist",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
      env: { [secretName]: "unsafe" },
    });

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${secretName} must not be configured`);
  });

  test("requires JWT verification for every user-facing function", () => {
    const root = createProject();
    const path = resolve(root, "supabase/config.toml");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        "[functions.chat-with-gemini]\nverify_jwt = true",
        "[functions.chat-with-gemini]\nverify_jwt = false",
      ),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("chat-with-gemini must verify JWTs");
  });

  test("rejects a localhost site URL for hosted authentication", () => {
    const root = createProject();
    const path = resolve(root, "supabase/config.toml");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        'site_url = "https://study-up.vercel.app"',
        'site_url = "http://127.0.0.1:8080"',
      ),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("HTTPS Vercel site URL");
  });

  test("requires every supported local authentication redirect", () => {
    const root = createProject();
    const path = resolve(root, "supabase/config.toml");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        '  "http://127.0.0.1:4173",\n',
        "",
      ),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("http://127.0.0.1:4173");
  });

  test("rejects weakened hosted email authentication controls", () => {
    const root = createProject();
    const path = resolve(root, "supabase/config.toml");
    writeFileSync(
      path,
      readFileSync(path, "utf8")
        .replace('max_frequency = "1m"', 'max_frequency = "1s"')
        .replace("otp_length = 8", "otp_length = 6"),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("one-minute throttle and eight-digit OTP");
  });

  test("requires TOTP enrollment and verification", () => {
    const root = createProject();
    const path = resolve(root, "supabase/config.toml");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        "verify_enabled = true",
        "verify_enabled = false",
      ),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TOTP enrollment and verification");
  });

  test("rejects malformed migration names", () => {
    const root = createProject();
    writeFileSync(
      resolve(root, "supabase/migrations/20260730-invalid.sql"),
      "select 1;\n",
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must use the <timestamp>_<name>.sql format");
  });

  test("rejects duplicate migration versions", () => {
    const root = createProject();
    writeFileSync(
      resolve(root, "supabase/migrations/20260730000000_duplicate.sql"),
      "select 1;\n",
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Migration version prefixes must be unique");
  });
});
