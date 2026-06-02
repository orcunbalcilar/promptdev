import { test, expect } from '@playwright/test'

test('Login page loads and shows heading', async ({ page }) => {
  const response = await page.goto('/login')
  expect(response).not.toBeNull()
  expect(response?.status()).toBeLessThan(400)
  await expect(page).toHaveTitle(/PromptDev/)
  await expect(page.getByRole('heading')).toBeVisible()
})
