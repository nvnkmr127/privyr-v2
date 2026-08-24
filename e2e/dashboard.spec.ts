import { test, expect } from '@playwright/test';

test.describe('Executive Dashboard', () => {
  // Since we require auth, we'll bypass it for this simple E2E test by mocking the requireAuth function 
  // or testing a public route. 
  // For the sake of this test to verify the UI structure, we will assume a dev environment
  // where the auth middleware is either mocked or we test the visual rendering explicitly.
  
  test('should render the dashboard charts', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');

    // Check for the main heading
    await expect(page.locator('h2', { hasText: 'Executive Dashboard' })).toBeVisible({ timeout: 10000 });

    // Check for the Revenue by Source chart container
    await expect(page.locator('h3', { hasText: 'Revenue by Source' })).toBeVisible();
    
    // Check for the Pipeline Distribution chart container
    await expect(page.locator('h3', { hasText: 'Pipeline Distribution' })).toBeVisible();

    // Verify the Recharts containers render (Recharts uses specific classnames we can look for, or just check SVG)
    const charts = page.locator('.recharts-responsive-container');
    await expect(charts).toHaveCount(2);
  });
});
