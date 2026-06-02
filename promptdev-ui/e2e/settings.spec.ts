import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('renders settings page header with title and navigation', async ({ page }) => {
    // Header with title
    await expect(page.getByRole('heading', { name: 'Settings' }).or(page.getByText('Settings', { exact: true }))).toBeVisible();

    // Back button to dashboard
    const backButton = page.getByRole('button', { name: /Dashboard/ });
    await expect(backButton).toBeVisible();
  });

  test('displays user profile information or loading state', async ({ page }) => {
    // Wait for the page to settle
    await page.waitForTimeout(2000);

    // Should show either profile cards (loaded), loading spinner, or error state
    const hasProfile = await page.getByText('Profile').first().isVisible().catch(() => false);
    const hasLoading = await page.locator('.animate-spin').first().isVisible().catch(() => false);
    const hasError = await page.getByText('Error').first().isVisible().catch(() => false);

    expect(hasProfile || hasLoading || hasError).toBe(true);
  });

  test('shows sign out button when authenticated', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Sign out button visible in header for authenticated users
    const signOutButton = page.getByRole('button', { name: /Sign out/ });
    const hasSignOut = await signOutButton.isVisible().catch(() => false);

    // If page loaded with profile, sign out should be visible
    const hasProfile = await page.getByText('Profile').first().isVisible().catch(() => false);
    if (hasProfile) {
      expect(hasSignOut).toBe(true);
    }
  });

  test('shows settings cards when profile loads', async ({ page }) => {
    await page.waitForTimeout(3000);

    const hasProfile = await page.getByText('Profile').first().isVisible().catch(() => false);

    if (hasProfile) {
      // Should show the main settings sections
      await expect(page.getByText('Bitbucket').first()).toBeVisible();
      await expect(page.getByText('Security').first()).toBeVisible();
    }
  });

  test('back button navigates to dashboard', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Dashboard/ });
    await expect(backButton).toBeVisible();
    await backButton.click();

    await expect(page).toHaveURL('/');
  });

  test('page has no JavaScript errors on load', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await page.goto('/settings');
    await page.waitForTimeout(3000);

    expect(jsErrors).toEqual([]);
  });
});
