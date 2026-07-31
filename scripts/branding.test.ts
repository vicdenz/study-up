import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("browser branding", () => {
  test("uses the StudyUp brain logo as the explicit favicon", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/studyup-logo.svg" />',
    );
  });

  test("keeps the referenced brain logo available to the browser", () => {
    const logo = readFileSync("public/studyup-logo.svg", "utf8");

    expect(logo).toContain('viewBox="0 0 24 24"');
    expect(logo).toContain('stroke="#6366F1"');
    expect(logo).toContain("<path");
  });

  test("does not retain the legacy Lovable favicon fallback", () => {
    expect(existsSync("public/favicon.ico")).toBe(false);
  });
});
