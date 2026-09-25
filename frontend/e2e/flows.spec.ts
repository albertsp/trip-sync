import { test, expect, type Page } from '@playwright/test';

// These specs mock the API so they run without the backend.
const API = 'http://localhost:8080';

const trip = {
  id: 'abc',
  title: 'Escapada de otoño',
  windowStart: '2026-10-01',
  windowEnd: '2026-10-31',
  status: 'OPEN',
  createdAt: '2026-09-01T10:00:00Z',
};

async function mockTrip(page: Page, overrides: Partial<typeof trip> = {}) {
  await page.route(`${API}/trips/abc`, (route) =>
    route.fulfill({ json: { ...trip, ...overrides } }),
  );
}

test.describe('Unirse a un viaje', () => {
  test.beforeEach(async ({ page }) => {
    await mockTrip(page);
  });

  test('envía nombre, presupuesto, divisa y días, y muestra el sello', async ({ page }) => {
    await page.route(`${API}/trips/abc/participants`, (route) =>
      route.fulfill({
        json: {
          id: '8f3a21c0-1111-2222-3333-444444444444',
          name: 'Albert',
          budgetAmount: 300,
          budgetCurrency: 'USD',
          editToken: 'edit-token',
        },
      }),
    );

    await page.goto('/trips/abc');
    await page.getByLabel('Tu nombre').fill('Albert');
    await page.getByLabel('Presupuesto').fill('300');
    await page.getByRole('radio', { name: 'USD' }).check();
    await page.getByRole('button', { name: /, 9 de octubre de 2026/ }).click();
    await page.getByRole('button', { name: /, 10 de octubre de 2026/ }).click();

    const request = page.waitForRequest(
      (req) => req.url().endsWith('/trips/abc/participants') && req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Unirse al viaje' }).click();

    expect((await request).postDataJSON()).toEqual({
      name: 'Albert',
      budgetAmount: 300,
      budgetCurrency: 'USD',
      availableDates: ['2026-10-09', '2026-10-10'],
    });

    await expect(page.getByRole('heading', { name: '¡Estás dentro!' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Sello: estás dentro' })).toBeVisible();
    await expect(page.getByText('ID 8F3A21C0')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Ver disponibilidad del grupo/ }),
    ).toHaveAttribute('href', '/trips/abc/summary');
    expect(
      await page.evaluate(() => localStorage.getItem('tripsync:editToken:abc')),
    ).toBe('edit-token');
  });

  test('explica qué falta antes de enviar', async ({ page }) => {
    await page.goto('/trips/abc');
    const submit = page.getByRole('button', { name: 'Unirse al viaje' });

    await submit.click();
    await expect(page.getByRole('alert')).toHaveText('Indica tu nombre');

    await page.getByLabel('Tu nombre').fill('Albert');
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText('Indica un presupuesto válido');

    await page.getByLabel('Presupuesto').fill('300');
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText(
      'Debes seleccionar al menos un día disponible',
    );
  });

  test('si el servidor falla, mantiene el formulario y avisa', async ({ page }) => {
    await page.route(`${API}/trips/abc/participants`, (route) =>
      route.fulfill({ status: 500, json: {} }),
    );

    await page.goto('/trips/abc');
    await page.getByLabel('Tu nombre').fill('Albert');
    await page.getByLabel('Presupuesto').fill('300');
    await page.getByRole('button', { name: /, 9 de octubre de 2026/ }).click();
    await page.getByRole('button', { name: 'Unirse al viaje' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'No se ha podido unir al viaje, inténtalo de nuevo',
    );
    await expect(page.getByLabel('Tu nombre')).toHaveValue('Albert');
  });

  test('un viaje cerrado no admite nuevas disponibilidades', async ({ page }) => {
    await page.unroute(`${API}/trips/abc`);
    await mockTrip(page, { status: 'CLOSED' });

    await page.goto('/trips/abc');

    await expect(
      page.getByRole('heading', { name: 'Este viaje ya está cerrado' }),
    ).toBeVisible();
    await expect(page.getByLabel('Tu nombre')).toHaveCount(0);
  });
});

test.describe('Crear un viaje', () => {
  async function mockSession(page: Page, loggedIn: boolean) {
    await page.route(`${API}/api/csrf`, (route) => route.fulfill({ status: 200, body: '' }));
    await page.route(`${API}/api/me`, (route) =>
      loggedIn
        ? route.fulfill({ json: { name: 'Albert', email: 'albert@example.com' } })
        : route.fulfill({ status: 401, body: '' }),
    );
  }

  test('con sesión: crea el viaje y muestra el enlace de invitación', async ({ page }) => {
    await mockSession(page, true);
    await page.route(`${API}/trips`, (route) => route.fulfill({ json: trip }));

    await page.goto('/');
    await expect(page.getByText('Hola, Albert')).toBeVisible();

    await page.getByLabel('Título del viaje').fill('Escapada de otoño');
    await page.getByLabel('Desde').fill('2026-10-01');
    await page.getByLabel('Hasta').fill('2026-10-31');

    const request = page.waitForRequest(
      (req) => req.url() === `${API}/trips` && req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear viaje' }).click();

    expect((await request).postDataJSON()).toEqual({
      title: 'Escapada de otoño',
      windowStart: '2026-10-01',
      windowEnd: '2026-10-31',
    });
    await expect(page.getByRole('heading', { name: '¡Viaje creado!' })).toBeVisible();
    await expect(page.getByLabel('Enlace de invitación')).toHaveValue(/\/trips\/abc$/);
    await expect(page.getByRole('link', { name: /Ir al viaje/ })).toHaveAttribute(
      'href',
      '/trips/abc',
    );
  });

  test('valida el rango de fechas antes de enviar', async ({ page }) => {
    await mockSession(page, true);

    await page.goto('/');
    await page.getByLabel('Título del viaje').fill('Escapada de otoño');
    await page.getByLabel('Desde').fill('2026-10-20');
    await page.getByLabel('Hasta').fill('2026-10-10');
    await page.getByRole('button', { name: 'Crear viaje' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'La fecha de fin debe ser posterior a la de inicio',
    );
  });

  test('sin sesión: el formulario abre el diálogo de acceso con Google', async ({ page }) => {
    await mockSession(page, false);

    await page.goto('/');
    await page
      .getByRole('button', { name: 'Inicia sesión con Google para crear el viaje' })
      .click();

    const dialog = page.getByRole('dialog', { name: 'Bienvenido a TripSync' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Continuar con Google/ })).toHaveAttribute(
      'href',
      /\/oauth2\/authorization\/google$/,
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('Resumen: cifras', () => {
  test('cuenta hasta el presupuesto mínimo y el número de participantes', async ({ page }) => {
    await mockTrip(page);
    await page.route(`${API}/trips/abc/summary`, (route) =>
      route.fulfill({
        json: {
          availabilityByDate: { '2026-10-10': 2, '2026-10-11': 2 },
          budget: 250,
          totalParticipants: 3,
        },
      }),
    );

    await page.goto('/trips/abc/summary');

    const budget = page.locator('.stat-tile', { hasText: 'Presupuesto sugerido' });
    const people = page.locator('.stat-tile', { hasText: 'Participantes' });

    await expect(budget.locator('.stat-value')).toHaveText('250');
    await expect(people.locator('.stat-value')).toHaveText('3');
    await expect(people).toContainText('personas han marcado sus días');
  });

  test('sin participantes invita a ser el primero', async ({ page }) => {
    await mockTrip(page);
    await page.route(`${API}/trips/abc/summary`, (route) =>
      route.fulfill({ json: { availabilityByDate: {}, budget: null, totalParticipants: 0 } }),
    );

    await page.goto('/trips/abc/summary');

    await expect(page.getByText('Aún no hay días en común')).toBeVisible();
    await expect(page.getByText(/sé el primero en unirte/)).toBeVisible();
  });
});

test.describe('Tema', () => {
  test('el botón cambia entre claro y oscuro y recuerda la elección', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.route(`${API}/api/**`, (route) => route.fulfill({ status: 401, body: '' }));

    await page.goto('/');
    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Cambiar a tema claro' })).toBeVisible();
  });
});
