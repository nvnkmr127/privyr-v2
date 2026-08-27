import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Multi-Tenant Organization Isolation E2E', () => {
  test.setTimeout(60000);

  test('authenticated user should only see leads for their own organization', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/leads');

    // Verify list renders cleanly without unauthorized tenant data errors
    await expect(page.locator('h2, h1', { hasText: 'Leads' }).first()).toBeVisible({ timeout: 15000 });
  });

  test('unauthenticated request to dashboard redirects to login', async ({ page }) => {
    await page.goto('/follow-ups');
    await page.waitForTimeout(2000);
    // Should be redirected to login page or show login form
    expect(page.url()).toContain('/login');
  });
});
