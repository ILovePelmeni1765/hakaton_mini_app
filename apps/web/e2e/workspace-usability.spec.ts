import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function navigate(page: Page, route: string) {
  await page.evaluate((url) => { history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
}

// Flat text surfaces only: images, maps, disabled controls and hidden elements
// need separate visual inspection rather than a guessed background color.
async function textContrast(page: Page) {
  return page.evaluate(() => {
    const rgba = (color: string) => {
      if (!color.startsWith('rgb')) return null;
      const values = color.match(/[\d.]+/g)?.map(Number);
      return values?.length ? [values[0]!, values[1]!, values[2]!, values[3] ?? 1] : null;
    };
    const luminance = (color: number[]) => color.slice(0, 3).map((c) => c / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
    const failures: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      if (!Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) continue;
      if (element.closest('svg, option, [disabled], [role="application"]')) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.right <= 0 || rect.left >= innerWidth) continue;
      const style = getComputedStyle(element);
      if (style.visibility !== 'visible') continue;
      const foreground = rgba(style.color);
      if (!foreground || foreground[3]! < 1) continue;
      const layers: number[][] = [];
      let skip = false;
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        const current = getComputedStyle(ancestor);
        if (current.backgroundImage !== 'none' || Number(current.opacity) < 1) { skip = true; break; }
        const background = rgba(current.backgroundColor);
        if (background) layers.push(background);
        if (background?.[3] === 1) break;
      }
      if (skip) continue;
      let background = [255, 255, 255];
      for (const layer of layers.reverse()) background = background.map((value, i) => layer[i]! * layer[3]! + value * (1 - layer[3]!));
      const a = luminance(foreground), b = luminance(background);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) failures.push(`${element.tagName}.${element.className}: ${element.textContent?.trim().slice(0, 70)} (${ratio.toFixed(2)}:1)`);
    }
    return [...new Set(failures)];
  });
}

