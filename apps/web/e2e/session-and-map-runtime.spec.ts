import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test('legacy session is cleared, old map is absent, and logout is global', async ({ page }) => {
  const failed2GisResponses: string[] = [];
  page.on('response', (response) => {
    if (/2gis|dgis/i.test(response.url()) && response.status() >= 400) {
      failed2GisResponses.push(`${response.status()} ${new URL(response.url()).origin}`);
    }
  });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('pulse-city-session', JSON.stringify({
      version: 0,
      state: {
        token: 'legacy-token',
        user: { id: 'legacy-user', displayName: 'Старый аккаунт', role: 'RESIDENT' },
        theme: 'system',
        onboardingDone: true,
      },
    }));
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();

  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('pulse-city-session') || '{}'));
  expect(migrated.version).toBe(4);
  expect(migrated.state).toEqual({ onboardingDone: true, token: null });

  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  const map = page.getByRole('application', { name: 'Карта городских сигналов 2ГИС' });
  if (!await map.isVisible()) await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(map).toBeVisible();
  await expect(map.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.map-loading')).toHaveCount(0, { timeout: 25_000 });
  await expect(map.locator('canvas')).toHaveCount(1);
  await expect.poll(() => map.locator('.city-marker, .city-cluster').evaluateAll((markers) => markers.some((marker) => {
    const pin = marker.getBoundingClientRect();
    const canvas = marker.closest('.map-canvas')!.getBoundingClientRect();
    return pin.top >= canvas.top && pin.bottom <= canvas.bottom && pin.left >= canvas.left && pin.right <= canvas.right;
  }))).toBe(true);

  // An SDK marker may use any z-index; controls must retain the top interaction layer.
  const stressLayer = await page.addStyleTag({ content: '.map-canvas::after { content: ""; position: absolute; inset: 0; z-index: 2147483647; }' });
  for (const control of [page.getByRole('button', { name: 'Приблизить карту', exact: true }), page.locator('.map-create')]) {
    await control.scrollIntoViewIfNeeded();
    expect(await control.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
  }
  await stressLayer.evaluate((element) => element.remove());
  await expect(page.getByText('Интерактивная карта временно недоступна')).toHaveCount(0);
  await expect(page.getByText(/OpenStreetMap|Leaflet/i)).toHaveCount(0);
  const mapResources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
  expect(mapResources.some((url) => url.includes('mapgl.2gis.com'))).toBe(true);
  expect(mapResources.some((url) => /yandex|openstreetmap|leaflet/i.test(url))).toBe(false);
  expect(failed2GisResponses).toEqual([]);

  const storedSession = await page.evaluate(() => JSON.parse(localStorage.getItem('pulse-city-session') || '{}'));
  expect(storedSession.state).toEqual({ onboardingDone: true, token: expect.any(String) });
  await page.reload();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole('heading', { name: 'Сигналы рядом' })).toBeVisible();

  await page.locator('.topbar__logout').click();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
