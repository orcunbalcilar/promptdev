import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  // Click the dev credentials button
  const devLoginButton = page.getByRole('button', { name: 'Sign in as Test User' });
  await expect(devLoginButton).toBeVisible();
  await devLoginButton.click();

  // Wait for redirect to home page after login
  await page.waitForURL('/');

  // Verify session cookie exists
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(
    (c) => c.name.includes('authjs.session-token') || c.name.includes('next-auth.session-token'),
  );
  expect(sessionCookie).toBeDefined();

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
