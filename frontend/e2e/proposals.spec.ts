import { test, expect, type Page } from '@playwright/test';
import proposalsMock from '../src/mocks/proposals.json' with { type: 'json' };

// These specs mock the whole API so they run without the backend.
const API = 'http://localhost:8080';
const TRIP_ID = 'abc';
const CREATOR_ID = 'creator-1';

const trip = {
  id: TRIP_ID,
  title: 'Escapada de otoño',
  windowStart: '2026-10-01',
  windowEnd: '2026-10-31',
  status: 'VOTING',
  createdAt: '2026-09-01T10:00:00Z',
  creatorId: CREATOR_ID,
  preferredDurationDays: 4,
};

const summary = {
  availabilityByDate: { '2026-10-02': 4, '2026-10-03': 4, '2026-10-04': 4, '2026-10-05': 4 },
  budget: 300,
  totalParticipants: 4,
};

interface MockOptions {
  user?: { id: string; name: string; email: string } | null;
  editToken?: string | null;
  status?: string;
  proposals?: unknown[];
}

/** Stateful proposals mock: a PUT to /votes moves the (single) participant's vote. */
async function mockApi(page: Page, options: MockOptions = {}) {
  const { user = null, editToken = 'edit-token', status = 'VOTING' } = options;
  const state = {
    status,
    myVote: null as string | null,
    proposals: structuredClone(options.proposals ?? proposalsMock.proposals) as {
      id: string;
      votes: number;
    }[],
  };
  const votes: unknown[] = [];

  const body = () => ({
    ...proposalsMock,
    tripId: TRIP_ID,
    status: state.status,
    myVoteProposalId: state.myVote,
    proposals: state.proposals,
  });

  await page.route(`${API}/trips/${TRIP_ID}`, (route) =>
    route.fulfill({ json: { ...trip, status: state.status } }),
  );
  await page.route(`${API}/trips/${TRIP_ID}/summary`, (route) =>
    route.fulfill({ json: summary }),
  );
  await page.route(`${API}/api/me`, (route) =>
    user ? route.fulfill({ json: user }) : route.fulfill({ status: 401, body: '' }),
  );
  await page.route(`${API}/api/csrf`, (route) =>
    route.fulfill({
      status: 204,
      headers: { 'Set-Cookie': 'XSRF-TOKEN=csrf-test; Path=/' },
    }),
  );
  await page.route(`${API}/trips/${TRIP_ID}/proposals`, (route) => {
    if (route.request().method() === 'POST') {
      state.status = 'VOTING';
      return route.fulfill({ status: 201, json: body() });
    }
    return route.fulfill({ json: body() });
  });
  await page.route(`${API}/trips/${TRIP_ID}/votes`, (route) => {
    const { proposalId } = route.request().postDataJSON() as { proposalId: string };
    votes.push({ proposalId, token: route.request().headers()['x-edit-token'] });
    for (const proposal of state.proposals) {
      if (proposal.id === state.myVote) proposal.votes -= 1;
      if (proposal.id === proposalId) proposal.votes += 1;
    }
    state.myVote = proposalId;
    return route.fulfill({ json: { proposalId } });
  });

  if (editToken) {
    await page.addInitScript(
      ([key, token]) => localStorage.setItem(key, token),
      [`tripsync:editToken:${TRIP_ID}`, editToken],
    );
  }

  return { votes, state };
}

const card = (page: Page, destination: string) =>
  page.getByRole('article', { name: destination });

