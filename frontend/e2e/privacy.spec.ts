import { test, expect } from '@playwright/test';

test.describe('Privacidad', () => {
  test('la política es accesible desde el inicio y explica el uso de IA', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Privacidad' }).click();

    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.getByRole('heading', { name: 'Privacidad', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inteligencia artificial' })).toBeVisible();
    await expect(page.getByText(/sin nombres ni correos/)).toBeVisible();

    await page.getByRole('link', { name: '← Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
