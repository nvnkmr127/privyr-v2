import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Pipeline Kanban E2E', () => {
  test.setTimeout(60000);

  test('should authenticate and load Kanban board', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/leads/kanban');

    // Verify main heading or container
    await expect(page.locator('h1, h2', { hasText: /Kanban|Pipeline/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
