import { expect, test, type Page } from '@playwright/test';

const day = 86_400_000;
const at = (offset: number) => new Date(Date.now() + offset * day).toISOString();
const district = { id: 'district', name: 'Центральный район', centerLat: 55.03, centerLng: 82.92 };
const organization = { id: 'organization', name: 'Городская служба благоустройства и содержания территорий', verified: true };
const user = { id: 'resident', role: 'RESIDENT', email: 'test@example.test', displayName: 'Тестовый житель', reputation: 20, trustLevel: 1, usefulStreak: 2, district };
function problem(id: string, number: number, status = 'OPERATOR_REVIEW') {
  return { id, number, status, title: `Обращение ${number}`, address: 'Новосибирск, улица Плахотного, 8а', description: 'На месте отсутствует горячая вода.', category: 'OTHER', priority: 'HIGH', createdAt: at(-number), updatedAt: at(-1), dueAt: at(-1), latitude: 55.03, longitude: 82.92, media: [], district, author: user, confirmationCount: 2, assignments: [], comments: [], reports: [], votes: [], history: [], confirmations: [], subscriptions: [], viewer: { subscribed: false, confirmed: false, voted: false, allowedTransitions: [] } };
}

async function setup(page: Page, role = 'RESIDENT') {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const profile = { ...user, role };
    const bodies: Record<string, unknown> = {
      '/api/auth/demo': { accessToken: 'test-session', user: profile },
      '/api/auth/me': profile,
      '/api/dashboard/summary': { district, health: 73, stats: { active: 1, awaitingVerification: 0 } },
      '/api/notifications': [], '/api/missions': [], '/api/organizations': [organization],
      '/api/problems': [problem('newest', 1), problem('older', 2)],
    };
    await route.fulfill({ status: path in bodies ? 200 : 404, json: bodies[path] ?? { message: 'Тестовый маршрут не настроен' } });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: role === 'OPERATOR' ? 'Оператор' : 'Житель', exact: true }).click();
  await expect(page).toHaveURL(role === 'OPERATOR' ? /\/operator$/ : /\/map$/);
}

async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, elements: Array.from(document.querySelectorAll('*')).filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 || element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1).map((element) => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })).slice(0, 20) }));
  expect(dimensions.overflow, JSON.stringify(dimensions.elements)).toBeLessThanOrEqual(1);
}

test('my problems replace notifications in navigation and refresh preserves the route', async ({ page }, info) => {
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 800 });
  await setup(page);
  const nav = page.locator(info.project.name.startsWith('mobile') ? '.bottom-nav' : '.sidebar');
  await expect(nav.getByRole('link', { name: 'Уведомления' })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Мои обращения', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Мои обращения' })).toBeVisible();
  const restored = page.waitForRequest('**/api/auth/me');
  await page.reload();
  expect((await restored).headers().authorization).toBe('Bearer test-session');
  await expect(page.getByRole('heading', { name: 'Мои обращения' })).toBeVisible();
  await noOverflow(page);
  await page.locator('.topbar__logout').click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
});

test('unread notification indicator clears immediately after reading all', async ({ page }) => {
  await setup(page);
  let readAt: string | undefined;
  await page.route('**/api/notifications', (route) => route.fulfill({ json: [{ id: 'notification', title: 'Изменён статус', body: 'Обращение принято', type: 'ASSIGNED', createdAt: at(-1), readAt }] }));
  await page.route('**/api/notifications/read-all', (route) => { readAt = at(0); return route.fulfill({ json: { ok: true } }); });
  await page.reload();
  await expect(page.locator('.topbar__notification i')).toHaveCount(1);
  await page.locator('.topbar__notification').click();
  await page.getByRole('button', { name: 'Отметить всё прочитанным' }).click();
  await expect(page.getByText('Непрочитанных: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.topbar__notification i')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.notification-list > button')).toBeVisible();
  await expect(page.locator('.topbar__notification i')).toHaveCount(0);
});

test('search ignores commas and location failure explains what to do', async ({ page }, info) => {
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success: unknown, error: (failure: { code: number }) => void) => error({ code: 1 }) } }));
  await setup(page);
  await page.getByRole('button', { name: 'Список', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Поиск', exact: true });
  for (const query of ['Плахотного 8а', 'Плахотного, 8а', ' ПЛАХОТНОГО,8А ']) {
    await search.fill(query);
    await expect(page.locator('.register-row')).toHaveCount(2);
  }
  await expect(page.getByRole('button', { name: 'Фильтры', exact: true })).toHaveText('Фильтры');
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Доступ к местоположению запрещён');
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('search-360.png') });
});

