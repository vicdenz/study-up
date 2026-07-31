import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  assertBundleBudget,
  measureBundle,
} from "./check-bundle-budget.mjs";

const roots: string[] = [];

const fixture = (files: Record<string, number>) => {
  const root = mkdtempSync(join(tmpdir(), "studyup-bundle-"));
  roots.push(root);
  for (const [name, bytes] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, Buffer.alloc(bytes));
  }
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("bundle budget", () => {
  test("measures nested JavaScript and CSS without counting source maps", () => {
    const root = fixture({
      "app.js": 100,
      "lazy/chunk.mjs": 40,
      "pdf.worker-123.mjs": 300,
      "styles.css": 25,
      "app.js.map": 1_000,
      "image.png": 2_000,
    });

    expect(measureBundle(root)).toEqual({
      largestApplicationJavaScriptBytes: 100,
      totalApplicationJavaScriptBytes: 140,
      largestWorkerBytes: 300,
      totalCssBytes: 25,
    });
  });

  test("accepts measurements exactly on every boundary", () => {
    expect(() =>
      assertBundleBudget(
        {
          largestApplicationJavaScriptBytes: 100,
          totalApplicationJavaScriptBytes: 200,
          largestWorkerBytes: 300,
          totalCssBytes: 50,
        },
        {
          largestApplicationJavaScriptBytes: 100,
          totalApplicationJavaScriptBytes: 200,
          largestWorkerBytes: 300,
          totalCssBytes: 50,
        },
      ),
    ).not.toThrow();
  });

  test.each([
    ["largestApplicationJavaScriptBytes", 101],
    ["totalApplicationJavaScriptBytes", 201],
    ["largestWorkerBytes", 301],
    ["totalCssBytes", 51],
  ] as const)("rejects a %s regression", (name, value) => {
    expect(() =>
      assertBundleBudget(
        {
          largestApplicationJavaScriptBytes:
            name === "largestApplicationJavaScriptBytes" ? value : 0,
          totalApplicationJavaScriptBytes:
            name === "totalApplicationJavaScriptBytes" ? value : 0,
          largestWorkerBytes: name === "largestWorkerBytes" ? value : 0,
          totalCssBytes: name === "totalCssBytes" ? value : 0,
        },
        {
          largestApplicationJavaScriptBytes: 100,
          totalApplicationJavaScriptBytes: 200,
          largestWorkerBytes: 300,
          totalCssBytes: 50,
        },
      ),
    ).toThrow(`${name} is ${value} bytes`);
  });

  test("reports every simultaneous regression", () => {
    expect(() =>
      assertBundleBudget(
        {
          largestApplicationJavaScriptBytes: 101,
          totalApplicationJavaScriptBytes: 201,
          largestWorkerBytes: 301,
          totalCssBytes: 51,
        },
        {
          largestApplicationJavaScriptBytes: 100,
          totalApplicationJavaScriptBytes: 200,
          largestWorkerBytes: 300,
          totalCssBytes: 50,
        },
      ),
    ).toThrow(
      /largestApplicationJavaScriptBytes[\s\S]*totalApplicationJavaScriptBytes[\s\S]*largestWorkerBytes[\s\S]*totalCssBytes/,
    );
  });
});
