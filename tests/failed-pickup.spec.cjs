const { test, expect } = require('./support/fixtures.cjs');

// Solicitud retenida por recogida fallida: la sede la reprograma o la cancela contra el servidor.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guayaquil',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const plus = (days) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function mockServer(page, facilityId) {
  const state = {
    order: {
      id: ORDER,
      number: 1001,
      status: 'INCIDENT',
      mode: 'HOME_HOME',
      facilityId,
      paymentStatus: 'PAID',
      pricingStatus: 'ESTIMATED',
      total: '12.50',
      version: 4,
      createdAt: new Date().toISOString(),
      items: [],
      legs: [],
      events: [],
    },
    incident: {
      id: 'inc-1',
      orderId: ORDER,
      type: 'FAILED_PICKUP',
      severity: 'MEDIUM',
      status: 'OPEN',
      description: 'Cliente ausente: tocó el timbre 3 veces',
      createdAt: new Date().toISOString(),
    },
  };
  const calls = [];
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(/\/api\/v1\/(orders|incidents|slots)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const body = req.method() === 'GET' ? undefined : req.postDataJSON();
    if (req.method() !== 'GET') calls.push([req.method(), path, body]);
    if (path === '/incidents') return json(route, 200, [state.incident]);
    if (path === '/slots')
      return json(route, 200, [
        { id: 'slot-new', facilityId, context: 'DRIVER_PICKUP', date: plus(1), startTime: '08:00', endTime: '12:00', capacity: 5, reservedCount: 1, available: 4, active: true },
        { id: 'slot-full', facilityId, context: 'DRIVER_PICKUP', date: plus(1), startTime: '13:00', endTime: '17:00', capacity: 2, reservedCount: 2, available: 0, active: true },
      ]);
    if (path === `/orders/${ORDER}/inbound`) {
      state.order.version += 1;
      return json(route, 200, state.order);
    }
    if (path === '/incidents/inc-1/status') {
      state.incident.status = 'RESOLVED';
      state.order = { ...state.order, status: 'CONFIRMED', version: state.order.version + 1 };
      return json(route, 201, state.incident);
    }
    if (path === `/orders/${ORDER}/cancel`) {
      state.incident.status = 'CLOSED';
      state.order = { ...state.order, status: 'CANCELLED', paymentStatus: 'REFUNDED', version: state.order.version + 1 };
      return json(route, 201, state.order);
    }
    if (path === `/orders/${ORDER}`) return json(route, 200, state.order);
    return json(route, 200, []);
  });
  return calls;
}

async function facilityOf(page) {
  await page.goto('/operations/orders', { waitUntil: 'domcontentloaded' });
  return page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    return (raw.orders || []).find((o) => o.id === id)?.facilityId ?? 'f1';
  }, ORDER);
}

test('la sede reprograma la recogida fallida y la solicitud vuelve a Confirmada', async ({ page }) => {
  const facilityId = await facilityOf(page);
  const calls = await mockServer(page, facilityId);
  await page.goto(`/operations/orders/${ORDER}`, { waitUntil: 'domcontentloaded' });
  const panel = page.getByRole('region', { name: 'Recogida fallida' });
  await expect(panel).toContainText('Cliente ausente: tocó el timbre 3 veces');
  // Solo se ofrecen franjas con cupo.
  const select = panel.getByRole('combobox', { name: 'Nueva franja de recogida' });
  await expect(select.locator('option')).toHaveCount(2);
  await select.selectOption('slot-new');
  await panel.getByRole('button', { name: 'Reprogramar recogida', exact: true }).click();
  await expect(page.getByText(/Nueva recogida: .* 08:00 - 12:00\. Asigna un chofer/)).toBeVisible();
  expect(calls.map(([m, p]) => [m, p])).toEqual([
    ['PUT', `/orders/${ORDER}/inbound`],
    ['POST', '/incidents/inc-1/status'],
  ]);
  expect(calls[0][2]).toEqual({ expectedVersion: 4, slotId: 'slot-new' });
  expect(calls[1][2]).toMatchObject({ status: 'RESOLVED' });
  await expect(panel).toHaveCount(0);
});

test('la sede cancela la solicitud retenida con un motivo obligatorio', async ({ page }) => {
  const facilityId = await facilityOf(page);
  const calls = await mockServer(page, facilityId);
  await page.goto(`/operations/orders/${ORDER}`, { waitUntil: 'domcontentloaded' });
  const panel = page.getByRole('region', { name: 'Recogida fallida' });
  await panel.getByRole('button', { name: 'Cancelar solicitud', exact: true }).click();
  await expect(page.getByText('Indica el motivo de la cancelación')).toBeVisible();
  expect(calls).toEqual([]);
  await panel.getByLabel('Motivo de la cancelación', { exact: true }).fill('El cliente desistió');
  await panel.getByRole('button', { name: 'Cancelar solicitud', exact: true }).click();
  await expect(page.getByRole('status').getByText('Solicitud cancelada', { exact: true })).toBeVisible();
  expect(calls).toEqual([
    ['POST', `/orders/${ORDER}/cancel`, { expectedVersion: 4, reason: 'El cliente desistió' }],
  ]);
  await expect(panel).toHaveCount(0);
});
