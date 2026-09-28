import { expect, test, type Page } from '@playwright/test';
import { chooseAddress, testAddress } from './helpers/address';

test.use({ reducedMotion: 'reduce' });

async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page).toHaveURL('/map');
}

async function withHome(page: Page) {
  await page.route('**/api/profile', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...(await response.json()), homeAddress: testAddress } });
  });
}

test('home address can be saved, edited, reloaded and deleted without changing identity', async ({
  page,
  request,
}, info) => {
  if (info.project.name.startsWith('mobile'))
    await page.setViewportSize({ width: 360, height: 780 });
  const session = await (
    await request.post('/api/auth/demo', { data: { role: 'RESIDENT' } })
  ).json();
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const original = await (await request.get('/api/profile', { headers })).json();
  try {
    expect(
      (await request.patch('/api/profile', { headers, data: { homeAddress: null } })).ok(),
    ).toBeTruthy();
    await login(page);
    await page.getByRole('link', { name: /^Профиль:/ }).click();
    await page.getByRole('button', { name: 'Личные данные', exact: true }).click();
    await page.getByRole('button', { name: 'Добавить адрес', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Сохранить адрес', exact: true })).toBeDisabled();
    await chooseAddress(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page
      .locator('.account-home-address')
      .screenshot({ path: info.outputPath('home-address-editor.png') });
    await page.getByRole('button', { name: 'Сохранить адрес', exact: true }).click();
    await expect(page.getByText('Домашний адрес сохранён', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Личные данные', exact: true }).click();
    await expect(page.locator('.account-home-address')).toContainText(testAddress.address);
    await page.getByRole('button', { name: 'Изменить адрес', exact: true }).click();
    const updated = `${testAddress.address}, корпус 2`;
    await page.getByLabel('Адрес выбранного места').fill(updated);
    await page.getByRole('button', { name: 'Сохранить адрес', exact: true }).click();
    await expect(page.getByText('Домашний адрес сохранён', { exact: true })).toBeVisible();
    const saved = await (await request.get('/api/profile', { headers })).json();
    expect(saved).toMatchObject({
      displayName: original.displayName,
      homeAddress: { ...testAddress, address: updated },
    });
    await page.getByRole('link', { name: 'Сообщить о проблеме', exact: true }).click();
    await page.getByRole('button', { name: 'Домашний адрес', exact: true }).click();
    await expect(page.locator('.address-home')).toContainText(updated);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Личные данные', exact: true }).click();
    await page.getByRole('button', { name: 'Удалить адрес', exact: true }).click();
    await expect(page.getByText('Домашний адрес удалён', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Сообщить о проблеме', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Домашний адрес', exact: true })).toHaveCount(0);
  } finally {
    expect(
      (
        await request.patch('/api/profile', {
          headers,
          data: { homeAddress: original.homeAddress ?? null },
        })
      ).ok(),
    ).toBeTruthy();
  }
});

test('home address reaches the publication unchanged and draft restoration does not reverse-geocode it', async ({
  page,
}, info) => {
  if (info.project.name.startsWith('mobile'))
    await page.setViewportSize({ width: 360, height: 780 });
  await withHome(page);
  let reverseCalls = 0;
  await page.route('**/api/maps/reverse?**', (route) => {
    reverseCalls++;
    return route.fulfill({ json: { results: [] } });
  });
  await login(page);
  await page.goto('/problems/new');
  await page.getByRole('button', { name: 'Домашний адрес', exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath('report-address-sources.png'), fullPage: true });
  await page.reload();
  await expect(page.getByLabel('Адрес выбранного места')).toHaveValue(testAddress.address);
  await page.getByRole('button', { name: 'Далее: категория' }).click();
  await page.getByRole('button', { name: 'Далее: фото' }).click();
  await page.getByRole('button', { name: 'Далее: описание' }).click();
  await page.getByLabel('Короткий заголовок').fill('Проверка адреса обращения');
  await page
    .getByLabel('Подробности', { exact: true })
    .fill('Тестовая проверка выбранного домашнего адреса перед публикацией.');
  await page.getByRole('button', { name: 'Далее: похожие' }).click();
  await page.getByRole('button', { name: /Это другая проблема|Далее: публикация/ }).click();
  await expect(page.locator('.preview-card__map')).toContainText(testAddress.address);
  await page.route('**/api/problems', (route) =>
    route.fulfill({ status: 400, json: { message: 'Проверка адреса завершена' } }),
  );
  const publication = page.waitForRequest(
    (req) => req.method() === 'POST' && req.url().endsWith('/api/problems'),
  );
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  expect((await publication).postDataJSON()).toMatchObject(testAddress);
  expect(reverseCalls).toBe(0);
});

test('current location keeps GPS coordinates even when the returned building is nearby', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 55.111, longitude: 82.222 } } as GeolocationPosition),
      },
    }),
  );
  await page.route('**/api/maps/reverse?**', (route) => {
    expect(new URL(route.request().url()).searchParams.get('lat')).toBe('55.111');
    return route.fulfill({ json: { results: [testAddress] } });
  });
  await login(page);
  await page.goto('/problems/new');
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await expect(page.getByLabel('Адрес выбранного места')).toHaveValue(testAddress.address);
  await page.getByRole('button', { name: 'Далее: категория' }).click();
  await page.getByRole('button', { name: 'Далее: фото' }).click();
  await page.getByRole('button', { name: 'Далее: описание' }).click();
  await page.getByLabel('Короткий заголовок').fill('Проверка геолокации');
  await page
    .getByLabel('Подробности', { exact: true })
    .fill('Тестовая проверка координат из геолокации устройства.');
  await page.getByRole('button', { name: 'Далее: похожие' }).click();
  await page.getByRole('button', { name: /Это другая проблема|Далее: публикация/ }).click();
  await page.route('**/api/problems', (route) =>
    route.fulfill({ status: 400, json: { message: 'Проверено' } }),
  );
  const publication = page.waitForRequest(
    (req) => req.method() === 'POST' && req.url().endsWith('/api/problems'),
  );
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  expect((await publication).postDataJSON()).toMatchObject({
    latitude: 55.111,
    longitude: 82.222,
    address: testAddress.address,
  });
});

