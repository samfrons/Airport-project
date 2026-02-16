import { test, expect } from '@playwright/test';

test.describe('Hidden Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Weather Correlation section should not be visible', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForSelector('section#overview');

    // Weather section should not exist
    await expect(page.locator('section#weather')).not.toBeVisible();
    await expect(page.getByText('Weather Correlation').first()).not.toBeVisible();
  });

  test('Biodiversity section should not be in nav or page', async ({ page }) => {
    // Not in nav
    await expect(page.locator('nav').getByText('Biodiversity')).not.toBeVisible();

    // Not as a section
    await expect(page.locator('section#biodiversity')).not.toBeVisible();
  });

  test('Flight Log section should not be visible', async ({ page }) => {
    await expect(page.locator('section#flights')).not.toBeVisible();
    await expect(page.locator('nav').getByText('Flight Log')).not.toBeVisible();
  });

  test('Threshold and Alerts sections should not be in nav', async ({ page }) => {
    await expect(page.locator('nav').getByText('Thresholds')).not.toBeVisible();
    await expect(page.locator('nav').getByText('Alerts')).not.toBeVisible();
  });

  test('Noise & Impact section should show placeholder message', async ({ page }) => {
    await page.getByRole('button', { name: 'Noise & Impact' }).click();

    const noiseSection = page.locator('section#noise-impact');
    await expect(noiseSection).toBeVisible();

    // Should show placeholder text
    await expect(noiseSection.getByText(/Noise monitoring data will appear/i)).toBeVisible();
  });

  test('only 7 main sections should exist', async ({ page }) => {
    const sections = page.locator('main > section');
    const count = await sections.count();

    // Should have exactly 7 sections
    expect(count).toBe(7);

    // Verify the 7 sections are the correct ones
    const sectionIds = ['overview', 'operations', 'aircraft-operators', 'curfew-compliance', 'flight-map', 'noise-impact', 'complaints'];

    for (const id of sectionIds) {
      await expect(page.locator(`section#${id}`)).toBeVisible();
    }
  });
});
