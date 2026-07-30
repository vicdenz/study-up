import { describe, expect, test } from "vitest";
import { vercelProtectionHeaders } from "../config/playwright.config";

describe("Vercel deployment protection headers", () => {
  test.each([undefined, "", "   "])(
    "does not send bypass headers without a configured secret",
    (secret) => {
      expect(vercelProtectionHeaders(secret)).toBeUndefined();
    },
  );

  test("sends the bypass secret without exposing it in a URL", () => {
    expect(vercelProtectionHeaders("protected-preview-secret")).toEqual({
      "x-vercel-protection-bypass": "protected-preview-secret",
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  test("trims accidental whitespace around a CI secret", () => {
    expect(vercelProtectionHeaders("  protected-preview-secret\n")).toEqual({
      "x-vercel-protection-bypass": "protected-preview-secret",
      "x-vercel-set-bypass-cookie": "true",
    });
  });
});
