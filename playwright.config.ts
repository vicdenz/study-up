import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL;
const configuredWorkers = Number.parseInt(process.env.E2E_WORKERS ?? "", 10);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "artifacts/playwright/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: Number.isFinite(configuredWorkers)
    ? configuredWorkers
    : process.env.CI
      ? 1
      : undefined,
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  reporter: process.env.CI
    ? [
        ["github"],
        ["line"],
        [
          "junit",
          { outputFile: "artifacts/playwright/junit.xml", includeProjectInTestName: true },
        ],
        [
          "html",
          { outputFolder: "artifacts/playwright/report", open: "never" },
        ],
      ]
    : "list",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:4173",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    locale: "en-CA",
    timezoneId: "America/Toronto",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "pnpm dev --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          VITE_SUPABASE_URL:
            process.env.VITE_SUPABASE_URL ?? "https://example.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY:
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "test-publishable-key",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
