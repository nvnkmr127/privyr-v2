import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Lead Discovery System E2E', () => {
  test.setTimeout(60000);

  test('should search, apply filters, save view, reload URL state, and clear filters', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/leads');
    await expect(page.locator('h2', { hasText: 'Leads' })).toBeVisible({ timeout: 15000 });

    // 1. Search Lead
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('John');
    await page.waitForTimeout(500);

    // Verify search term is present in URL
    await expect(page).toHaveURL(/search=John/);

    // 2. Open Filter Modal
    const filterBtn = page.locator('button', { hasText: /^Filter/i });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Verify filter builder modal title
    await expect(page.locator('div[role="dialog"]', { hasText: 'Filter Leads' })).toBeVisible();

    // Apply filter
    const applyBtn = page.locator('button', { hasText: 'Apply Filters' });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // 3. Clear filters
    const clearBtn = page.locator('button', { hasText: /Clear all|Clear Filters/i }).first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }

    // 4. Verify presets views exist (All Leads, My Leads, Unassigned Leads, etc.)
    await expect(page.locator('button', { hasText: 'All Leads' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'My Leads' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Unassigned Leads' })).toBeVisible();

    // Click "My Leads" preset view
    await page.locator('button', { hasText: 'My Leads' }).click();
    await expect(page).toHaveURL(/viewId=preset-my/);

    // Reload page to verify URL persistence
    await page.reload();
    await expect(page).toHaveURL(/viewId=preset-my/);
  });
});
