import { readFileSync } from 'node:fs';
import { chooseAddress } from './helpers/address';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { Problem, User } from '../src/types';
import type { NotificationSettings } from '@pulse/shared';

async function session(request: APIRequestContext, email = 'resident@pulse.local') {
  const result = await request.post('/api/auth/demo', { data: { role: 'RESIDENT', email } });
  expect(result.ok()).toBeTruthy();
  const value = await result.json() as { accessToken: string; user: User };
  return { headers: { Authorization: `Bearer ${value.accessToken}` }, user: value.user };
}
async function login(page: Page, email = 'resident@pulse.local') {
  await page.goto('/login');
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
}
async function navigate(page: Page, route: string) {
  await page.evaluate((url) => { history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
}
async function createProblem(request: APIRequestContext) {
  const author = await session(request);
  const result = await request.post('/api/problems', { ...author, data: { title: `E2E feedback ${Date.now()}`, description: 'Тестовое обращение для проверки исправлений вложений и обсуждения.', address: 'Тестовая точка, Новосибирск', latitude: 55.03, longitude: 82.92, category: 'ROAD', priority: 'NORMAL', mediaIds: [] } });
  expect(result.ok()).toBeTruthy();
  return { author, problem: await result.json() as Problem };
}
const imageFile = { name: 'portrait.png', mimeType: 'image/png', buffer: readFileSync(new URL('./fixtures/portrait.png', import.meta.url)) };

test('portrait photo stays above the report text in the publication preview', async ({ page }, info) => {
  if (info.project.name.startsWith('mobile')) await page.setViewportSize({ width: 360, height: 780 });
  await login(page);
  await navigate(page, '/problems/new');
  await chooseAddress(page);
  await page.getByRole('button', { name: 'Далее: категория' }).click();
  await page.getByRole('button', { name: 'Далее: фото' }).click();
  await page.locator('.upload-drop input').setInputFiles(imageFile);
  await expect(page.locator('.upload-grid img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Далее: описание' }).click();
  await page.getByLabel('Короткий заголовок').fill('Проверка вертикального фото');
  await page.getByLabel('Подробности', { exact: true }).fill('Длинное описание для проверки карточки с вертикальной фотографией.');
  await page.getByRole('button', { name: 'Далее: похожие' }).click();
  await page.getByRole('button', { name: /Это другая проблема|Далее: публикация/ }).click();
  const photo = page.locator('.preview-photos img');
  await expect(photo).toHaveCSS('object-fit', 'contain');
  // Read both boxes in the same frame: mobile scroll anchoring may move the
  // page while a newly uploaded image finishes loading.
  const geometry = await page.locator('.preview-card').evaluate((card) => {
    const image = card.querySelector('img')!.getBoundingClientRect();
    const body = card.querySelector('.preview-card__body')!.getBoundingClientRect();
    return { bottom: image.bottom, height: image.height, bodyTop: body.top };
  });
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.bodyTop + 1);
  expect(geometry.height).toBeLessThanOrEqual(340);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath('portrait-preview.png'), fullPage: true });
});

