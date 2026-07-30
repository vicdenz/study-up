import { expect, test } from "./test";

const percentile = (values: number[], fraction: number) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
};

test.describe("@performance production performance and load budgets", () => {
  test("renders within navigation and paint budgets", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Unlock Your Academic Potential" }),
    ).toBeVisible();

    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      const firstContentfulPaint =
        performance
          .getEntriesByName("first-contentful-paint")
          .at(0)?.startTime ?? Number.POSITIVE_INFINITY;

      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.startTime,
        loadComplete: navigation.loadEventEnd - navigation.startTime,
        firstContentfulPaint,
      };
    });

    expect(timing.domContentLoaded).toBeLessThan(1_500);
    expect(timing.loadComplete).toBeLessThan(2_500);
    expect(timing.firstContentfulPaint).toBeLessThan(1_500);
  });

  test("serves a bounded concurrent static load without errors", async ({
    request,
  }) => {
    const requestCount = 200;
    const concurrency = 10;
    const durations: number[] = [];
    const failures: string[] = [];

    for (let offset = 0; offset < requestCount; offset += concurrency) {
      await Promise.all(
        Array.from(
          { length: Math.min(concurrency, requestCount - offset) },
          async (_, index) => {
            const startedAt = performance.now();
            const response = await request.get(
              `/?load-check=${offset + index}`,
            );
            durations.push(performance.now() - startedAt);
            if (!response.ok()) {
              failures.push(`${response.status()} ${response.url()}`);
            }
          },
        ),
      );
    }

    expect(failures).toEqual([]);
    expect(percentile(durations, 0.95)).toBeLessThan(500);
  });
});
