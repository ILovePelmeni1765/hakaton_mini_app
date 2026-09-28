import { expect, test } from '@playwright/test';
import type { AccountOverview, UserRole } from '@pulse/shared';

test.use({ deviceScaleFactor: 1, reducedMotion: 'reduce' });

const cases: Array<{
  role: UserRole;
  login: string;
  label: string;
  metric: string;
  action: string;
  href: string;
}> = [
  {
    role: 'RESIDENT',
    login: 'Житель',
    label: 'Житель',
    metric: 'Всего обращений',
    action: 'Мои подписки',
    href: '/subscriptions',
  },
  {
    role: 'OPERATOR',
    login: 'Оператор',
    label: 'Городской оператор',
    metric: 'На рассмотрении',
    action: 'Просроченные обращения',
    href: '/operator/overdue',
  },
  {
    role: 'CONTRACTOR',
    login: 'Исполнитель',
    label: 'Исполнитель',
    metric: 'Новых задач',
    action: 'Новые назначения',
    href: '/contractor?tab=ASSIGNED',
  },
  {
    role: 'ADMIN',
    login: 'Администратор',
    label: 'Администратор',
    metric: 'Активных аккаунтов',
    action: 'Пользователи и доступ',
    href: '/admin/users',
  },
];

for (const item of cases) {
  test(`${item.role}: account shows role data, working links and personal details`, async ({
    page,
  }, info) => {
    if (info.project.name.startsWith('mobile'))
      await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/login');
    await page.getByRole('button', { name: item.login, exact: true }).click();
    await expect(page.getByRole('link', { name: /^Профиль:/ })).toBeVisible();
    const response = page.waitForResponse(
      (res) => res.url().endsWith('/api/profile/overview') && res.ok(),
    );
    await page.getByRole('link', { name: /^Профиль:/ }).click();
    const data = (await (await response).json()) as AccountOverview;
    expect(data.role).toBe(item.role);
    await expect(page.getByRole('heading', { name: 'Личный кабинет', exact: true })).toBeVisible();
    await expect(page.locator('.account-role')).toHaveText(item.label);
    await expect(page.getByText(item.metric, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Достижения', exact: true })).toHaveCount(
      item.role === 'RESIDENT' ? 1 : 0,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('account.png'), fullPage: false });
    await page.screenshot({ path: info.outputPath('account-full.png'), fullPage: true });

    await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
    const field = page.getByRole('textbox', { name: 'Имя и фамилия' });
    const original = await field.inputValue();
    await expect(page.getByRole('button', { name: 'Сохранить изменения' })).toBeDisabled();
    await field.fill(' ');
    await expect(page.getByText('Введите минимум 2 символа')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Сохранить изменения' })).toBeDisabled();
    await page.getByRole('button', { name: 'Отменить', exact: true }).click();
    await expect(field).toHaveValue(original);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('personal.png'), fullPage: true });

    await page.getByRole('button', { name: 'Обзор', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Действия по роли' })
      .getByRole('link', { name: new RegExp(item.action) })
      .click();
    await expect(page).toHaveURL(new RegExp(`${item.href.replace('?', '\\?')}$`));
  });
}

test('profile editing persists and rejects changes to identity or access', async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name !== 'desktop-chrome', 'One writer for the shared demo account');
  const login = await request.post('/api/auth/demo', { data: { role: 'RESIDENT' } });
  const session = (await login.json()) as {
    accessToken: string;
    user: { displayName: string; id: string };
  };
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  for (const field of [{ role: 'ADMIN' }, { id: 'another-user' }, { organizationId: 'other' }]) {
    expect(
      (
        await request.patch('/api/profile', { headers, data: { displayName: 'Имя', ...field } })
      ).status(),
    ).toBe(400);
  }
  expect((await request.get('/api/users', { headers })).status()).toBe(403);
  expect((await request.get('/api/profile/overview')).status()).toBe(401);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await page.getByRole('link', { name: /^Профиль:/ }).click();
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  const name = 'Анна Проверка кабинета';
  try {
    await page.getByRole('textbox', { name: 'Имя и фамилия' }).fill(name);
    await page.getByRole('button', { name: 'Сохранить изменения' }).click();
    await expect(page.getByText('Изменения сохранены', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: `Профиль: ${name}` })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    const profile = (await (await request.get('/api/profile', { headers })).json()) as {
      displayName: string;
      role: string;
      id: string;
    };
    expect(profile).toMatchObject({ displayName: name, role: 'RESIDENT', id: session.user.id });
    const overview = (await (
      await request.get('/api/profile/overview', { headers })
    ).json()) as AccountOverview;
    expect(overview.activity.some((event) => event.action === 'PROFILE_UPDATED')).toBe(true);
  } finally {
    expect(
      (
        await request.patch('/api/profile', {
          headers,
          data: { displayName: session.user.displayName },
        })
      ).ok(),
    ).toBe(true);
  }
});

test('account handles loading failures and empty queues', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Исполнитель', exact: true }).click();
  await page.route('**/api/profile/overview', (route) => route.fulfill({ status: 503, json: {} }));
  await page.getByRole('link', { name: /^Профиль:/ }).click();
  await expect(page.getByText('Не удалось загрузить показатели кабинета.')).toBeVisible();
  await page.route('**/api/profile/overview', (route) =>
    route.fulfill({
      json: {
        role: 'CONTRACTOR',
        metrics: [{ key: 'assigned', value: 0 }],
        problems: [],
        activity: [],
      } satisfies AccountOverview,
    }),
  );
  await page.getByRole('button', { name: 'Повторить загрузку' }).click();
  await expect(page.getByRole('heading', { name: 'Активных задач пока нет' })).toBeVisible();
});
