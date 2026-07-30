import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasLiveConfiguration = Boolean(email && password);

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}

test.describe("@live authenticated product journeys", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !hasLiveConfiguration,
    "Set E2E_EMAIL and E2E_PASSWORD for a dedicated test user. Set E2E_BASE_URL when testing a deployment.",
  );

  test("creates and deletes a course", async ({ page }) => {
    const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const courseName = `E2E Course ${suffix}`;
    let created = false;

    try {
      await signIn(page);
      await page.goto("/courses");
      await page.getByRole("button", { name: "Add Course" }).first().click();
      await page.getByLabel("Course Name").fill(courseName);
      await page.getByLabel("Course Code").fill(`E2E-${suffix.slice(-8)}`);
      await page
        .getByLabel("Description (Optional)")
        .fill("Created by the automated product test; safe to delete.");
      await page.getByRole("button", { name: "Create Course" }).click();
      created = true;

      await expect(page.getByText(courseName, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: `Delete ${courseName}` }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByText(courseName, { exact: true })).toHaveCount(0);
      created = false;
    } finally {
      if (created) {
        await page.goto("/courses");
        const course = page.getByText(courseName, { exact: true });
        if (await course.count()) {
          await page.getByRole("button", { name: `Delete ${courseName}` }).click();
          await page
            .getByRole("alertdialog")
            .getByRole("button", { name: "Delete", exact: true })
            .click();
        }
      }
    }
  });

  test("Gemini tutor returns a live model response", async ({ page }) => {
    await signIn(page);
    await page.goto("/ai-tutor");

    await page
      .getByPlaceholder(/Ask your AI tutor/)
      .fill("Reply with exactly STUDYUP_E2E_OK and no other text.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("STUDYUP_E2E_OK", { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  });
});
