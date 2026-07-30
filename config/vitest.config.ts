import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    setupFiles: ["src/test/setup.ts"],
    passWithNoTests: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    reporters: isCi ? ["default", "junit"] : ["default"],
    outputFile: isCi
      ? {
          junit: "artifacts/vitest/junit.xml",
        }
      : undefined,
    coverage: {
      provider: "v8",
      include: [
        "src/components/AddCourseDialog.tsx",
        "src/components/AddMaterialDialog.tsx",
        "src/components/NetworkStatus.tsx",
        "src/hooks/useGeminiChat.ts",
        "src/lib/calendar-navigation.ts",
        "src/lib/material-validation.ts",
        "src/lib/utils.ts",
        "src/pages/Auth.tsx",
      ],
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "artifacts/coverage",
      reportOnFailure: true,
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
        "src/lib/calendar-navigation.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/lib/material-validation.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/lib/utils.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
});
