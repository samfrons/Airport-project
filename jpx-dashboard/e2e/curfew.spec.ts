import { test, expect } from '@playwright/test';

test.describe('Curfew Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForSelector('section#curfew-compliance');
  });

  test('curfew section header should show correct time', async ({ page }) => {
    const section = page.locator('section#curfew-compliance');
    await expect(section.getByText('9 PM – 7 AM ET')).toBeVisible();
  });

  test('curfew chart should show correct legend time', async ({ page }) => {
    // Navigate to operations section where curfew chart is
    await page.getByRole('button', { name: 'Operations' }).click();

    // Check chart legend
    await expect(page.getByText('Curfew 9p–7a')).toBeVisible();

    // Should NOT show old curfew time
    await expect(page.getByText('Curfew 8p-8a')).not.toBeVisible();
  });

  test('curfew violators table should have correct columns', async ({ page }) => {
    await page.getByRole('button', { name: 'Curfew Compliance' }).click();

    // Check table headers exist
    await expect(page.getByRole('columnheader', { name: 'Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Tail #' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Operator' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('no "8 PM" or "8 AM" text should exist in curfew context', async ({ page }) => {
    // Check the entire page for old curfew times
    const pageText = await page.textContent('body');

    // Should not contain old curfew hours in curfew-related context
    // Note: 8 might appear in other contexts (dates, etc), so we check specific patterns
    expect(pageText).not.toContain('8 PM - 8 AM');
    expect(pageText).not.toContain('8p-8a');
    expect(pageText).not.toContain('Curfew 8');
  });
});
