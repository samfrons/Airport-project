import { test, expect } from '@playwright/test';

test.describe('Summary Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for stats cards to load
    await page.waitForSelector('section#overview');
  });

  test('should display 4 correct summary cards', async ({ page }) => {
    const overviewSection = page.locator('section#overview');

    // Check for new card labels
    await expect(overviewSection.getByText('Total Operations')).toBeVisible();
    await expect(overviewSection.getByText('Helicopter Operations')).toBeVisible();
    await expect(overviewSection.getByText('Curfew Violations')).toBeVisible();
    await expect(overviewSection.getByText('Noise Index')).toBeVisible();
  });

  test('should NOT display old card labels', async ({ page }) => {
    const overviewSection = page.locator('section#overview');

    // These should NOT exist
    await expect(overviewSection.getByText('Unique Aircraft')).not.toBeVisible();
    await expect(overviewSection.getByText('Wildlife Violations')).not.toBeVisible();
    await expect(overviewSection.getByText('Curfew Period')).not.toBeVisible();
  });

  test('card values should be numbers (not NaN or undefined)', async ({ page }) => {
    const statNumbers = page.locator('section#overview .stat-number');
    const count = await statNumbers.count();

    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const text = await statNumbers.nth(i).textContent();
      expect(text).toBeDefined();
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
      // Should be a valid number
      expect(Number.isInteger(parseInt(text || '', 10))).toBe(true);
    }
  });

  test('curfew violations card should show correct time window', async ({ page }) => {
    const overviewSection = page.locator('section#overview');

    // Should show new curfew time
    await expect(overviewSection.getByText('9 PM – 7 AM ET')).toBeVisible();

    // Should NOT show old curfew time
    await expect(overviewSection.getByText('8 PM - 8 AM')).not.toBeVisible();
  });
});
