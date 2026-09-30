import { test, expect } from '@playwright/test';

// Estos tests usan el backend real (POST /test/trips), a diferencia de flows.spec.ts que mockea la red.
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

  test('el tipo de destino no viene preseleccionado y es de selección única', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    for (const name of ['Montaña', 'Playa', 'Ciudad', 'Circuito', 'Indiferente']) {
      await expect(page.getByRole('radio', { name })).not.toBeChecked();
    }

    await page.getByRole('radio', { name: 'Playa' }).check();
    await page.getByRole('radio', { name: 'Montaña' }).check();
    await expect(page.getByRole('radio', { name: 'Montaña' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Playa' })).not.toBeChecked();
  });

  test('los intereses admiten selección múltiple', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    await page.getByRole('checkbox', { name: 'Cultura' }).check();
    await page.getByRole('checkbox', { name: 'Deporte' }).check();
    await expect(page.getByRole('checkbox', { name: 'Cultura' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Deporte' })).toBeChecked();

    await page.getByRole('checkbox', { name: 'Cultura' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'Cultura' })).not.toBeChecked();
  });

  test('las notas limitan a 200 caracteres y muestran contador', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    await page.getByLabel(/Notas/).fill('a'.repeat(250));
    await expect(page.getByLabel(/Notas/)).toHaveValue('a'.repeat(200));
    await expect(page.getByText('200/200')).toBeVisible();
  });

  test('el tipo de destino y la ciudad de origen son obligatorios', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);
    const submit = page.getByRole('button', { name: 'Unirse al viaje' });

    await page.getByLabel('Tu nombre').fill('Albert');
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText('Elige el tipo de destino');

    await page.getByRole('radio', { name: 'Ciudad' }).check();
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText('Indica tu ciudad de origen');

    await page.getByLabel('Ciudad de origen').fill('   ');
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText('Indica tu ciudad de origen');
  });

  test('permite seleccionar una fecha disponible en el calendario', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    const day = page.getByRole('button', { name: /, 1 de octubre de 2026/ });
    await day.click();

    await expect(day).toHaveAttribute('aria-pressed', 'true');
  });
});
