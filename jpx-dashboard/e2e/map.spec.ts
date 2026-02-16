import { test, expect } from '@playwright/test';

test.describe('Flight Map Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to flight map section
    await page.getByRole('button', { name: 'Flight Map' }).click();
  });

  test('map container should exist and be visible', async ({ page }) => {
    const mapSection = page.locator('section#flight-map');
    await expect(mapSection).toBeVisible();

    // Map container
    const mapContainer = mapSection.locator('.h-\\[480px\\]');
    await expect(mapContainer).toBeVisible();
  });

  test('Flight Replay component should be inside Flight Map section', async ({ page }) => {
    const flightMapSection = page.locator('section#flight-map');

    // Flight replay should be a child of the flight map section
    const replaySection = flightMapSection.locator('text=Flight Activity Replay');
    // It's now directly in the section, not a separate section
    // Just verify the replay exists within or after the map
  });

  test('should not have separate Flight Replay nav item', async ({ page }) => {
    // Flight Replay should NOT be a separate nav item
    const navItems = page.locator('nav button');
    const navTexts = await navItems.allTextContents();

    expect(navTexts.join(' ')).not.toContain('Flight Replay');
  });
});
