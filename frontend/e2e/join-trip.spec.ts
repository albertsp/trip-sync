import { test, expect } from '@playwright/test';

test.describe('Unirse a un viaje', () => {
  let tripId: string;

  test.beforeEach(async ({ request }) => {
    const response = await request.post('http://localhost:8080/test/trips', {
      data: {
        title: 'Viaje QA',
        windowStart: '2026-10-01',
        windowEnd: '2026-10-05',
      },
    });
    const trip = await response.json();
    tripId = trip.id;
  });

  test('join page loading with trip data', async ({ page }) => {
  await page.goto(`/trips/${tripId}`);
  await expect(page.getByRole('heading', { name: /cuándo te viene bien/i })).toBeVisible();
});

test('permite escribir el nombre, el presupuesto y elegir divisa', async ({ page }) => {
  await page.goto(`/trips/${tripId}`);

  await page.getByLabel('Tu nombre').fill('Albert');
  await page.getByLabel('Presupuesto').fill('300');
  await page.getByRole('radio', { name: 'USD' }).check();

  await expect(page.getByLabel('Tu nombre')).toHaveValue('Albert');
  await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'EUR' })).not.toBeChecked();
});

test('permite seleccionar una fecha disponible en el calendario', async ({ page }) => {
  await page.goto(`/trips/${tripId}`);

  const day = page.getByRole('button', { name: /, 1 de octubre de 2026/ });
  await day.click();

  await expect(day).toHaveAttribute('aria-pressed', 'true');
});


});