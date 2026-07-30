import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
  type TestInfo,
} from "@playwright/test";

const formatConsoleError = (message: ConsoleMessage) =>
  `console.${message.type()}: ${message.text()}`;

const observePageFailures = (page: Page, testInfo: TestInfo) => {
  const failures: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") failures.push(formatConsoleError(message));
  });
  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  return async () => {
    if (failures.length > 0) {
      await testInfo.attach("browser-failures.json", {
        body: Buffer.from(JSON.stringify(failures, null, 2)),
        contentType: "application/json",
      });
    }

    expect(failures, "The browser emitted console, page, or HTTP 5xx errors").toEqual(
      [],
    );
  };
};

export const test = base.extend({
  page: async ({ page }, run, testInfo) => {
    const assertNoPageFailures = observePageFailures(page, testInfo);
    await run(page);
    await assertNoPageFailures();
  },
});

export { expect };