test('author clarification, discussion attachment, deletion and evidence persist', async ({ page, request }) => {
  test.setTimeout(90_000);
  const { author, problem } = await createProblem(request);
  await login(page);
  await navigate(page, `/problems/${problem.id}`);
  await page.getByRole('button', { name: 'Ещё', exact: true }).click();
  await expect(page.getByRole('button', { name: 'История обращения', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'История обращения', exact: true }).click();
  await expect(page.getByRole('tab', { name: /История/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Проблема существует', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ситуация изменилась', exact: true }).click();
  await page.getByLabel('Что изменилось?').fill('Появилось ограждение, проход теперь свободен.');
  await page.getByRole('button', { name: 'Отправить уточнение' }).click();
  await expect(page.getByRole('status')).toContainText('Уточнение опубликовано');
  await page.getByRole('tab', { name: /Обсуждение/ }).click();
  await expect(page.locator('.comments')).toContainText('Появилось ограждение');
  expect((await (await request.get(`/api/problems/${problem.id}`, author)).json() as Problem).confirmationCount).toBe(0);
  const observer = await page.context().newPage();
  await observer.bringToFront();
  await login(observer);
  await navigate(observer, `/problems/${problem.id}`);
  await observer.getByRole('tab', { name: /Обсуждение/ }).click();
  await expect(observer.locator('.comments')).toContainText('Появилось ограждение');
  await page.bringToFront();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Прикрепить фото', exact: true }).click();
  await (await chooserPromise).setFiles(imageFile);
  await expect(page.locator('.comment-form .image-attachments img')).toHaveCount(1);
  await page.getByLabel('Текст сообщения').fill('Фото для проверки удаления вложенного комментария');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  const comment = page.locator('.comment').filter({ hasText: 'Фото для проверки удаления' });
  await expect(comment.locator('img')).toBeVisible();
  const observedComment = observer.locator('.comment').filter({ hasText: 'Фото для проверки удаления' });
  await observer.bringToFront();
  await expect(observedComment.locator('img')).toBeVisible();
  await page.bringToFront();
  await comment.getByRole('button', { name: /Открыть фото/ }).click();
  await expect(page.getByRole('dialog', { name: 'Просмотр фотографии' })).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть фотографию' }).click();
  await comment.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(comment).toHaveCount(0);
  await observer.bringToFront();
  await expect(observedComment).toHaveCount(0);
  const afterDelete = await (await request.get(`/api/problems/${problem.id}`, author)).json() as Problem;
  expect(afterDelete.comments.some((item) => item.body.includes('Фото для проверки удаления') || item.isDeleted)).toBe(false);

  const evidenceChooser = page.waitForEvent('filechooser');
  await observer.getByRole('tab', { name: 'Обзор', exact: true }).click();
  await page.bringToFront();
  await page.getByRole('button', { name: 'Добавить доказательство' }).click();
  await (await evidenceChooser).setFiles(imageFile);
  await expect(page.locator('.evidence-composer img')).toBeVisible();
  await page.getByRole('button', { name: 'Опубликовать фото', exact: true }).click();
  await expect(page.locator('.evidence-published')).toContainText('Фото опубликовано');
  await observer.bringToFront();
  await expect(observer.locator('.photo-section img')).toHaveCount(1);
  await observer.close();
  await page.bringToFront();
  await expect(page.getByRole('button', { name: 'Опубликовать фото', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Обзор', exact: true }).click();
  await expect(page.locator('.photo-section img')).toHaveCount(1);
  const updated = await (await request.get(`/api/problems/${problem.id}`, author)).json() as Problem;
  expect(updated.media).toHaveLength(1);
  expect(updated.media[0]?.kind).toBe('EVIDENCE');
  expect((await request.post(`/api/problems/${problem.id}/evidence`, { ...author, data: { mediaId: updated.media[0]!.id } })).status()).toBe(400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('not-found submission locks all choices and updates only the selected label', async ({ page, request }) => {
  const { problem } = await createProblem(request);
  await login(page, 'resident2@pulse.local');
  await navigate(page, `/problems/${problem.id}`);
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/api/problems/${problem.id}/confirmations`, async (route) => { await gate; await route.continue(); });
  await page.getByRole('button', { name: 'Не обнаружена', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Проблема существует', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Отправляем…', exact: true })).toBeDisabled();
  release();
  await expect(page.getByText('Вы уже оценили ситуацию', { exact: true })).toBeVisible();
});

test('settings survive signing in again and remain isolated between accounts', async ({ page, request }) => {
  const author = await session(request);
  const other = await session(request, 'resident2@pulse.local');
  const original = await (await request.get('/api/profile/settings', author)).json() as NotificationSettings;
  const otherOriginal = await (await request.get('/api/profile/settings', other)).json() as NotificationSettings;
  try {
    await login(page);
    await navigate(page, '/settings');
    await page.getByLabel('Ответы в обсуждениях').setChecked(!original.comments);
    await page.getByRole('button', { name: 'Сохранить настройки' }).click();
    await expect(page.getByRole('status')).toHaveText('Настройки сохранены');
    await login(page);
    await navigate(page, '/settings');
    await expect(page.getByLabel('Ответы в обсуждениях')).toBeChecked({ checked: !original.comments });
    expect(await (await request.get('/api/profile/settings', other)).json()).toEqual(otherOriginal);
    expect((await request.patch('/api/profile/settings', { ...author, data: { ...original, comments: 'false' } })).status()).toBe(400);
  } finally { await request.patch('/api/profile/settings', { ...author, data: original }); }
});

test('foreign uploads cannot be attached to an evidence or comment', async ({ request }) => {
  const { author, problem } = await createProblem(request);
  const other = await session(request, 'resident2@pulse.local');
  const upload = await request.post('/api/uploads/image', { ...other, multipart: { file: imageFile } });
  expect(upload.ok()).toBeTruthy();
  const media = await upload.json() as { id: string };
  expect((await request.post(`/api/problems/${problem.id}/evidence`, { ...author, data: { mediaId: media.id } })).status()).toBe(400);
  expect((await request.post(`/api/problems/${problem.id}/comments`, { ...author, data: { body: 'Чужой файл не должен прикрепляться', mediaIds: [media.id] } })).status()).toBe(400);
  const detail = await (await request.get(`/api/problems/${problem.id}`, author)).json() as Problem;
  expect(detail.comments).toHaveLength(0);
  expect(detail.media).toHaveLength(0);
});

test('mobile drawer covers navigation, scrolls independently and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await login(page);
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  const drawer = page.getByRole('dialog', { name: 'Основная навигация' });
  await expect(drawer).toBeVisible();
  await expect(page.locator('.bottom-nav')).toHaveAttribute('inert', '');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await drawer.getByRole('link', { name: 'Настройки', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toBeFocused();
});
