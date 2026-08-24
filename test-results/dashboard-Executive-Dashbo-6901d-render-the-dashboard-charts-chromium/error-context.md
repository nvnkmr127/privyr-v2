# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Executive Dashboard >> should render the dashboard charts
- Location: e2e/dashboard.spec.ts:9:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2').filter({ hasText: 'Executive Dashboard' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('h2').filter({ hasText: 'Executive Dashboard' })

```

```yaml
- main:
  - img "Next.js logo"
  - list:
    - listitem:
      - text: Get started by editing
      - code: src/app/page.tsx
      - text: .
    - listitem: Save and see your changes instantly.
  - link "Vercel logomark Deploy now":
    - /url: https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app
    - img "Vercel logomark"
    - text: Deploy now
  - link "Read our docs":
    - /url: https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app
- contentinfo:
  - link "Learn":
    - /url: https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app
  - link "Examples":
    - /url: https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app
  - link "Go to nextjs.org →":
    - /url: https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app
- status:
  - img
  - text: Static route
  - button "Hide static indicator":
    - img
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Executive Dashboard', () => {
  4  |   // Since we require auth, we'll bypass it for this simple E2E test by mocking the requireAuth function 
  5  |   // or testing a public route. 
  6  |   // For the sake of this test to verify the UI structure, we will assume a dev environment
  7  |   // where the auth middleware is either mocked or we test the visual rendering explicitly.
  8  |   
  9  |   test('should render the dashboard charts', async ({ page }) => {
  10 |     // Navigate to the dashboard
  11 |     await page.goto('/');
  12 | 
  13 |     // Check for the main heading
> 14 |     await expect(page.locator('h2', { hasText: 'Executive Dashboard' })).toBeVisible({ timeout: 10000 });
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  15 | 
  16 |     // Check for the Revenue by Source chart container
  17 |     await expect(page.locator('h3', { hasText: 'Revenue by Source' })).toBeVisible();
  18 |     
  19 |     // Check for the Pipeline Distribution chart container
  20 |     await expect(page.locator('h3', { hasText: 'Pipeline Distribution' })).toBeVisible();
  21 | 
  22 |     // Verify the Recharts containers render (Recharts uses specific classnames we can look for, or just check SVG)
  23 |     const charts = page.locator('.recharts-responsive-container');
  24 |     await expect(charts).toHaveCount(2);
  25 |   });
  26 | });
  27 | 
```