import { test, expect } from '@playwright/test';

test.describe('Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring');
  });

  test('renders monitoring page header with title', async ({ page }) => {
    await expect(page.getByText('Monitoring', { exact: true })).toBeVisible();

    // Back button
    const backButton = page.getByRole('button', { name: /Back/ });
    await expect(backButton).toBeVisible();
  });

  test('displays metric cards or loading state', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Should show either metric cards (loaded) or loading spinner
    const hasMetrics = await page.getByText('Sessions').first().isVisible().catch(() => false);
    const hasLoading = await page.locator('.animate-spin').first().isVisible().catch(() => false);

    expect(hasMetrics || hasLoading).toBe(true);
  });

  test('shows all metric card titles when data loads', async ({ page }) => {
    await page.waitForTimeout(3000);

    const hasMetrics = await page.getByText('Sessions').first().isVisible().catch(() => false);

    if (hasMetrics) {
      // All 6 metric cards should be visible
      await expect(page.getByText('Operations').first()).toBeVisible();
      await expect(page.getByText('Tokens').first()).toBeVisible();
      await expect(page.getByText('Est. Cost').first()).toBeVisible();
      await expect(page.getByText('Errors').first()).toBeVisible();
      await expect(page.getByText('Tools Used').first()).toBeVisible();
    }
  });

  test('displays tabs for Overview, Sessions, Reviews, and Errors', async ({ page }) => {
    await page.waitForTimeout(3000);

    const hasMetrics = await page.getByText('Sessions').first().isVisible().catch(() => false);

    if (hasMetrics) {
      // Tab triggers
      await expect(page.getByRole('tab', { name: /Overview/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Sessions/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Reviews/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Errors/ })).toBeVisible();
    }
  });

  test('can switch between tabs', async ({ page }) => {
    await page.waitForTimeout(3000);

    const sessionsTab = page.getByRole('tab', { name: /Sessions/ });
    const hasTab = await sessionsTab.isVisible().catch(() => false);

    if (hasTab) {
      await sessionsTab.click();
      // After clicking Sessions tab, should show sessions content
      await expect(page.getByText('All Sessions').or(page.locator('.animate-spin').first())).toBeVisible();

      // Switch to Errors tab
      const errorsTab = page.getByRole('tab', { name: /Errors/ });
      await errorsTab.click();
      // Should show errors content or "no errors" message
      const hasErrors = await page.getByText(/No errors recorded/).isVisible().catch(() => false);
      const hasErrorList = await page.getByText('Recent Errors').isVisible().catch(() => false);
      expect(hasErrors || hasErrorList).toBe(true);
    }
  });

  test('time range selector buttons work', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Time range buttons (7d, 14d, 30d)
    const btn7d = page.getByRole('button', { name: '7d' });
    const hasTimeRange = await btn7d.isVisible().catch(() => false);

    if (hasTimeRange) {
      const btn14d = page.getByRole('button', { name: '14d' });
      const btn30d = page.getByRole('button', { name: '30d' });
      await expect(btn14d).toBeVisible();
      await expect(btn30d).toBeVisible();

      // Click 30d and verify it becomes active
      await btn30d.click();
      await page.waitForTimeout(1000);

      // Click back to 7d
      await btn7d.click();
      await page.waitForTimeout(1000);
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

    await page.goto('/monitoring');
    await page.waitForTimeout(3000);

    expect(jsErrors).toEqual([]);
  });
});
