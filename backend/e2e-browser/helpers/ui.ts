import { expect, Page } from '@playwright/test';

export async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function waitForAuthenticatedUi(page: Page) {
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

export async function logoutThroughUi(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function waitForToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text)).toBeVisible();
}

export async function selectUserFromLookup(
  page: Page,
  label: string,
  query: string,
  expectedEmail: string,
) {
  await page.getByLabel(label).fill(query);
  const option = page
    .locator('button')
    .filter({ hasText: expectedEmail })
    .first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByText(new RegExp(`Seleccionado: .*${expectedEmail}`, 'i'))).toBeVisible();
}
