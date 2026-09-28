import { expect, test } from '@playwright/test';

test('resident community surfaces keep the light appearance', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  const navigation = (page.viewportSize()?.width ?? 0) <= 760 ? '.bottom-nav' : '.sidebar';

  await page.locator(`${navigation} a[href="/missions"]`).click();
  await expect(page.getByRole('heading', { name: 'Городские миссии' })).toBeVisible();

  await page.locator(`${navigation} a[href="/profile"]`).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Анна Соколова' })).toBeVisible();

  await page.locator('.topbar__notification').click();
  await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible();

  await page.locator(`${navigation} a[href="/profile"]`).click({ force: true });
  await page.getByRole('link', { name: 'Настройки уведомлений', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.getByRole('button', { name: 'Тёмная', exact: true })).toHaveCount(0);
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light only');

  const mapLink = page.locator(`${navigation} a[href="/map"]`);
  const box = await mapLink.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(page.getByRole('heading', { name: 'Сигналы рядом' })).toBeVisible();
  await page.getByRole('button', { name: /Проверить результат/ }).click();
  await expect(page.locator('.problem-card').first()).toBeVisible();
  await page.locator('.problem-link').first().click();
  await expect(page.getByRole('heading', { name: 'Проверьте результат' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