test('geolocation denial and unavailable geolocation allow manual address selection', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1 } as GeolocationPositionError),
      },
    }),
  );
  await login(page);
  await page.goto('/problems/new');
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await expect(page.getByText(/Доступ к геолокации запрещён/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeDisabled();
  await page.getByRole('button', { name: 'Другой адрес', exact: true }).click();
  await chooseAddress(page);
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeEnabled();
  await page.getByLabel('Найти адрес', { exact: true }).fill('Другой город');
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeDisabled();
});

test('a delayed location response cannot overwrite a home address', async ({ page }) => {
  await withHome(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 55, longitude: 82 } } as GeolocationPosition),
      },
    }),
  );
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finished!: () => void;
  const delivered = new Promise<void>((resolve) => {
    finished = resolve;
  });
  await page.route('**/api/maps/reverse?**', async (route) => {
    await hold;
    await route.fulfill({ json: { results: [{ ...testAddress, address: 'Другой адрес' }] } });
    finished();
  });
  await login(page);
  await page.goto('/problems/new');
  const reverse = page.waitForRequest('**/api/maps/reverse?**');
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await reverse;
  await page.getByRole('button', { name: 'Домашний адрес', exact: true }).click();
  release();
  await delivered;
  await expect(page.locator('.address-home')).toContainText(testAddress.address);
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeEnabled();
});

test('failed address lookup is recoverable and cannot submit the default map centre', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', { value: undefined }),
  );
  await login(page);
  await page.goto('/problems/new');
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeDisabled();
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await expect(page.getByText(/Геолокация недоступна/)).toBeVisible();
  await page.route('**/api/maps/geocode?**', (route) => route.fulfill({ status: 503, json: {} }));
  await page.getByLabel('Найти адрес', { exact: true }).fill('Тестовый адрес');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByText(/Поиск адресов недоступен/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeDisabled();
  await page.route('**/api/maps/geocode?**', (route) => route.fulfill({ json: { results: [] } }));
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByText(/Адрес не найден/)).toBeVisible();
  await chooseAddress(page);
  await expect(page.getByRole('button', { name: 'Далее: категория' })).toBeEnabled();
});
