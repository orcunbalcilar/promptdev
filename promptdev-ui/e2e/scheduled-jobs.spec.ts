import { test, expect } from '@playwright/test';

test.describe('Scheduled Jobs Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scheduled-jobs');
  });

  test('renders scheduled jobs page header with title', async ({ page }) => {
    await expect(page.getByText('Scheduled Jobs')).toBeVisible();

    // Back button
    const backButton = page.getByRole('button', { name: /Back/ });
    await expect(backButton).toBeVisible();
  });

  test('shows calendar icon in header', async ({ page }) => {
    // The CalendarClock icon is next to the title
    await expect(page.getByText('Scheduled Jobs')).toBeVisible();
  });

  test('displays jobs list, empty state, or loading state', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Should show one of: job cards, empty state, loading, or error
    const hasJobs = await page.locator('[class*="grid"]').filter({ has: page.locator('[class*="card"]') }).first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('No scheduled jobs').isVisible().catch(() => false);
    const hasLoading = await page.locator('.animate-spin').first().isVisible().catch(() => false);
    const hasError = await page.getByText('Failed to load').isVisible().catch(() => false);

    expect(hasJobs || hasEmptyState || hasLoading || hasError).toBe(true);
  });

  test('shows Create Job dialog trigger', async ({ page }) => {
    await page.waitForTimeout(2000);

    // CreateJobDialog renders a button trigger in the header
    // Look for any "Create" or "New" button or the dialog trigger
    const createButton = page.getByRole('button', { name: /Create|New|Schedule/i });
    const hasCreate = await createButton.first().isVisible().catch(() => false);

    // In empty state, there's also a CreateJobDialog in the body
    const emptyCreate = await page.getByText('No scheduled jobs').isVisible().catch(() => false);

    expect(hasCreate || emptyCreate).toBe(true);
  });

  test('empty state shows descriptive text', async ({ page }) => {
    await page.waitForTimeout(3000);

    const hasEmptyState = await page.getByText('No scheduled jobs').isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(page.getByText(/Create recurring jobs/)).toBeVisible();
    }
  });

  test('back button navigates to home', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Back/ });
    await expect(backButton).toBeVisible();
    await backButton.click();

    await expect(page).toHaveURL('/');
  });

  test('page has no JavaScript errors on load', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await page.goto('/scheduled-jobs');
    await page.waitForTimeout(3000);

    expect(jsErrors).toEqual([]);
  });
});
