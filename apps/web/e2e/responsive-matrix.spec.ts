import { expect, test } from '@playwright/test';

const widths = [360, 390, 768, 1024, 1280, 1440, 1920];

test('resident register has no page overflow across the required viewport matrix', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сигналы рядом' })).toBeVisible();

  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await expect(page.getByText('Демонстрационные данные')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    if (width <= 760) await expect(page.getByRole('button', { name: 'Список' })).toBeVisible();
  }
});
