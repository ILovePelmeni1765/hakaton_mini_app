import { expect, test } from '@playwright/test';

test('legacy notifications are Russian with a visible unread corner indicator', async ({ page }, testInfo) => {
  await page.route('**/api/notifications', (route) => route.fulfill({ json: [
    { id: 'unread-example', type: 'STATUS_CHANGED', title: 'Статус обращения изменился', body: 'Новый статус: ASSIGNED', createdAt: '2026-09-11T12:00:00Z' },
    { id: 'read-example', type: 'STATUS_CHANGED', title: 'Статус обращения изменился', body: 'Новый статус: COMMUNITY_VERIFICATION', readAt: '2026-09-11T12:00:00Z', createdAt: '2026-09-11T11:00:00Z' },
  ] }));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  await page.locator('.topbar a[href="/notifications"]').click();
  if (testInfo.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByText('Непрочитанных: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Новый статус: Назначен исполнитель', { exact: true })).toBeVisible();
  await expect(page.getByText('Новый статус: Проверка жителями', { exact: true })).toBeVisible();
  expect(await page.getByRole('button', { name: 'Отметить всё прочитанным', exact: true }).evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= document.documentElement.clientWidth;
  })).toBe(true);
  const dot = page.locator('.notification-unread');
  await expect(dot).toHaveCount(1);
  const position = await dot.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const icon = element.parentElement!.getBoundingClientRect();
    return { size: rect.width, top: rect.top - icon.top, right: icon.right - rect.right };
  });
  expect(position.size).toBeGreaterThanOrEqual(12);
  expect(position.top).toBeLessThanOrEqual(0);
  expect(position.right).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('notifications.png'), fullPage: false });
});
