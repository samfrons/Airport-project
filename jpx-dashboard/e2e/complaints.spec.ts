import { test, expect } from '@playwright/test';

test.describe('Complaints Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to complaints section
    await page.getByRole('button', { name: 'Complaints' }).click();
  });

  test('File a Complaint button should be prominent and visible', async ({ page }) => {
    const complaintButton = page.getByRole('link', { name: /File a Complaint/i });

    await expect(complaintButton).toBeVisible();

    // Should have prominent styling (blue background)
    await expect(complaintButton).toHaveClass(/bg-blue-600/);
  });

  test('File a Complaint button should link to planenoise.com', async ({ page }) => {
    const complaintButton = page.getByRole('link', { name: /File a Complaint/i });

    await expect(complaintButton).toHaveAttribute('href', 'https://planenoise.com/khto/');
  });

  test('File a Complaint link should open in new tab', async ({ page }) => {
    const complaintButton = page.getByRole('link', { name: /File a Complaint/i });

    await expect(complaintButton).toHaveAttribute('target', '_blank');
    await expect(complaintButton).toHaveAttribute('rel', /noopener/);
  });

  test('complaints section should show explanatory text', async ({ page }) => {
    await expect(page.getByText('Report noise concerns to East Hampton Town')).toBeVisible();
    await expect(page.getByText('Opens planenoise.com in a new tab')).toBeVisible();
  });
});
