import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./test";

test.describe("@public public and unauthenticated journeys", () => {
  test("landing page exposes the primary product actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Unlock Your Academic Potential" }),
    ).toBeVisible();
    await expect(page.getByAltText("StudyUp application screenshot")).toBeVisible();

    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("authentication form supports sign-in and sign-up modes", async ({
    page,
  }) => {
    await page.goto("/auth");

    await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "minlength",
      "8",
    );
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await expect(page.getByLabel("First Name")).toBeVisible();
    await expect(page.getByLabel("Last Name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" }),
    ).toBeVisible();
  });

  test("primary actions are reachable by keyboard", async ({ page }) => {
    await page.goto("/");

    const loginButton = page.getByRole("button", { name: "Login" });
    for (let tabPresses = 0; tabPresses < 5; tabPresses += 1) {
      if (await loginButton.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }

    await expect(loginButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("protected deep links redirect to authentication", async ({ page }) => {
    await page.goto("/courses/not-a-real-course");

    await expect(page).toHaveURL(/\/auth$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("public pages have no serious accessibility violations", async ({
    page,
  }) => {
    for (const path of ["/", "/auth"]) {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).analyze();
      const seriousViolations = violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious",
      );

      expect(
        seriousViolations,
        `${path} has serious accessibility violations`,
      ).toEqual([]);
    }
  });

  test("landing content does not overflow the viewport", async ({ page }) => {
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));

    expect(dimensions.documentWidth).toBeLessThanOrEqual(
      dimensions.viewportWidth + 1,
    );
  });

  test("reports connectivity loss and recovery", async ({ context, page }) => {
    await page.goto("/");
    await expect(page.getByText("You are offline.")).toHaveCount(0);

    await context.setOffline(true);
    await expect(
      page.getByRole("status").filter({ hasText: "You are offline." }),
    ).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByText("You are offline.")).toHaveCount(0);
  });

  test("matches the reviewed authentication layout", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The visual baseline uses the deterministic desktop Chromium project.",
    );

    await page.goto("/auth");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot("auth-page.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });
});
