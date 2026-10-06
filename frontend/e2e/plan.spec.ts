import { test, expect, type Page } from '@playwright/test';
import proposalsMock from '../src/mocks/proposals.json' with { type: 'json' };

// These specs mock the whole API so they run without the backend.
const API = 'http://localhost:8080';
const TRIP_ID = 'abc';
const CREATOR_ID = 'creator-1';
const WINNER_ID = proposalsMock.proposals[0].id;

const trip = {
  id: TRIP_ID,
  title: 'Escapada de otoño',
  windowStart: '2026-10-01',
  windowEnd: '2026-10-31',
  status: 'CONFIRMED',
  createdAt: '2026-09-01T10:00:00Z',
  creatorId: CREATOR_ID,
  preferredDurationDays: 4,
};

const summary = {
  availabilityByDate: { '2026-10-02': 4, '2026-10-03': 4, '2026-10-04': 4, '2026-10-05': 4 },
  budget: 300,
  totalParticipants: 4,
};

const detail = {
  days: [
    { day: 1, morning: 'Llegada y desayuno en Cercedilla', afternoon: 'Ruta por La Pedriza', evening: 'Cena en grupo' },
    { day: 2, morning: 'Subida a Peñalara', afternoon: 'Comida en Rascafría', evening: 'Juegos de mesa' },
    { day: 3, morning: 'Paseo tranquilo', afternoon: 'Vuelta a casa', evening: 'Descanso' },
  ],
  tips: ['Llevad calzado de montaña', 'Reservad el alojamiento cuanto antes'],
};

interface Task {
  id: string;
  title: string;
  assigneeId: string | null;
  assigneeName: string | null;
  done: boolean;
  mine: boolean;
}

interface MockOptions {
  user?: { id: string; name: string; email: string } | null;
  editToken?: string | null;
  status?: 'CONFIRMED' | 'PLANNING';
  tasks?: Task[];
}

const seedTasks = (): Task[] => [
  { id: 't1', title: 'Reservar alojamiento', assigneeId: null, assigneeName: null, done: false, mine: false },
  { id: 't2', title: 'Organizar el transporte', assigneeId: 'p-2', assigneeName: 'Beto', done: false, mine: false },
  { id: 't3', title: 'Comprar provisiones', assigneeId: 'p-1', assigneeName: 'Ana', done: true, mine: true },
];

async function mockApi(page: Page, options: MockOptions = {}) {
  const { user = null, editToken = 'edit-token' } = options;
  const state = {
    status: options.status ?? 'CONFIRMED',
    tasks: options.tasks ?? seedTasks(),
    planCalls: 0,
  };
  const patches: { id: string; body: unknown; token: string | undefined }[] = [];

  const proposals = () =>
    proposalsMock.proposals.map((p) => ({
      ...p,
      winner: p.id === WINNER_ID,
      detail: p.id === WINNER_ID && state.status === 'PLANNING' ? detail : null,
    }));
  const body = () => ({ ...proposalsMock, tripId: TRIP_ID, status: state.status, proposals: proposals() });

  await page.route(`${API}/trips/${TRIP_ID}`, (route) =>
    route.fulfill({ json: { ...trip, status: state.status } }),
  );
  await page.route(`${API}/trips/${TRIP_ID}/summary`, (route) => route.fulfill({ json: summary }));
  await page.route(`${API}/api/me`, (route) =>
    user ? route.fulfill({ json: user }) : route.fulfill({ status: 401, body: '' }),
  );
  await page.route(`${API}/api/csrf`, (route) =>
    route.fulfill({ status: 204, headers: { 'Set-Cookie': 'XSRF-TOKEN=csrf-test; Path=/' } }),
  );
  await page.route(`${API}/trips/${TRIP_ID}/proposals`, (route) => route.fulfill({ json: body() }));
  await page.route(`${API}/trips/${TRIP_ID}/plan`, (route) => {
    state.planCalls += 1;
    state.status = 'PLANNING';
    return route.fulfill({ json: body() });
  });
  await page.route(`${API}/trips/${TRIP_ID}/tasks`, (route) => {
    if (route.request().method() === 'POST') {
      const { title } = route.request().postDataJSON() as { title: string };
      const created: Task = {
        id: `t${state.tasks.length + 1}`,
        title,
        assigneeId: null,
        assigneeName: null,
        done: false,
        mine: false,
      };
      state.tasks.push(created);
      return route.fulfill({ status: 201, json: created });
    }
    return route.fulfill({ json: state.tasks });
  });
  await page.route(`${API}/trips/${TRIP_ID}/tasks/*`, (route) => {
    const id = route.request().url().split('/').pop() as string;
    const patch = route.request().postDataJSON() as { done?: boolean; claimed?: boolean };
    patches.push({ id, body: patch, token: route.request().headers()['x-edit-token'] });
    const task = state.tasks.find((t) => t.id === id) as Task;
    if (patch.claimed === true) Object.assign(task, { assigneeId: 'p-1', assigneeName: 'Ana', mine: true });
    if (patch.claimed === false) Object.assign(task, { assigneeId: null, assigneeName: null, mine: false });
    if (patch.done !== undefined) task.done = patch.done;
    return route.fulfill({ json: task });
  });

  if (editToken) {
    await page.addInitScript(
      ([key, token]) => localStorage.setItem(key, token),
      [`tripsync:editToken:${TRIP_ID}`, editToken],
    );
  }

  return { state, patches };
}

