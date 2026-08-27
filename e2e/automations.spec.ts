import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Automations E2E', () => {
  test.setTimeout(60000);

  test('should authenticate and view automations list', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/automations');

    await expect(page.locator('h1, h2', { hasText: /Automations/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
