import { test, expect } from '@playwright/test';
const zones = [
  { id: 'Asia/Kolkata', name: 'Kolkata' },
  { id: 'America/New_York', name: 'New York' },
  { id: 'Pacific/Auckland', name: 'Auckland' },
];
for (const z of zones) {
  test(`book -> remind -> cancel in ${z.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: z.id });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000');
    await expect(page.getByRole('main')).toBeVisible();
    await page.goto('http://localhost:3000/book');
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();
    await page.goto('http://localhost:3000/bookings');
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await ctx.close();
  });
}
