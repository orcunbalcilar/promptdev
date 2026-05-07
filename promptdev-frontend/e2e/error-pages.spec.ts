import { test, expect } from '@playwright/test';

test.describe('Error Pages', () => {
  test('displays 404 page for non-existent route', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');

    // Should show the not-found page content
    await expect(page.getByText('Page Not Found').or(page.getByText('Not Found'))).toBeVisible({ timeout: 10000 });
  });

  test('404 page shows return to dashboard link', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');

    // Should have a link back to dashboard
    const dashboardLink = page.getByRole('link', { name: /Return to Dashboard|Dashboard/i });
    await expect(dashboardLink).toBeVisible({ timeout: 10000 });
  });

  test('404 page dashboard link navigates home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');

    const dashboardLink = page.getByRole('link', { name: /Return to Dashboard|Dashboard/i });
    await expect(dashboardLink).toBeVisible({ timeout: 10000 });
    await dashboardLink.click();

    await expect(page).toHaveURL('/');
  });

  test('404 page has no JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await page.goto('/this-route-does-not-exist-12345');
    await page.waitForTimeout(3000);

    expect(jsErrors).toEqual([]);
  });
});
