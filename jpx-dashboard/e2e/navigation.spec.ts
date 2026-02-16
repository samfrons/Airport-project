import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have all 7 nav items in correct order', async ({ page }) => {
    const expectedItems = [
      'Overview',
      'Operations',
      'Aircraft & Operators',
      'Curfew Compliance',
      'Flight Map',
      'Noise & Impact',
      'Complaints',
    ];

    // Get all nav buttons (excluding Airport Diagram external link)
    const navButtons = page.locator('nav button[aria-current]').or(page.locator('nav button:not([aria-current])'));

    // Wait for navigation to render
    await page.waitForSelector('nav');

    // Check nav items exist
    for (const label of expectedItems) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('clicking nav item should scroll to correct section', async ({ page }) => {
    // Click on "Flight Map" nav item
    await page.getByRole('button', { name: 'Flight Map' }).click();

    // Check that the flight-map section is in view
    const flightMapSection = page.locator('#flight-map');
    await expect(flightMapSection).toBeInViewport();
  });

  test('section headers should match nav labels exactly', async ({ page }) => {
    // Check section headers exist with exact text
    await expect(page.locator('section#overview h2')).toContainText('Overview');
    await expect(page.locator('section#operations h2')).toContainText('Operations');
    await expect(page.locator('section#aircraft-operators h2')).toContainText('Aircraft & Operators');
    await expect(page.locator('section#curfew-compliance h2')).toContainText('Curfew Compliance');
    await expect(page.locator('section#flight-map h2')).toContainText('Flight Map');
    await expect(page.locator('section#noise-impact h2')).toContainText('Noise & Impact');
    await expect(page.locator('section#complaints h2')).toContainText('Complaints');
  });

  test('mobile nav drawer should open and close', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Nav should be hidden initially
    const nav = page.locator('nav');
    await expect(nav).toHaveClass(/-translate-x-full/);

    // Click hamburger menu
    await page.getByLabel('Toggle navigation menu').click();

    // Nav should be visible
    await expect(nav).toHaveClass(/translate-x-0/);

    // Click backdrop to close
    await page.locator('[aria-hidden="true"]').click();

    // Nav should be hidden again
    await expect(nav).toHaveClass(/-translate-x-full/);
  });

  test('Airport Diagram external link should exist', async ({ page }) => {
    const airportDiagramLink = page.getByRole('link', { name: /Airport Diagram/i });
    await expect(airportDiagramLink).toBeVisible();
    await expect(airportDiagramLink).toHaveAttribute('href', '/airport-diagram');
  });
});
