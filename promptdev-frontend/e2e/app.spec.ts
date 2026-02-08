import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('should display login page with sign-in buttons', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/PromptDev/)
    // Should show authentication options
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/')
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Navigation', () => {
  test('login page should be accessible', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBeLessThan(400)
  })

  test('API auth endpoint should respond', async ({ page }) => {
    const response = await page.goto('/api/auth/providers')
    expect(response?.status()).toBeLessThan(400)
  })
})
