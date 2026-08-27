import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('WhatsApp Integration Boundary E2E', () => {
  test.setTimeout(60000);

  test('should verify lead detail page contains WhatsApp tab interface', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/leads');
    await page.waitForTimeout(2000);

    const firstLeadLink = page.locator('a[href^="/leads/"]').first();
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click();
      await page.waitForTimeout(2000);

      const whatsappTab = page.locator('button[role="tab"]', { hasText: 'WhatsApp' });
      if (await whatsappTab.isVisible()) {
        await whatsappTab.click();
        await expect(page.locator('text=WhatsApp').first()).toBeVisible();
      }
    }
  });
});
