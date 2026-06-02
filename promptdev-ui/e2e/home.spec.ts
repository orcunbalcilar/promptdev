import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("renders header with logo and navigation", async ({ page }) => {
    await page.goto("/");

    // Header branding
    await expect(page.getByText("PromptDev")).toBeVisible();
    await expect(page.getByText("AI Development Platform")).toBeVisible();

    // Navigation buttons
    await expect(page.getByRole("button", { name: /Jobs/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Monitor/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Copilot/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Settings/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Refresh/ })).toBeVisible();
  });

  test("renders dashboard content or error state without crashing", async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (error) => jsErrors.push(error.message));

    await page.goto("/");
    await page.waitForTimeout(3000);

    // Should show either the kanban board, empty state, or error state
    const hasKanban = await page
      .locator(".kanban-column")
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText("No tasks yet")
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .getByText("Failed to load tasks")
      .isVisible()
      .catch(() => false);
    const hasLoading = await page
      .locator(".animate-spin")
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasKanban || hasEmptyState || hasError || hasLoading).toBe(true);
    expect(jsErrors).toEqual([]);
  });

  test("no snow overlay is rendered", async ({ page }) => {
    await page.goto("/");
    // Snow feature was removed — verify no overlay exists
    const snowOverlay = page.locator(".snow-overlay");
    await expect(snowOverlay).toHaveCount(0);
  });

  test("page has no JavaScript errors on load", async ({ page }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (error) => jsErrors.push(error.message));

    await page.goto("/");
    await page.waitForTimeout(3000);

    expect(jsErrors).toEqual([]);
  });

  test("header navigation links work", async ({ page }) => {
    await page.goto("/");

    // Click Jobs and verify navigation
    await page.getByRole("button", { name: /Jobs/ }).click();
    await expect(page).toHaveURL(/scheduled-jobs/);

    // Go back and click Monitor
    await page.goto("/");
    await page.getByRole("button", { name: /Monitor/ }).click();
    await expect(page).toHaveURL(/monitoring/);

    // Go back and click Copilot
    await page.goto("/");
    await page.getByRole("button", { name: /Copilot/ }).click();
    await expect(page).toHaveURL(/copilot/);

    // Go back and click Settings
    await page.goto("/");
    await page.getByRole("button", { name: /Settings/ }).click();
    await expect(page).toHaveURL(/settings/);
  });
});