test.describe('Propuestas de viaje', () => {
  test('muestra las tres tarjetas con su información', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await expect(page.getByRole('heading', { name: '¿A dónde vamos?' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);

    const guadarrama = card(page, 'Sierra de Guadarrama');
    await expect(guadarrama).toBeVisible();
    await expect(guadarrama.getByText('Consenso · España')).toBeVisible();
    await expect(guadarrama.getByText('Encaje 92 %')).toBeVisible();
    await expect(guadarrama.getByText('2–5 oct')).toBeVisible();
    await expect(guadarrama.getByText(/≈ 185\s€\/persona/)).toBeVisible();
    await expect(guadarrama.getByText('A 1 persona le supera el presupuesto')).toBeVisible();
    await expect(card(page, 'Lisboa y Sintra').getByText('A 2 personas les supera el presupuesto')).toBeVisible();
    await expect(card(page, 'Valencia').getByText(/supera el presupuesto/)).toHaveCount(0);
    await expect(guadarrama.getByTestId('votes')).toHaveText('3 votos');
    await expect(page.getByText('Estimaciones orientativas generadas por IA')).toBeVisible();
  });

  test('vota y cambia de voto con el recuento actualizado', async ({ page }) => {
    const { votes } = await mockApi(page);
    await page.goto(`/trips/${TRIP_ID}/summary`);

    const valencia = card(page, 'Valencia');
    const lisboa = card(page, 'Lisboa y Sintra');

    await valencia.getByRole('button', { name: 'Votar' }).click();
    await expect(valencia.getByRole('button', { name: 'Tu voto ✓' })).toBeVisible();
    await expect(valencia.getByTestId('votes')).toHaveText('2 votos');

    await lisboa.getByRole('button', { name: 'Votar' }).click();
    await expect(lisboa.getByRole('button', { name: 'Tu voto ✓' })).toBeVisible();
    await expect(lisboa.getByTestId('votes')).toHaveText('1 voto');
    await expect(valencia.getByTestId('votes')).toHaveText('1 voto');
    await expect(valencia.getByRole('button', { name: 'Votar' })).toBeVisible();

    expect(votes).toEqual([
      { proposalId: '22222222-2222-2222-2222-222222222222', token: 'edit-token' },
      { proposalId: '33333333-3333-3333-3333-333333333333', token: 'edit-token' },
    ]);
  });

  test('sin edit token se ve el resultado pero no se puede votar', async ({ page }) => {
    await mockApi(page, { editToken: null });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Votar' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'unirte al viaje' })).toHaveAttribute(
      'href',
      `/trips/${TRIP_ID}`,
    );
  });

  test('"Generar viajes" no aparece sin sesión de creador', async ({ page }) => {
    // Signed out, and signed in as somebody who is not the creator.
    await mockApi(page, { user: null });
    await page.goto(`/trips/${TRIP_ID}/summary`);
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Generar viajes|Regenerar|Cerrar votación/ })).toHaveCount(0);

    await page.unrouteAll();
    await mockApi(page, {
      user: { id: 'someone-else', name: 'Otra', email: 'otra@example.com' },
    });
    await page.goto(`/trips/${TRIP_ID}/summary`);
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Generar viajes|Regenerar|Cerrar votación/ })).toHaveCount(0);
  });

  test('el creador ve los controles y genera con el CSRF', async ({ page }) => {
    await mockApi(page, {
      user: { id: CREATOR_ID, name: 'Albert', email: 'a@example.com' },
      status: 'OPEN',
      proposals: [],
    });
    // Empty until the first generation.
    await page.route(`${API}/trips/${TRIP_ID}/proposals`, (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, json: proposalsMock });
      }
      return route.fulfill({ json: { ...proposalsMock, status: 'OPEN', proposals: [] } });
    });

    await page.goto(`/trips/${TRIP_ID}/summary`);
    const generate = page.getByRole('button', { name: 'Generar viajes' });
    await expect(generate).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().endsWith('/proposals') && req.method() === 'POST',
    );
    await generate.click();
    expect((await request).headers()['x-xsrf-token']).toBe('csrf-test');

    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Regenerar' })).toBeVisible();
    // 3 / 1 / 0 votes: a single leader, so no tie selector.
    await expect(page.getByRole('button', { name: 'Cerrar votación' })).toBeEnabled();
  });

  test('traduce un 429 a su mensaje', async ({ page }) => {
    await mockApi(page, {
      user: { id: CREATOR_ID, name: 'Albert', email: 'a@example.com' },
    });
    await page.route(`${API}/trips/${TRIP_ID}/proposals`, (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 429, body: '' });
      }
      return route.fulfill({ json: proposalsMock });
    });

    await page.goto(`/trips/${TRIP_ID}/summary`);
    await page.getByRole('button', { name: 'Regenerar' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Has alcanzado el límite de generaciones de este viaje',
    );
  });
});