const creator = { id: CREATOR_ID, name: 'Albert', email: 'a@example.com' };

test.describe('Montar el viaje', () => {
  test('el creador monta el viaje y aparecen itinerario y checklist', async ({ page }) => {
    const { state } = await mockApi(page, { user: creator });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await expect(page.getByRole('article', { name: 'Sierra de Guadarrama' }).getByText('Ganadora')).toBeVisible();
    await expect(page.getByRole('heading', { name: /día a día/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Qué hay que preparar' })).toHaveCount(0);

    const request = page.waitForRequest((req) => req.url().endsWith('/plan') && req.method() === 'POST');
    await page.getByRole('button', { name: 'Montar viaje' }).click();
    expect((await request).headers()['x-xsrf-token']).toBe('csrf-test');

    await expect(page.getByRole('heading', { name: 'Sierra de Guadarrama, día a día' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Día 2' }).getByText('Subida a Peñalara')).toBeVisible();
    await expect(page.getByText('Llevad calzado de montaña')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Qué hay que preparar' })).toBeVisible();
    await expect(page.getByTestId('task-progress')).toHaveText('1 de 3 hechas');
    await expect(page.getByRole('button', { name: 'Regenerar plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Montar viaje' })).toHaveCount(0);
    expect(state.planCalls).toBe(1);
  });

  test('quien no es creador no ve el botón de montar', async ({ page }) => {
    await mockApi(page, { user: { id: 'other', name: 'Otra', email: 'o@example.com' } });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await expect(page.getByRole('article', { name: 'Sierra de Guadarrama' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Montar viaje|Regenerar plan/ })).toHaveCount(0);
  });

  test('traduce un 409 del plan a su mensaje', async ({ page }) => {
    await mockApi(page, { user: creator });
    await page.route(`${API}/trips/${TRIP_ID}/plan`, (route) => route.fulfill({ status: 409, body: '' }));
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await page.getByRole('button', { name: 'Montar viaje' }).click();
    await expect(page.getByRole('alert')).toHaveText('Primero cierra la votación para elegir el viaje');
  });
});

test.describe('Checklist', () => {
  const list = (page: Page) => page.getByRole('listitem').filter({ has: page.getByRole('checkbox') });

  test('muestra las tareas, quién las lleva y el progreso', async ({ page }) => {
    await mockApi(page, { status: 'PLANNING' });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await expect(list(page)).toHaveCount(3);
    await expect(page.getByText('Beto')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tuya · Soltar' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Comprar provisiones' })).toBeChecked();
  });

  test('reclama, suelta y marca tareas con el edit token', async ({ page }) => {
    const { patches } = await mockApi(page, { status: 'PLANNING' });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    const first = list(page).filter({ hasText: 'Reservar alojamiento' });
    await first.getByRole('button', { name: 'Reclamar' }).click();
    await expect(first.getByRole('button', { name: 'Tuya · Soltar' })).toBeVisible();

    await first.getByRole('checkbox').check();
    await expect(page.getByTestId('task-progress')).toHaveText('2 de 3 hechas');

    await first.getByRole('button', { name: 'Tuya · Soltar' }).click();
    await expect(first.getByRole('button', { name: 'Reclamar' })).toBeVisible();

    expect(patches).toEqual([
      { id: 't1', body: { claimed: true }, token: 'edit-token' },
      { id: 't1', body: { done: true }, token: 'edit-token' },
      { id: 't1', body: { claimed: false }, token: 'edit-token' },
    ]);
  });

  test('añade una tarea y valida el título', async ({ page }) => {
    await mockApi(page, { status: 'PLANNING' });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByRole('alert')).toHaveText('Escribe la tarea');

    await page.getByLabel('Añadir una tarea').fill('  Comprar   pilas ');
    await page.getByRole('button', { name: 'Añadir' }).click();

    await expect(list(page)).toHaveCount(4);
    await expect(page.getByRole('checkbox', { name: 'Comprar pilas' })).toBeVisible();
    await expect(page.getByLabel('Añadir una tarea')).toHaveValue('');
  });

  test('muestra el error cuando otra persona reclamó la tarea antes', async ({ page }) => {
    await mockApi(page, { status: 'PLANNING' });
    await page.route(`${API}/trips/${TRIP_ID}/tasks/t1`, (route) => route.fulfill({ status: 409, body: '' }));
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await list(page).filter({ hasText: 'Reservar alojamiento' }).getByRole('button', { name: 'Reclamar' }).click();

    await expect(page.getByRole('alert')).toHaveText('Esta tarea ya la ha reclamado otra persona');
  });

  test('sin edit token se ve la lista pero no se puede editar', async ({ page }) => {
    await mockApi(page, { status: 'PLANNING', editToken: null });
    await page.goto(`/trips/${TRIP_ID}/summary`);

    await expect(list(page)).toHaveCount(3);
    await expect(page.getByRole('checkbox').first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reclamar' })).toHaveCount(0);
    await expect(page.getByLabel('Añadir una tarea')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'unirte al viaje' })).toHaveCount(1);
  });
});
