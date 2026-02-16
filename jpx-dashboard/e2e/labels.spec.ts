import { test, expect } from '@playwright/test';

test.describe('Label Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('"Overview" should appear, not "Statistics"', async ({ page }) => {
    // Nav should have Overview
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();

    // Should NOT have Statistics in nav
    await expect(page.getByRole('button', { name: 'Statistics' })).not.toBeVisible();

    // Section header should be Overview
    await expect(page.locator('section#overview h2')).toContainText('Overview');
  });

  test('no "Wildlife" text should appear anywhere on page', async ({ page }) => {
    const pageText = await page.textContent('body');

    // Wildlife should not appear
    expect(pageText?.toLowerCase()).not.toContain('wildlife');
  });

  test('no old curfew times (8 PM/8 AM) in curfew context', async ({ page }) => {
    // Navigate through sections to ensure full page is loaded
    await page.getByRole('button', { name: 'Curfew Compliance' }).click();
    await page.waitForTimeout(500);

    // Check for absence of old times
    await expect(page.getByText('8 PM - 8 AM')).not.toBeVisible();
    await expect(page.getByText('8p-8a')).not.toBeVisible();

    // Check for presence of new times
    await expect(page.getByText('9 PM – 7 AM ET').first()).toBeVisible();
  });

  test('nav items should NOT include removed sections', async ({ page }) => {
    const nav = page.locator('nav');

    // These should NOT be in nav
    await expect(nav.getByText('Weather Correlation')).not.toBeVisible();
    await expect(nav.getByText('Biodiversity')).not.toBeVisible();
    await expect(nav.getByText('Flight Log')).not.toBeVisible();
    await expect(nav.getByText('Thresholds')).not.toBeVisible();
    await expect(nav.getByText('Alerts')).not.toBeVisible();
  });

  test('section headers should match nav labels exactly', async ({ page }) => {
    const navLabels = [
      { nav: 'Overview', section: 'overview' },
      { nav: 'Operations', section: 'operations' },
      { nav: 'Aircraft & Operators', section: 'aircraft-operators' },
      { nav: 'Curfew Compliance', section: 'curfew-compliance' },
      { nav: 'Flight Map', section: 'flight-map' },
      { nav: 'Noise & Impact', section: 'noise-impact' },
      { nav: 'Complaints', section: 'complaints' },
    ];

    for (const { nav, section } of navLabels) {
      const sectionHeader = page.locator(`section#${section} h2`);
      await expect(sectionHeader).toContainText(nav);
    }
  });
});
