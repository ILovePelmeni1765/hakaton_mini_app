import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test('capture resident workbench for finish review', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const mobile = testInfo.project.name.startsWith('mobile');
  const device = mobile ? 'mobile' : 'desktop';
  const reviewDirectory = path.resolve('.impeccable/review');
  const coverageDirectory = path.join(reviewDirectory, 'coverage');
  mkdirSync(coverageDirectory, { recursive: true });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Ваш сигнал запускает изменения' })).toBeVisible();
  await page.screenshot({ path: path.join(reviewDirectory, `login-${device}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сигналы рядом' })).toBeVisible();
  await expect(page.getByText('Демонстрационные данные')).toBeVisible();
  await expect(page.getByRole('application', { name: 'Карта городских сигналов 2ГИС' }).locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.map-loading')).toHaveCount(0, { timeout: 25_000 });
  expect(await page.locator('.city-marker, .city-cluster').count()).toBeGreaterThan(0);
  if (mobile) {
    if (await page.locator('.resident-register').isHidden()) await page.getByRole('button', { name: 'Список', exact: true }).click();
    await expect(page.locator('.resident-register')).toBeVisible();
    await page.screenshot({ path: path.join(reviewDirectory, 'mobile.png'), fullPage: false });
  }
  await page.locator('.register-row').first().click();
  await expect(page.locator('.problem-sheet')).toBeVisible();
  if (!mobile) await page.screenshot({ path: path.join(reviewDirectory, 'desktop.png'), fullPage: false });

  await page.screenshot({ path: path.join(coverageDirectory, `resident-selected-${device}.png`), fullPage: false });
  await page.locator('.map-preview__open').click();
  await expect(page.locator('.detail-title h1')).toBeVisible();
  await page.screenshot({ path: path.join(coverageDirectory, `detail-${device}.png`), fullPage: true });

  await page.getByRole('link', { name: mobile ? 'Сообщить' : 'Создать', exact: true }).click();
  await expect(page.getByText('Новое обращение')).toBeVisible();
  await page.screenshot({ path: path.join(coverageDirectory, `create-${device}.png`), fullPage: true });

  if (mobile) await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.locator('.topbar__logout').click();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
  await page.getByRole('button', { name: 'Оператор', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Городская очередь' })).toBeVisible();
  await page.screenshot({ path: path.join(coverageDirectory, `operator-${device}.png`), fullPage: true });

  await page.locator('.topbar__logout').click();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
  await page.getByRole('button', { name: 'Исполнитель', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Задачи организации' })).toBeVisible();
  await page.screenshot({ path: path.join(coverageDirectory, `contractor-${device}.png`), fullPage: true });

  await page.locator('.topbar__logout').click();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
  await page.getByRole('button', { name: 'Администратор', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Управление' })).toBeVisible();
  await page.screenshot({ path: path.join(coverageDirectory, `admin-${device}.png`), fullPage: true });
});
