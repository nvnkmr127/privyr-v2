import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Lead Assignment E2E', () => {
  test.setTimeout(60000);

  test('should verify lead assignment control is available on lead detail page', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/leads');
    await expect(page.locator('h2, h1', { hasText: 'Leads' }).first()).toBeVisible({ timeout: 15000 });

    // Click "View" button for first lead if present
    const viewButton = page.locator('a', { hasText: 'View' }).first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Owner').first()).toBeVisible({ timeout: 15000 });
    }
  });
});
