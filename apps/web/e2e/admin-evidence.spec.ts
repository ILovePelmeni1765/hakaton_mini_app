import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test('capture administrative result registers for finish review', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const device = testInfo.project.name.startsWith('mobile') ? 'mobile' : 'desktop';
  const directory = testInfo.outputPath('review', 'coverage');
  mkdirSync(directory, { recursive: true });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Администратор', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Управление' })).toBeVisible();

  for (const [route, heading, name] of [
    ['/operator/contractors', 'Исполнители', 'organizations'],
    ['/operator/analytics', 'Аналитика', 'analytics'],
    ['/operator/audit', 'Журнал действий', 'audit'],
  ] as const) {
    if (route === '/operator/contractors') await page.getByRole('button', { name: /Организации/ }).click();
    else {
      if (device === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
      await page.locator(`.sidebar a[href="${route}"]`).click();
    }
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.screenshot({ path: path.join(directory, `${name}-${device}.png`), fullPage: false });
  }
});
