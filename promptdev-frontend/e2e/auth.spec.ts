import { test, expect } from '@playwright/test';

// Auth tests need their own unauthenticated context, not the shared one from setup
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('should login with development credentials', async ({ page }) => {
    // Navigate to the custom login page
    await page.goto('/login');

    // Check if the development login button is visible
    const devLoginButton = page.getByRole('button', { name: 'Sign in as Test User' });
    await expect(devLoginButton).toBeVisible();
    
    // Click the sign in button (which automatically submits credentials)
    await devLoginButton.click();
    
    // Should redirect to home page (or callbackUrl)
    await page.waitForURL('/');
    
    // Verify we are logged in
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('authjs.session-token') || c.name.includes('next-auth.session-token'));
    expect(sessionCookie).toBeDefined();

    // Also verify we are NOT redirected back to login
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('should redirect to login when unauthenticated', async ({ page }) => {
    // Visit a protected route without auth
    await page.goto('/settings');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect away from login page if already authenticated', async ({ page }) => {
    // First login
    await page.goto('/login');
    const devLoginButton = page.getByRole('button', { name: 'Sign in as Test User' });
    await expect(devLoginButton).toBeVisible();
    await devLoginButton.click();
    await page.waitForURL('/');

    // Try to go to login page
    await page.goto('/login');
    
    // Should be redirected back to home (or callbackUrl default)
    await page.waitForURL('/');
    expect(page.url()).toBe('http://localhost:3000/');
  });
});
