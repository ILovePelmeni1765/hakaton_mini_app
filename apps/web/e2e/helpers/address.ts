import { expect, type Page } from '@playwright/test';
import type { PersonalAddress } from '@pulse/shared';

export const testAddress: PersonalAddress = {
  address: 'Новосибирск, Красный проспект, 10',
  latitude: 55.0228,
  longitude: 82.9225,
};

export async function chooseAddress(page: Page, address = testAddress) {
  await page.route('**/api/maps/geocode?**', (route) =>
    route.fulfill({ json: { results: [address] } }),
  );
  await page.getByLabel('Найти адрес', { exact: true }).fill(address.address);
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await page.getByRole('button', { name: address.address, exact: true }).click();
  await expect(page.getByLabel('Адрес выбранного места')).toHaveValue(address.address);
}
