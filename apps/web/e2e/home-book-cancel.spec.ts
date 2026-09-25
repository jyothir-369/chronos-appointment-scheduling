import { test, expect } from '@playwright/test';

test.describe('Chronos', () => {
  test('home loads with timezone info', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.getByRole('heading', { name: /timezone-safe/i })).toBeVisible();
  });
  test('book page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/book');
    await expect(page.getByRole('heading', { name: /book/i })).toBeVisible();
  });
  test('booking sends request and handles response', async ({ page }) => {
    await page.goto('http://localhost:3000/book');
    await page.getByRole('button', { name: /confirm booking/i }).click();
    await expect(page.getByRole('alert')).toContainText(/Booking confirmed|not available|changed/);
  });
});
