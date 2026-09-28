import { expect, test } from '@playwright/test';
import { chooseAddress } from './helpers/address';

for (const [role, home] of [
  ['Житель', '/map'],
  ['Оператор', '/operator'],
  ['Исполнитель', '/contractor'],
  ['Администратор', '/admin'],
] as const) {
  test(`${role}: back follows visited sections and handles direct links`, async ({ page, context }, info) => {
    if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/login');
    await page.getByRole('button', { name: role, exact: true }).click();
    await expect(page).toHaveURL(home);
    const back = page.locator('.topbar').getByRole('button', { name: 'Назад', exact: true });
    await expect(back).toHaveCount(0);

    await page.locator('.topbar__user').click();
    await expect(page).toHaveURL('/profile');
    await page.locator('main').getByRole('link', { name: 'Настройки' }).click();
    await expect(page).toHaveURL('/settings');
    await expect(back).toBeVisible();
    const bounds = await back.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await back.press('Enter');
    await expect(page).toHaveURL('/profile');
    await page.goForward();
    await expect(page).toHaveURL('/settings');
    await back.click();
    await expect(page).toHaveURL('/profile');
    await back.click();
    await expect(page).toHaveURL(home);
    await expect(back).toHaveCount(0);

    const direct = await context.newPage();
    await direct.goto('/settings');
    await direct.getByRole('button', { name: 'Назад', exact: true }).click();
    await expect(direct).toHaveURL(home);
    await direct.close();
  });
}

test('back preserves task filters and returns through a problem detail', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Исполнитель', exact: true }).click();
  await expect(page).toHaveURL('/contractor');
  await page.getByRole('button', { name: 'Завершены', exact: true }).click();
  await expect(page).toHaveURL('/contractor?tab=RESOLVED');
  await page.getByRole('link', { name: 'Открыть задачу', exact: true }).first().click();
  await expect(page).toHaveURL(/\/problems\/[^/]+$/);
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page).toHaveURL('/contractor?tab=RESOLVED');
  await expect(page.getByRole('button', { name: 'Завершены', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page).toHaveURL('/contractor');
});

test('the report form goes back a step and keeps its exit confirmation', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page).toHaveURL('/map');
  await page.locator('.topbar__user').click();
  await expect(page).toHaveURL('/profile');
  await page.goto('/problems/new');
  await chooseAddress(page);
  await page.getByRole('button', { name: 'Далее: категория', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Что случилось?' })).toBeVisible();
  await page.locator('.create-header').getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Где находится проблема?' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('.create-header').getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page).toHaveURL('/problems/new');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.create-header').getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page).toHaveURL('/map');
});
