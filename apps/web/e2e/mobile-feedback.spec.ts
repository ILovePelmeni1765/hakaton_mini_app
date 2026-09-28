import { expect, test } from '@playwright/test';
import type { AchievementProgress } from '@pulse/shared';

test('a map pin opens one readable preview above navigation', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  const mobile = (page.viewportSize()?.width ?? 0) <= 760;
  if (mobile) {
    await expect(page.locator('.bottom-nav a[href="/problems/new"]')).not.toHaveClass(/active/);
    await expect(page.locator('.bottom-nav a[href="/problems/new"]')).toHaveCSS('background-color', 'rgb(101, 71, 245)');
    await page.getByRole('button', { name: 'Список', exact: true }).click();
  }
  await page.locator('.register-row').filter({ hasText: 'Не работает фонарь у пешеходного перехода' }).click();
  await expect(page.locator('.map-loading')).toHaveCount(0, { timeout: 25_000 });
  await page.locator('.problem-sheet__close').click();
  await page.getByRole('button', { name: /^Не работает фонарь у пешеходного перехода\./ }).click();
  const preview = page.getByRole('region', { name: 'Выбранная проблема' });
  await expect(preview.getByRole('heading', { name: 'Не работает фонарь у пешеходного перехода' })).toBeVisible();
  await expect(preview.getByRole('link', { name: 'Открыть обращение' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Изменить высоту панели' })).toHaveCount(0);
  expect(await preview.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  if (mobile) {
    const box = await preview.boundingBox();
    const nav = await page.locator('.bottom-nav').boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
    expect(box!.height).toBeLessThan(page.viewportSize()!.height * .6);
  }
  await page.screenshot({ path: testInfo.outputPath('map-preview.png'), fullPage: false });
  await preview.getByRole('link', { name: 'Открыть обращение' }).click();
  await expect(page.locator('.detail-title h1')).toHaveText('Не работает фонарь у пешеходного перехода');
});

test('profile shows earned and pending achievements and ignores a saved dark theme', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('pulse-city-session', JSON.stringify({ version: 2, state: { theme: 'dark', onboardingDone: true } })));
  await page.goto('/login');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light only');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pulse-city-session') || '{}'))).toEqual({ version: 4, state: { onboardingDone: true, token: null } });
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  const navigation = (page.viewportSize()?.width ?? 0) <= 760 ? '.bottom-nav' : '.sidebar';
  const response = page.waitForResponse((res) => res.url().endsWith('/api/profile') && res.ok());
  await page.locator(`${navigation} a[href="/profile"]`).click();
  const { achievementProgress } = await (await response).json() as { achievementProgress: AchievementProgress[] };
  const earned = achievementProgress.filter((item) => item.completed).length;
  expect(achievementProgress.length).toBe(14);
  await expect(page.locator('.achievement-item')).toHaveCount(14);
  await expect(page.getByRole('progressbar')).toHaveCount(14 - earned);
  await page.getByRole('button', { name: /^В процессе/ }).click();
  await expect(page.locator('.achievement-item')).toHaveCount(14 - earned);
  await expect(page.locator('.achievement-item--earned')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('achievement-progress.png'), fullPage: true });
  await page.getByRole('button', { name: /^Получены/ }).click();
  await expect(page.locator('.achievement-item')).toHaveCount(earned);
  await page.screenshot({ path: testInfo.outputPath('achievements-earned.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('link', { name: 'Настройки уведомлений', exact: true }).click();
  await expect(page.getByRole('button', { name: /Тёмная|Светлая|Как в системе/ })).toHaveCount(0);
});
