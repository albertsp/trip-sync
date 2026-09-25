import { test, expect, type Locator, type Page } from '@playwright/test';

// These specs mock the API so they run without the backend.
const API = 'http://localhost:8080';

async function mockTrip(page: Page, windowStart: string, windowEnd: string) {
  await page.route(`${API}/trips/abc`, (route) =>
    route.fulfill({
      json: {
        id: 'abc',
        title: 'Escapada de otoño',
        windowStart,
        windowEnd,
        status: 'OPEN',
        createdAt: '2026-09-01T10:00:00Z',
      },
    }),
  );
}

// Entrance and pop animations move cells under a stationary pointer; wait them out.
const settle = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  );

const day = (page: Page, label: RegExp) =>
  page.getByRole('button', { name: label });

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('Calendario: elegir días', () => {
  test.beforeEach(async ({ page }) => {
    await mockTrip(page, '2026-10-01', '2026-10-31');
    await page.goto('/trips/abc');
    await expect(page.getByRole('heading', { name: 'Octubre 2026' })).toBeVisible();
  });

  test('un clic marca y desmarca un día y actualiza el contador', async ({ page }) => {
    const oct5 = day(page, /, 5 de octubre de 2026/);

    await oct5.click();
    await expect(oct5).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('1 día marcado')).toBeVisible();

    await oct5.click();
    await expect(oct5).toHaveAttribute('aria-pressed', 'false');
  });

  test('arrastrar marca todos los días del recorrido', async ({ page }) => {
    const from = await center(day(page, /, 5 de octubre de 2026/));
    const to = await center(day(page, /, 8 de octubre de 2026/));

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();

    for (const d of [5, 6, 7, 8]) {
      await expect(day(page, new RegExp(`, ${d} de octubre de 2026`))).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
    await expect(page.getByText('4 días marcados')).toBeVisible();
  });

  test('arrastrar desde un día marcado desmarca el recorrido', async ({ page }) => {
    await day(page, /, 6 de octubre de 2026/).click();
    await day(page, /, 7 de octubre de 2026/).click();
    await settle(page);

    const from = await center(day(page, /, 6 de octubre de 2026/));
    const to = await center(day(page, /, 7 de octubre de 2026/));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();

    await expect(day(page, /, 6 de octubre de 2026/)).toHaveAttribute('aria-pressed', 'false');
    await expect(day(page, /, 7 de octubre de 2026/)).toHaveAttribute('aria-pressed', 'false');
  });

  test('las flechas mueven el foco y Espacio marca el día', async ({ page }) => {
    await day(page, /, 1 de octubre de 2026/).focus();

    await page.keyboard.press('ArrowRight');
    await expect(day(page, /, 2 de octubre de 2026/)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(day(page, /, 9 de octubre de 2026/)).toBeFocused();

    await page.keyboard.press('Space');
    await expect(day(page, /, 9 de octubre de 2026/)).toHaveAttribute('aria-pressed', 'true');
  });

  test('Borrar selección deja el calendario vacío', async ({ page }) => {
    await day(page, /, 3 de octubre de 2026/).click();
    await day(page, /, 4 de octubre de 2026/).click();
    await expect(page.getByText('2 días marcados')).toBeVisible();

    await page.getByRole('button', { name: 'Borrar selección' }).click();

    await expect(page.getByText('0 días marcados')).toBeVisible();
    await expect(day(page, /, 3 de octubre de 2026/)).toHaveAttribute('aria-pressed', 'false');
  });

  test('los días fuera de la ventana del viaje no se pueden marcar', async ({ page }) => {
    await page.unroute(`${API}/trips/abc`);
    await mockTrip(page, '2026-10-10', '2026-10-20');
    await page.goto('/trips/abc');

    await expect(day(page, /, 9 de octubre de 2026/)).toBeDisabled();
    await expect(day(page, /, 10 de octubre de 2026/)).toBeEnabled();
    await expect(day(page, /, 21 de octubre de 2026/)).toBeDisabled();
  });
});

test.describe('Calendario: ventana entre varios meses', () => {
  test('navega entre meses con los botones y con RePág y AvPág', async ({ page }) => {
    await mockTrip(page, '2026-10-20', '2026-11-10');
    await page.goto('/trips/abc');

    const previous = page.getByRole('button', { name: 'Mes anterior' });
    const next = page.getByRole('button', { name: 'Mes siguiente' });

    await expect(page.getByRole('heading', { name: 'Octubre 2026' })).toBeVisible();
    await expect(previous).toBeDisabled();

    await next.click();
    await expect(page.getByRole('heading', { name: 'Noviembre 2026' })).toBeVisible();
    await expect(next).toBeDisabled();

    await previous.click();
    await day(page, /, 20 de octubre de 2026/).focus();
    await page.keyboard.press('PageDown');
    await expect(page.getByRole('heading', { name: 'Noviembre 2026' })).toBeVisible();
    // Nov 20 is past the window, so focus lands on its last day.
    await expect(day(page, /, 10 de noviembre de 2026/)).toBeFocused();
  });
});

test.describe('Resumen del grupo', () => {
  test.beforeEach(async ({ page }) => {
    await mockTrip(page, '2026-10-01', '2026-10-31');
    await page.route(`${API}/trips/abc/summary`, (route) =>
      route.fulfill({
        json: {
          availabilityByDate: {
            '2026-10-03': 1,
            '2026-10-09': 2,
            '2026-10-10': 5,
            '2026-10-11': 5,
            '2026-10-16': 4,
            '2026-10-17': 5,
            '2026-10-18': 5,
            '2026-10-24': 3,
          },
          budget: 250,
          totalParticipants: 5,
        },
      }),
    );
    await page.goto('/trips/abc/summary');
    await expect(page.getByRole('heading', { name: 'Disponibilidad del grupo' })).toBeVisible();
    await settle(page);
  });

  test('destaca la mejor ventana del grupo', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sáb 10 – Dom 11 oct' })).toBeVisible();
    await expect(page.getByText('5 de 5 pueden · 2 días seguidos')).toBeVisible();

    await expect(day(page, /, 10 de octubre de 2026/)).toHaveAttribute('data-best', 'true');
    await expect(day(page, /, 12 de octubre de 2026/)).not.toHaveAttribute('data-best', 'true');
  });

  test('cada día muestra cuánta gente puede, también para lectores de pantalla', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'sábado, 17 de octubre de 2026: 5 de 5 disponibles' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'sábado, 10 de octubre de 2026: 5 de 5 disponibles' }),
    ).toBeVisible();
  });

  test('pasar por un día muestra el detalle', async ({ page }) => {
    await day(page, /, 24 de octubre de 2026/).hover();
    await expect(page.getByText('Sábado, 24 de octubre de 2026 · 3 de 5 pueden')).toBeVisible();
  });
});
