import type { Page } from "@playwright/test";
import type { Download } from "@playwright/test";
import { expect, test } from "./test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const secondaryEmail = process.env.E2E_SECONDARY_EMAIL;
const secondaryPassword = process.env.E2E_SECONDARY_PASSWORD;
const hasLiveConfiguration = Boolean(email && password);
const hasIsolationConfiguration = Boolean(secondaryEmail && secondaryPassword);

const uniqueName = (prefix: string) =>
  `${prefix} ${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

async function signIn(page: Page, userEmail = email!, userPassword = password!) {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(userEmail);
  await page.getByLabel("Password", { exact: true }).fill(userPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/auth$/, { timeout: 20_000 });
}

async function createCourse(page: Page, courseName: string) {
  const code = `E2E-${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/courses");
  await page.getByRole("button", { name: "Add Course" }).first().click();
  await page.getByLabel("Course Name").fill(courseName);
  await page.getByLabel("Course Code").fill(code);
  await page
    .getByLabel("Description (Optional)")
    .fill("Created by an automated product test and safe to delete.");
  await page.getByRole("button", { name: "Create Course" }).click();
  await expect(page.getByText(courseName, { exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

async function deleteCourseIfPresent(page: Page, courseName: string) {
  await page.goto("/courses");
  const deleteButton = page.getByRole("button", {
    name: `Delete ${courseName}`,
  });
  if (await deleteButton.count()) {
    await deleteButton.click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText(courseName, { exact: true })).toHaveCount(0);
  }
}

async function readDownload(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

test.describe("@authenticated authenticated product journeys", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !hasLiveConfiguration,
    "Set E2E_EMAIL and E2E_PASSWORD for a dedicated test user. Set E2E_BASE_URL when testing a deployment.",
  );

  test("persists authentication across refresh and signs out cleanly", async ({
    page,
  }) => {
    await signIn(page);
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back!" }),
    ).toBeVisible();

    await signOut(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("creates and deletes a course", async ({ page }) => {
    const courseName = uniqueName("E2E Course");
    let created = false;

    try {
      await signIn(page);
      await createCourse(page, courseName);
      created = true;
      await deleteCourseIfPresent(page, courseName);
      created = false;
    } finally {
      if (created) await deleteCourseIfPresent(page, courseName);
    }
  });

  test("creates, completes, edits, and deletes an assignment", async ({
    page,
  }) => {
    const courseName = uniqueName("E2E Assignment Course");
    const assignmentName = uniqueName("E2E Assignment");
    const updatedName = `${assignmentName} Updated`;
    let courseCreated = false;

    try {
      await signIn(page);
      await createCourse(page, courseName);
      courseCreated = true;
      await page.getByText(courseName, { exact: true }).click();

      await page.getByRole("button", { name: "Add Assignment" }).first().click();
      await page.getByLabel("Assignment Title").fill(assignmentName);
      await page
        .getByLabel("Description (Optional)")
        .fill("Assignment lifecycle coverage");
      await page.getByLabel("Due Date (Optional)").fill("2099-12-31T17:30");
      await page.getByRole("button", { name: "Create Assignment" }).click();

      await expect(page.getByText(assignmentName, { exact: true })).toBeVisible({
        timeout: 15_000,
      });
      const completion = page.getByRole("checkbox", {
        name: `Mark ${assignmentName} as complete`,
      });
      await completion.click();
      await expect(
        page.getByRole("checkbox", {
          name: `Mark ${assignmentName} as incomplete`,
        }),
      ).toBeChecked();

      await page
        .getByRole("button", { name: `Edit ${assignmentName}` })
        .click();
      await page.getByLabel("Assignment Title").fill(updatedName);
      await page.getByRole("button", { name: "Update Assignment" }).click();
      await expect(page.getByText(updatedName, { exact: true })).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: `Delete ${updatedName}` }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
    } finally {
      if (courseCreated) await deleteCourseIfPresent(page, courseName);
    }
  });

  test("autosaves and reloads a note before deleting it", async ({ page }) => {
    const noteTitle = uniqueName("E2E Note");
    const noteContent =
      "This note verifies persistence across navigation and a full browser refresh.";
    let noteCreated = false;

    try {
      await signIn(page);
      await page.goto("/notebook");
      await page.getByRole("button", { name: "Create Note" }).first().click();
      await page.getByPlaceholder("Untitled Note").fill(noteTitle);
      await page.getByPlaceholder("Start writing your note here...").fill(noteContent);
      await page
        .getByPlaceholder("Enter tags separated by commas")
        .fill("e2e, autosave");
      await page.getByRole("button", { name: "Save" }).click();

      await expect(page).toHaveURL(/\/notebook\/note\/[0-9a-f-]+$/, {
        timeout: 15_000,
      });
      await expect(page.getByText(/Last saved:/)).toBeVisible();
      noteCreated = true;

      await page.reload();
      await expect(page.getByPlaceholder("Untitled Note")).toHaveValue(noteTitle);
      await expect(
        page.getByPlaceholder("Start writing your note here..."),
      ).toHaveValue(noteContent);

      await page.getByRole("button", { name: "Back to Notebook" }).click();
      await expect(page.getByText(noteTitle, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: `Delete ${noteTitle}` }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByText(noteTitle, { exact: true })).toHaveCount(0);
      noteCreated = false;
    } finally {
      if (noteCreated) {
        await page.goto("/notebook");
        const deleteButton = page.getByRole("button", {
          name: `Delete ${noteTitle}`,
        });
        if (await deleteButton.count()) {
          await deleteButton.click();
          await page
            .getByRole("alertdialog")
            .getByRole("button", { name: "Delete", exact: true })
            .click();
        }
      }
    }
  });

  test("uploads, opens, and deletes a private course material", async ({
    page,
  }) => {
    const courseName = uniqueName("E2E Material Course");
    const materialTitle = uniqueName("E2E Material");
    let courseCreated = false;

    try {
      await signIn(page);
      await createCourse(page, courseName);
      courseCreated = true;
      await page.getByText(courseName, { exact: true }).click();
      await page.getByRole("button", { name: "Add Material" }).first().click();
      await page.getByLabel("Select File").setInputFiles({
        name: "studyup-e2e-material.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Private StudyUp E2E material"),
      });
      await page.getByLabel("Title").fill(materialTitle);
      await page.getByRole("button", { name: "Upload", exact: true }).click();

      await expect(page.getByText(materialTitle, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole("button", { name: `View ${materialTitle}` }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: `Download ${materialTitle}` }),
      ).toBeEnabled();

      const downloadPromise = page.waitForEvent("download");
      await page
        .getByRole("button", { name: `Download ${materialTitle}` })
        .click();
      const download = await downloadPromise;
      expect((await readDownload(download)).toString("utf8")).toBe(
        "Private StudyUp E2E material",
      );

      await page.getByRole("button", { name: `Delete ${materialTitle}` }).click();
      await expect(page.getByText(materialTitle, { exact: true })).toHaveCount(0);
    } finally {
      if (courseCreated) await deleteCourseIfPresent(page, courseName);
    }
  });

  test("keeps one user's courses isolated from a second user", async ({
    page,
  }) => {
    test.skip(
      !hasIsolationConfiguration,
      "Set both E2E_SECONDARY_EMAIL and E2E_SECONDARY_PASSWORD for cross-user isolation.",
    );
    const courseName = uniqueName("E2E Private Course");
    let courseCreated = false;

    try {
      await signIn(page);
      await createCourse(page, courseName);
      courseCreated = true;
      await signOut(page);

      await signIn(page, secondaryEmail!, secondaryPassword!);
      await page.goto("/courses");
      await expect(page.getByText(courseName, { exact: true })).toHaveCount(0);
      await signOut(page);

      await signIn(page);
      await expect(page.getByText(courseName, { exact: true })).toBeVisible();
    } finally {
      if (courseCreated) {
        await page.goto("/dashboard");
        const userMenu = page.getByRole("button", { name: "Open user menu" });
        if (await userMenu.count()) await signOut(page);
        await signIn(page);
        await deleteCourseIfPresent(page, courseName);
      }
    }
  });

  test("planner week controls are keyboard-operable", async ({ page }) => {
    await signIn(page);
    await page.goto("/planner");

    const previousWeek = page.getByRole("button", { name: "Previous week" });
    const nextWeek = page.getByRole("button", { name: "Next week" });
    await expect(previousWeek).toBeVisible();
    await expect(nextWeek).toBeVisible();
    await nextWeek.focus();
    await page.keyboard.press("Enter");
    await expect(nextWeek).toBeFocused();
    await previousWeek.focus();
    await page.keyboard.press("Enter");
    await expect(previousWeek).toBeFocused();

    const firstSlot = page
      .getByRole("button", { name: /Sunday, .*, 12 AM/ })
      .first();
    await firstSlot.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: /Monday, .*, 12 AM/ }).first(),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Create event for selected time" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Study Session" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Create event for selected time" }),
    ).toHaveCount(0);
  });

  test("Gemini tutor honors the browser-to-function response contract", async ({
    page,
  }) => {
    await signIn(page);
    let capturedBody: unknown;
    let authorization: string | undefined;
    await page.route("**/functions/v1/chat-with-gemini", async (route) => {
      const request = route.request();
      capturedBody = request.postDataJSON();
      authorization = request.headers().authorization;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          response: "STUDYUP_CONTRACT_OK",
          model: "deterministic-test-provider",
        }),
      });
    });
    await page.goto("/ai-tutor");

    await page
      .getByPlaceholder(/Ask your AI tutor/)
      .fill("Explain the chain rule.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(
      page.getByText("STUDYUP_CONTRACT_OK", { exact: true }),
    ).toBeVisible();
    expect(capturedBody).toMatchObject({ message: "Explain the chain rule." });
    expect(authorization).toMatch(/^Bearer /);
  });

  test("@gemini Gemini tutor returns a live model response", async ({ page }) => {
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
