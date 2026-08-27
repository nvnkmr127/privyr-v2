import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Lead Core Lifecycle E2E', () => {
  test.setTimeout(60000);

  test('should authenticate and view lead management list page', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/leads');

    // Verify main heading (rendered as h2 in LeadsPage)
    await expect(page.locator('h2, h1', { hasText: 'Leads' }).first()).toBeVisible({ timeout: 15000 });
    
    // Verify Add Lead button or Import CSV button exists
    await expect(page.locator('button', { hasText: /Add Lead|Import CSV/i }).first()).toBeVisible();
  });
});