test('expired missions disappear and achievements use compact rows', async ({ page }, info) => {
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 800 });
  await setup(page);
  const mission = { id: 'active', title: 'Текущая миссия', description: 'Проверьте освещение в районе.', target: 10, reward: 5, status: 'ACTIVE', startsAt: at(-2), endsAt: at(2) };
  await page.route('**/api/missions', (route) => route.fulfill({ json: [mission, { ...mission, id: 'ended', title: 'Прошедшая миссия', endsAt: at(-1) }, { ...mission, id: 'upcoming', title: 'Будущая миссия', startsAt: at(1) }] }));
  await page.goto('/missions');
  await expect(page.locator('.mission-row')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Прошедшая миссия' })).toHaveCount(0);
  await expect(page.getByText('Участие откроется в день начала')).toBeVisible();
  await noOverflow(page);
  const achievements = [{ code: 'first', title: 'Первый сигнал', description: 'Создайте первое обращение о городской проблеме.', icon: 'flag', current: 1, target: 1, completed: true, earnedAt: at(-1) }, { code: 'helper', title: 'Помощник района', description: 'Подтвердите пять проблем в своём районе.', icon: 'users', current: 2, target: 5, completed: false }];
  await page.route('**/api/profile', (route) => route.fulfill({ json: { ...user, createdAt: at(-30), _count: { createdProblems: 1, confirmations: 2, resolutionVotes: 0 }, reputationEvents: [], achievementProgress: achievements } }));
  await page.goto('/profile');
  await expect(page.locator('.achievement-item')).toHaveCount(2);
  for (const item of await page.locator('.achievement-item').all()) expect((await item.boundingBox())!.height).toBeLessThan(145);
  await expect(page.getByRole('progressbar')).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('compact-achievements.png'), fullPage: true });
});

test('operator cannot assign an assigned problem and fields have room for focus', async ({ page }, info) => {
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 800 });
  await setup(page, 'OPERATOR');
  const assigned = problem('assigned', 7, 'ASSIGNED');
  const review = problem('review', 8);
  await page.route('**/api/problems?**', (route) => route.fulfill({ json: [assigned, review] }));
  await page.route('**/api/problems/review', (route) => route.fulfill({ json: { ...review, status: 'NEEDS_MORE_INFO' } }));
  await page.goto('/operator/overdue');
  await expect(page.getByRole('checkbox', { name: 'Выбрать обращение № 7', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Выбрать доступные для назначения' }).check();
  await expect(page.getByText('Выбрано: 1', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Исполнитель' }).selectOption(organization.id);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('assignment-360.png') });
  await page.goto('/problems/review');
  await page.getByText('Категория и приоритет', { exact: true }).click();
  const category = await page.getByRole('combobox', { name: 'Категория', exact: true }).boundingBox();
  const priorityLabel = await page.getByRole('combobox', { name: 'Приоритет', exact: true }).locator('..').boundingBox();
  const priority = await page.getByRole('combobox', { name: 'Приоритет', exact: true }).boundingBox();
  const save = await page.getByRole('button', { name: 'Сохранить категорию и приоритет' }).boundingBox();
  expect(priorityLabel!.y - category!.y - category!.height).toBeGreaterThanOrEqual(10);
  expect(save!.y - priority!.y - priority!.height).toBeGreaterThanOrEqual(10);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('operator-fields.png') });
});

test('restoration survives outages and explains a blocked account', async ({ page }) => {
  await setup(page);
  await page.goto('/my-problems');
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 503, json: {} }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('временно недоступен');
  await expect(page).toHaveURL(/\/my-problems$/);
  await page.unroute('**/api/auth/me');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Мои обращения' })).toBeVisible();
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 403, json: { code: 'ACCOUNT_SUSPENDED', message: 'Ваш аккаунт заблокирован. Обратитесь к администратору сервиса.' } }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('аккаунт заблокирован');
});

test('bulk assignment reports partial success and keeps only failed items selected', async ({ page }) => {
  await setup(page, 'OPERATOR');
  let firstStatus = 'OPERATOR_REVIEW';
  const assignedIds: string[] = [];
  await page.route('**/api/problems?**', (route) => route.fulfill({ json: [problem('first', 1, firstStatus), problem('second', 2)] }));
  await page.route('**/api/problems/*/transition', (route) => {
    const id = new URL(route.request().url()).pathname.split('/')[3]!;
    assignedIds.push(id);
    expect(route.request().postDataJSON()).toMatchObject({ to: 'ASSIGNED', organizationId: organization.id });
    if (id === 'first') { firstStatus = 'ASSIGNED'; return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ status: 400, json: { message: 'Статус уже изменился. Обновите обращение.' } });
  });
  await page.goto('/operator/queue');
  await page.getByRole('checkbox', { name: 'Выбрать доступные для назначения' }).check();
  await page.getByRole('combobox', { name: 'Исполнитель' }).selectOption(organization.id);
  await page.getByRole('button', { name: 'Назначить исполнителя', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Назначено обращений: 1. № 2: Статус уже изменился.');
  expect(assignedIds.sort()).toEqual(['first', 'second']);
  await expect(page.getByRole('checkbox', { name: 'Выбрать обращение № 1', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Выбрать обращение № 2', exact: true })).toBeChecked();
});
