import { expect, test } from "./test";

const mailUrl = process.env.E2E_MAIL_URL;

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
}

interface MailpitList {
  messages?: MailpitSummary[];
}

interface MailpitMessage {
  HTML?: string;
  Text?: string;
}

test.describe("@local-email local confirmation email", () => {
  test.skip(!mailUrl, "E2E_MAIL_URL is required for local email verification.");

  test("delivers a confirmation message containing a valid local callback", async ({
    page,
    request,
  }) => {
    const email = `signup-${crypto.randomUUID()}@local.test`;
    await page.goto("/auth");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.getByLabel("First Name").fill("Email");
    await page.getByLabel("Last Name").fill("Verification");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(
      "StudyUp-email-test-2026!",
    );
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();

    await expect
      .poll(
        async () => {
          const response = await request.get(`${mailUrl}/api/v1/messages`);
          if (!response.ok()) return undefined;
          const body = (await response.json()) as MailpitList;
          return body.messages?.find((message) =>
            message.To.some(({ Address }) => Address === email),
          );
        },
        { timeout: 15_000, message: `confirmation email for ${email}` },
      )
      .not.toBeUndefined();

    const listResponse = await request.get(`${mailUrl}/api/v1/messages`);
    const list = (await listResponse.json()) as MailpitList;
    const messageSummary = list.messages?.find((message) =>
      message.To.some(({ Address }) => Address === email),
    );
    expect(messageSummary?.Subject.toLowerCase()).toContain("confirm");

    const messageResponse = await request.get(
      `${mailUrl}/api/v1/message/${messageSummary!.ID}`,
    );
    expect(messageResponse.ok()).toBe(true);
    const message = (await messageResponse.json()) as MailpitMessage;
    const content = `${message.HTML ?? ""}\n${message.Text ?? ""}`;
    const rawVerificationUrl = content.match(
      /http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^"' <]+/,
    )?.[0];
    expect(rawVerificationUrl).toBeDefined();
    const verificationUrl = new URL(
      rawVerificationUrl!.replaceAll("&amp;", "&"),
    );
    expect(
      verificationUrl.searchParams.get("token_hash") ??
        verificationUrl.searchParams.get("token"),
    ).toBeTruthy();
    expect(verificationUrl.searchParams.get("redirect_to")).toBe(
      "http://127.0.0.1:4173/",
    );
  });
});
