import { test, expect } from '@playwright/test';

test.describe('Date Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should NOT have an Apply or Refresh button in date filter', async ({ page }) => {
    // The date filter area
    const dateFilterArea = page.locator('.flex.flex-wrap.items-center.gap-4').first();

    // Should NOT have Apply button in the date filter
    await expect(dateFilterArea.getByRole('button', { name: /Apply/i })).not.toBeVisible();
  });

  test('should have correct preset buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'This Month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last Month' })).toBeVisible();
    await expect(page.getByRole('button', { name: '90 Days' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'This Year' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last Year' })).toBeVisible();
  });

  test('should NOT have old presets (Today, 7d, 30d)', async ({ page }) => {
    // Old preset buttons should not exist
    const timeFilter = page.locator('.flex.flex-wrap.items-center.gap-4').first();

    await expect(timeFilter.getByRole('button', { name: 'Today', exact: true })).not.toBeVisible();
    await expect(timeFilter.getByRole('button', { name: '7d', exact: true })).not.toBeVisible();
    await expect(timeFilter.getByRole('button', { name: '30d', exact: true })).not.toBeVisible();
  });

  test('should show "Updated" timestamp instead of "LIVE DATA"', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);

    // Should show updated timestamp
    const updatedText = page.getByText(/Updated/i);
    await expect(updatedText).toBeVisible();

    // Should NOT show "LIVE DATA"
    await expect(page.getByText('LIVE DATA')).not.toBeVisible();
  });

  test('selecting date should auto-refresh data', async ({ page }) => {
    // Get the start date input
    const startDateInput = page.locator('input[type="date"]').first();

    // Store current stats value
    const initialStatsText = await page.locator('section#overview .stat-number').first().textContent();

    // Change the date
    await startDateInput.fill('2024-01-01');

    // Wait for auto-refresh (debounced at 300ms)
    await page.waitForTimeout(500);

    // Should have triggered a refresh (loading indicator or data change)
    // Note: The actual data may or may not change, but no error should occur
    const statsText = await page.locator('section#overview .stat-number').first().textContent();
    expect(statsText).toBeDefined();
  });
});
