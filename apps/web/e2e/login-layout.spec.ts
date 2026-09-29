import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test('login composition fits desktop and remains safe on mobile', async ({ page }, testInfo) => {
  const reviewDirectory = testInfo.outputPath('review');
  mkdirSync(reviewDirectory, { recursive: true });

  for (const viewport of [{ width: 1280, height: 720 }, { width: 1904, height: 913 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Ваш сигнал запускает изменения' })).toBeVisible();

    const metrics = await page.evaluate(() => ({
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);

    const flow = await page.locator('.login-tile--flow').boundingBox();
    const card = await page.locator('.login-card').boundingBox();
    expect(flow).not.toBeNull();
    expect(card).not.toBeNull();
    expect(flow!.y + flow!.height).toBeLessThanOrEqual(viewport.height - 8);
    expect(card!.y).toBeLessThanOrEqual(64);

    if (viewport.width === 1904) {
      await page.screenshot({ path: path.join(reviewDirectory, 'login-desktop.png'), fullPage: false });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login', { waitUntil: 'networkidle' });
  const mobileMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileMetrics.scrollWidth).toBeLessThanOrEqual(mobileMetrics.clientWidth + 1);
  await expect(page.locator('.login-brandbar')).toBeVisible();
  await expect(page.locator('.login-panel')).toBeVisible();
  await page.screenshot({ path: path.join(reviewDirectory, 'login-mobile.png'), fullPage: true });
});
