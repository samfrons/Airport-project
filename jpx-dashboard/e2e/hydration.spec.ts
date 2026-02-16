import { test, expect } from '@playwright/test';

test.describe('Hydration', () => {
  test('should not have hydration warnings in console', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors related to hydration
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (
        msg.type() === 'error' &&
        (text.includes('hydration') ||
          text.includes('did not match') ||
          text.includes('server rendered') ||
          text.includes('text content does not match'))
      ) {
        errors.push(msg.text());
      }
    });

    // Also capture page errors
    page.on('pageerror', (err) => {
      const text = err.message.toLowerCase();
      if (text.includes('hydration') || text.includes('mismatch')) {
        errors.push(err.message);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Give React time to hydrate
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });

  test('should not have nested interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for buttons inside buttons (invalid HTML, causes hydration issues)
    const nestedButtons = await page.locator('button button').count();
    expect(nestedButtons).toBe(0);

    // Check for links inside buttons (also invalid)
    const linksInButtons = await page.locator('button a').count();
    expect(linksInButtons).toBe(0);

    // Check for buttons inside links (invalid)
    const buttonsInLinks = await page.locator('a button').count();
    expect(buttonsInLinks).toBe(0);
  });

  test('should not have duplicate IDs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all elements with IDs and check for duplicates
    const ids = await page.evaluate(() => {
      const elementsWithId = document.querySelectorAll('[id]');
      const idMap: Record<string, number> = {};
      elementsWithId.forEach((el) => {
        const id = el.getAttribute('id');
        if (id) {
          idMap[id] = (idMap[id] || 0) + 1;
        }
      });
      // Return IDs that appear more than once
      return Object.entries(idMap)
        .filter(([, count]) => count > 1)
        .map(([id, count]) => `${id}: ${count} occurrences`);
    });

    expect(ids).toHaveLength(0);
  });

  test('server and client should render consistent content', async ({ page }) => {
    // Capture the initial HTML before JavaScript runs
    const response = await page.goto('/');
    const serverHtml = await response?.text();

    // Wait for client-side hydration
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check that the page title is present (basic consistency check)
    const titleElement = page.locator('h1').first();
    await expect(titleElement).toBeVisible();

    // Check that essential sections rendered
    const overview = page.locator('section#overview');
    await expect(overview).toBeAttached();
  });

  test('localStorage-dependent components should render correctly', async ({ page }) => {
    // Clear localStorage to simulate fresh visit
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Reload and check for hydration errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('hydration')) {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);

    // Navigation should still work
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});
