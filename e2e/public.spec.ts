import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const mockUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "mobile-test@studyup.local",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-01-01T00:00:00.000Z",
};

const encodeTokenPart = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const mockAccessToken = [
  encodeTokenPart({ alg: "HS256", typ: "JWT" }),
  encodeTokenPart({
    aud: "authenticated",
    exp: 4_102_444_800,
    role: "authenticated",
    sub: mockUser.id,
  }),
  "test-signature",
].join(".");

const installAuthenticatedBackend = async (page: Page) => {
  await page.route("https://example.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/auth/v1/token") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: mockAccessToken,
          expires_in: 2_147_483_647,
          refresh_token: "test-refresh-token",
          token_type: "bearer",
          user: mockUser,
        }),
      });
      return;
    }

    if (url.pathname === "/auth/v1/user") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUser) });
      return;
    }

    if (url.pathname === "/rest/v1/profiles") {
      await route.fulfill({
        status: 200,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify({
          avatar_url: null,
          email: mockUser.email,
          first_name: "Mobile",
          last_name: "Tester",
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
};

const expectNoDocumentOverflow = (page: Page) => expect.poll(() => page.evaluate(
  () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
)).toBe(true);

test.describe("@public public and unauthenticated journeys", () => {
  test("landing page exposes the primary product actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Turn your coursework into clarity/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "Books and course notes coming together inside a StudyUp learning workspace",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Log in" }).click();
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

  test("Get started opens the sign-up form directly", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/auth\?mode=signup$/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });

  test("primary actions are reachable by keyboard", async ({ page }) => {
    await page.goto("/");

    const loginButton = page.getByRole("button", { name: "Log in" });
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

  test("landing and authentication remain usable on a narrow phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
    await expect(page.getByRole("link", { name: "@vicdenz" })).toBeVisible();
    await expect(page.getByRole("link", { name: "@reyabsaluja" })).toBeVisible();
    await expectNoDocumentOverflow(page);

    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test("authenticated shell and dialogs remain usable on a narrow phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await installAuthenticatedBackend(page);
    await page.goto("/auth");
    await page.getByLabel("Email").fill(mockUser.email);
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const navigation = page.getByRole("complementary");
    await expect(navigation).toBeVisible();
    expect((await navigation.boundingBox())?.width).toBeLessThanOrEqual(64);

    const destinations = [
      ["Courses", "Courses"],
      ["Planner", "Planner"],
      ["Notebook", "Knowledge Notebook"],
      ["Upload", "Upload Materials"],
      ["AI Tutor", "AI Tutor"],
      ["Profile & settings", "Profile & settings"],
    ] as const;

    for (const [navigationLabel, heading] of destinations) {
      await page.getByRole("button", { name: navigationLabel, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
      await expectNoDocumentOverflow(page);
    }

    await page.getByRole("button", { name: "Courses", exact: true }).click();
    await page.getByRole("button", { name: "Add Course" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add New Course" });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => {
      const bounds = await dialog.boundingBox();
      return Boolean(
        bounds &&
        bounds.x >= 0 &&
        bounds.x + bounds.width <= 320 &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= 568
      );
    }).toBe(true);
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
      maxDiffPixelRatio: 0.04,
    });
  });

  test("matches the reviewed landing layout", async ({ page }, testInfo) => {
    test.skip(
      !["chromium", "mobile-chromium"].includes(testInfo.project.name),
      "Landing visual baselines use deterministic Chromium desktop and mobile projects.",
    );

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Turn your coursework into clarity/ }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot(
      `landing-page-${testInfo.project.name}.png`,
      { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.04 },
    );
  });
});
