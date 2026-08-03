import {
  expect,
  test as base,
  type BrowserContext,
  type ConsoleMessage,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { vercelProtectionHeaders } from "../scripts/vercel-protection";

const formatConsoleError = (message: ConsoleMessage) =>
  `console.${message.type()}: ${message.text()}`;

const observePageFailures = (page: Page, testInfo: TestInfo) => {
  const failures: string[] = [];
  const isOfflineJourney = testInfo.title.includes("connectivity loss and recovery");

  page.on("console", (message) => {
    const expectedOfflineTransportError =
      isOfflineJourney &&
      message.type() === "error" &&
      /Failed to load resource: (?:net::ERR_INTERNET_DISCONNECTED|WebKit encountered an internal error)/.test(
        message.text(),
      );
    if (message.type() === "error" && !expectedOfflineTransportError) {
      failures.push(formatConsoleError(message));
    }
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

export const bootstrapVercelProtection = async (
  context: BrowserContext,
  baseUrl = process.env.E2E_BASE_URL,
) => {
  const protectionHeaders = vercelProtectionHeaders();
  if (!protectionHeaders || !baseUrl) return;

  const response = await context.request.get(baseUrl, {
    headers: protectionHeaders,
  });
  expect(
    response.ok(),
    `Vercel protection bypass failed with HTTP ${response.status()}`,
  ).toBe(true);
};

export const test = base.extend({
  page: async ({ page }, run, testInfo) => {
    await bootstrapVercelProtection(page.context());

    const assertNoPageFailures = observePageFailures(page, testInfo);
    await run(page);
    await assertNoPageFailures();
  },
});

export { expect };