async function capture(page: Page, info: TestInfo, name: string, issues: string[]) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: false });
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${name}: horizontal overflow`).toBeLessThanOrEqual(1);
  issues.push(...(await textContrast(page)).map((issue) => `${name}: ${issue}`));
}

test('district scores and resident surfaces remain readable with a purple report action', async ({ page }, info) => {
  test.setTimeout(120_000);
  const issues: string[] = [];
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Житель', exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  if (info.project.name.startsWith('mobile')) {
    const report = page.locator('.bottom-nav a[href="/problems/new"]');
    await expect(report).toHaveCSS('background-color', 'rgb(101, 71, 245)');
    await expect(report).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(report).not.toHaveAttribute('aria-current', 'page');
  }
  for (const [route, ready, name] of [
    ['/rating', '.health-value strong', 'rating'],
    ['/missions', '.mission-row, .missions-page .empty-state', 'missions'],
    ['/profile', '.achievement-item', 'profile'],
    ['/notifications', '.notification-list > button', 'notifications'],
    ['/settings', '.settings-page', 'settings'],
  ]) {
    await navigate(page, route!);
    await expect(page.locator(ready!).first()).toBeVisible();
    if (route === '/rating') {
      await expect(page.getByRole('meter')).toHaveCount(6);
      await expect(page.locator('.health-overview h2')).toHaveText('Центральный район');
      for (const card of await page.locator('.metric-card').all()) {
        const title = await card.locator('h2').boundingBox();
        const score = await card.locator('.metric-card__score').boundingBox();
        expect(title!.y + title!.height).toBeLessThanOrEqual(score!.y);
      }
    }
    await capture(page, info, name!, issues);
  }
  expect(issues).toEqual([]);
});

test('working roles have labelled records, Russian roles and explicit actions', async ({ page }, info) => {
  test.setTimeout(120_000);
  const issues: string[] = [];
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Оператор', exact: true }).click();
  await expect(page.locator('.work-item').first()).toBeVisible();
  await capture(page, info, 'operator-overview', issues);
  await page.getByRole('button', { name: 'Весь реестр' }).click();
  const item = page.locator('.work-item').first();
  await expect(item).toBeVisible();
  await expect(item.getByText('Срок выполнения', { exact: true })).toBeVisible();
  await expect(item.getByText('Подтверждения жителей', { exact: true })).toBeVisible();
  await expect(item.getByText('Не назначен', { exact: true })).toBeVisible();
  await capture(page, info, 'operator-queue', issues);
  const title = await item.locator('h2').innerText();
  const number = title.match(/№ (\d+)/)![1]!;
  await page.getByRole('textbox', { name: 'Поиск обращений' }).fill(number);
  await expect(page.locator('.work-item').filter({ hasText: title })).toBeVisible();
  await page.getByRole('textbox', { name: 'Поиск обращений' }).fill('нет такого адреса 999999');
  await expect(page.getByRole('heading', { name: 'Обращения не найдены' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Поиск обращений' }).fill('');
  await page.getByRole('combobox', { name: 'Приоритет', exact: true }).selectOption('CRITICAL');
  await expect(page.locator('.work-priority:not(.work-priority--critical)')).toHaveCount(0);
  await expect(page.locator('.sidebar nav a[aria-current="page"]')).toHaveCount(1);
  await expect(page.locator('.sidebar a[href="/operator/queue"]')).toHaveAttribute('aria-current', 'page');
  await page.getByRole('combobox', { name: 'Приоритет', exact: true }).selectOption('');
  const selectable = page.locator('.work-item--selectable').first();
  if (await selectable.count()) {
    await selectable.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Назначить исполнителя', exact: true })).toBeDisabled();
    await capture(page, info, 'operator-selection', issues);
    await page.getByRole('button', { name: 'Снять выбор' }).click();
  } else {
    await expect(page.getByText(/Назначить исполнителя можно после проверки оператором/)).toBeVisible();
  }
  await item.getByRole('link', { name: 'Открыть обращение', exact: true }).click();
  await expect(page.locator('.detail-title h1')).toBeVisible();
  await capture(page, info, 'operator-detail', issues);
  await page.locator('.topbar__logout').click();
  await page.getByRole('button', { name: 'Исполнитель', exact: true }).click();
  await expect(page.locator('.work-item').first()).toBeVisible();
  await capture(page, info, 'contractor', issues);
  await page.getByRole('button', { name: 'В работе', exact: true }).click();
  await expect(page.locator('.sidebar nav a[aria-current="page"]')).toHaveCount(1);
  await expect(page.locator('.sidebar a[href="/contractor?tab=IN_PROGRESS"]')).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Все', exact: true }).click();
  await page.locator('.work-item').first().getByRole('link', { name: 'Открыть задачу' }).click();
  await expect(page.locator('.detail-title h1')).toBeVisible();
  await page.locator('.topbar__logout').click();
  await page.getByRole('button', { name: 'Администратор', exact: true }).click();
  await expect(page.locator('.user-record').first()).toBeVisible();
  await capture(page, info, 'admin-overview', issues);
  await page.getByRole('button', { name: /^Пользователи/ }).click();
  await expect(page.locator('.user-record').first()).toBeVisible();
  await expect(page.locator('.user-register')).not.toContainText(/ADMIN|OPERATOR|CONTRACTOR|RESIDENT/);
  const admin = page.locator('.user-record').filter({ hasText: 'admin@pulse.local' });
  await expect(admin.getByText('Ваш аккаунт', { exact: true })).toBeVisible();
  await expect(admin.getByRole('button')).toHaveCount(0);
  const resident = page.locator('.user-record').filter({ hasText: 'resident@pulse.local' });
  await expect(resident.getByText('Репутация · баллы', { exact: true })).toBeVisible();
  await expect(resident.getByText('Аккаунт активен', { exact: true })).toBeVisible();
  await expect(resident.getByRole('button', { name: 'Заблокировать', exact: true })).toBeEnabled();
  await capture(page, info, 'admin-users', issues);
  await page.getByRole('combobox', { name: 'Роль', exact: true }).selectOption('CONTRACTOR');
  await expect(page.locator('.user-record').first().getByText('Исполнитель', { exact: true })).toBeVisible();
  for (const record of await page.locator('.user-record').all()) await expect(record.getByText('Исполнитель', { exact: true })).toBeVisible();
  for (const [route, ready, name] of [
    ['/operator/contractors', '.organization-row', 'organizations'],
    ['/operator/analytics', '.analytics-register', 'analytics'],
    ['/operator/audit', '.audit-list article', 'audit'],
  ]) {
    await navigate(page, route!);
    await expect(page.locator(ready!).first()).toBeVisible();
    await capture(page, info, name!, issues);
  }
  expect(issues).toEqual([]);
});
