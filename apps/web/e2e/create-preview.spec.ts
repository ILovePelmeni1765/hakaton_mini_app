import { expect, test } from '@playwright/test';
import { chooseAddress } from './helpers/address';

test('reaching the preview does not publish an unfinished report', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сигналы рядом' })).toBeVisible();
  const navigation = (page.viewportSize()?.width ?? 0) <= 760 ? '.bottom-nav' : '.sidebar';
  await page.locator(`${navigation} a[href="/problems/new"]`).click();
  let publications = 0;
  await page.route('**/api/problems', async (route) => {
    if (route.request().method() === 'POST') {
      publications++;
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Test intercepted publication"}' });
    } else await route.continue();
  });
  await chooseAddress(page);
  await page.getByRole('button', { name: 'Далее: категория' }).click();
  await page.getByRole('button', { name: 'Далее: фото' }).click();
  await page.getByRole('button', { name: 'Далее: описание' }).click();
  await page.getByLabel('Короткий заголовок').fill('Проверка предпросмотра');
  await page.getByLabel('Подробности', { exact: true }).fill('Тестовая запись для проверки формы. Не должна публиковаться.');
  await page.getByRole('button', { name: 'Далее: похожие' }).click();
  await page.getByRole('button', { name: /Это другая проблема|Далее: публикация/ }).click();
  await expect(page.getByRole('heading', { name: 'Проверьте перед публикацией' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toBeVisible();
  expect(publications).toBe(0);
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Сервис временно недоступен. Попробуйте снова через минуту.');
  expect(publications).toBe(1);
});
