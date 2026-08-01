import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const documentedSecretGuides = [
  "README.md",
  "docs/SECURITY.md",
];
const canonicalGeminiCommand =
  'read -s "k?Gemini API key: "; echo; pnpm exec supabase secrets set "GEMINI_API_KEY=$k"; unset k';

describe("Gemini secret documentation", () => {
  test.each(documentedSecretGuides)(
    "%s uses the tested, history-safe zsh one-liner",
    (path) => {
      expect(readFileSync(path, "utf8")).toContain(canonicalGeminiCommand);
    },
  );

  test.each(documentedSecretGuides)(
    "%s does not suggest an exposed placeholder secret",
    (path) => {
      expect(readFileSync(path, "utf8")).not.toContain(
        "GEMINI_API_KEY=<key>",
      );
    },
  );

  test("the operational secret guide explains both observed failure modes", () => {
    const guide = readFileSync("docs/SECURITY.md", "utf8");

    expect(guide).toContain("actual newline before `GEMINI_API_KEY`");
    expect(guide).toContain("`502 Bad Gateway`");
    expect(guide).toContain("retry the same command");
  });
});
