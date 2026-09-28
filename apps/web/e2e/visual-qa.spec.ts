import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, role: 'Житель' | 'Оператор' | 'Исполнитель' | 'Администратор') {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: role, exact: true }).click();
}

async function expectNoHorizontalPageScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('resident register, map state, filters and mobile sheet stay usable', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await loginAs(page, 'Житель');
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole('heading', { name: 'Сигналы рядом' })).toBeVisible();
  await expect(page.getByText('Демонстрационные данные')).toBeVisible();
  await expect(page.getByText(/VITE_DGIS_MAPS_API_KEY/)).toHaveCount(0);
  await expect(page.getByRole('application', { name: 'Карта городских сигналов 2ГИС' }).locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.map-loading')).toHaveCount(0, { timeout: 25_000 });
  await expect(page.getByText('Интерактивная карта временно недоступна')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('map-register.png'), fullPage: true });
  await expectNoHorizontalPageScroll(page);

  if ((page.viewportSize()?.width ?? 0) <= 760) await page.getByRole('button', { name: 'Список' }).click();
  await expect(page.locator('.register-row').first()).toBeVisible();
  await page.locator('.register-row').first().click();
  await expect(page.locator('.problem-sheet')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('selected-problem.png'), fullPage: true });

  await expect(page.locator('.map-preview__open')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Изменить высоту панели' })).toHaveCount(0);
  const preview = await page.locator('.problem-sheet').boundingBox();
  expect(preview!.height).toBeLessThan(page.viewportSize()!.height * .7);

  await page.locator('.problem-sheet__close').click();
  if ((page.viewportSize()?.width ?? 0) <= 760) await page.getByRole('button', { name: 'Список' }).click();
  await page.locator('.resident-register .filter-button').click();
  await expect(page.getByLabel('Категория')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('filters.png'), fullPage: true });
  if ((page.viewportSize()?.width ?? 0) > 760) await page.getByRole('button', { name: 'Список' }).click();
  await expect(page.locator('.resident-register')).toBeVisible();
});

test('resident create workflow is focused and keeps a recoverable map state', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await loginAs(page, 'Житель');
  const mobile = (page.viewportSize()?.width ?? 0) <= 760;
  await page.getByRole('link', { name: mobile ? 'Сообщить' : 'Создать', exact: true }).click();
  await expect(page.getByText('Новое обращение')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Этапы обращения' })).toBeVisible();
  await expect(page.getByRole('application', { name: 'Выбор точки проблемы на карте 2ГИС' }).locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Адрес')).toBeEditable();
  await page.screenshot({ path: testInfo.outputPath('create.png'), fullPage: true });
  await expectNoHorizontalPageScroll(page);
});

test('problem detail keeps content and next action readable', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await loginAs(page, 'Житель');
  if ((page.viewportSize()?.width ?? 0) <= 760) await page.getByRole('button', { name: 'Список' }).click();
  await page.locator('.register-row').first().click();
  await page.locator('.map-preview__open').click();
  await expect(page).toHaveURL(/\/problems\//);
  await expect(page.locator('.detail-title h1')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('detail.png'), fullPage: true });
  await expectNoHorizontalPageScroll(page);
});

test('operator and contractor registries adapt without horizontal page scroll', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await loginAs(page, 'Оператор');
  await expect(page).toHaveURL(/\/operator$/);
  await expect(page.getByRole('heading', { name: 'Городская очередь' })).toBeVisible();
  await expect(page.locator('.mini-chart')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('operator-overview.png'), fullPage: true });
  if ((page.viewportSize()?.width ?? 0) <= 760) await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.locator('.sidebar a[href="/operator/queue"]').click();
  await expect(page.getByRole('heading', { name: 'Обращения на проверке' })).toBeVisible();
  await expectNoHorizontalPageScroll(page);

  await page.locator('.topbar__logout').click();
  await page.getByRole('button', { name: 'Исполнитель', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Задачи организации' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('contractor.png'), fullPage: true });
  await expectNoHorizontalPageScroll(page);
});
