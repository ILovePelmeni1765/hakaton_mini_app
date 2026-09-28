import { expect, test } from '@playwright/test';

test('onboarding and login are responsive smoke screens', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText('Пульс города', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByText('Пропустить знакомство').click();
  await expect(page.getByRole('heading', { name: 'Войти в Пульс' })).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});
