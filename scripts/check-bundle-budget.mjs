import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_BUDGETS = Object.freeze({
  largestApplicationJavaScriptBytes: 450_000,
  totalApplicationJavaScriptBytes: 1_650_000,
  largestWorkerBytes: 2_300_000,
  // Includes the responsive application shell and mobile overlay treatments.
  totalCssBytes: 125_000,
});

const filesBelow = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });

export const measureBundle = (assetsDirectory) => {
  const assets = filesBelow(assetsDirectory).map((path) => ({
    path: relative(assetsDirectory, path),
    bytes: statSync(path).size,
    extension: extname(path),
  }));
  const javascript = assets.filter(({ extension }) =>
    [".js", ".mjs"].includes(extension),
  );
  const workers = javascript.filter(({ path }) => path.includes(".worker-"));
  const applicationJavaScript = javascript.filter(
    ({ path }) => !path.includes(".worker-"),
  );
  const styles = assets.filter(({ extension }) => extension === ".css");

  return {
    largestApplicationJavaScriptBytes: Math.max(
      0,
      ...applicationJavaScript.map(({ bytes }) => bytes),
    ),
    totalApplicationJavaScriptBytes: applicationJavaScript.reduce(
      (total, { bytes }) => total + bytes,
      0,
    ),
    largestWorkerBytes: Math.max(0, ...workers.map(({ bytes }) => bytes)),
    totalCssBytes: styles.reduce((total, { bytes }) => total + bytes, 0),
  };
};

export const assertBundleBudget = (
  measurement,
  budgets = DEFAULT_BUDGETS,
) => {
  const failures = Object.entries(budgets)
    .filter(([name, limit]) => measurement[name] > limit)
    .map(
      ([name, limit]) =>
        `${name} is ${measurement[name]} bytes (budget: ${limit} bytes)`,
    );

  if (failures.length) {
    throw new Error(`Bundle budget exceeded:\n${failures.join("\n")}`);
  }
};

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (invokedPath === import.meta.url) {
  const assetsDirectory = process.argv[2] ?? "dist/assets";
  const measurement = measureBundle(assetsDirectory);
  assertBundleBudget(measurement);
  console.log(
    `Bundle budgets pass: ${JSON.stringify(measurement)}`,
  );
}
