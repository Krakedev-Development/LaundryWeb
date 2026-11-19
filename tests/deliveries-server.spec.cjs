const { test, expect } = require('./support/fixtures.cjs');

// Entregas contra el servidor: sin botones locales "Despachar" / "Entregada".
const cors = { 'access-control-allow-origin': '*' };
const preflight = {
  ...cors,
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};
const ORDER = 'ord-del-001';
const DRIVER = 'drv-1';

const detail = (status, extra = {}) => ({
  id: ORDER,
  number: 42,
  status,
  mode: 'HOME_HOME',
  facilityId: 'f1',
  paymentStatus: 'PAID',
  pricingStatus: 'FINAL',
  pricingModel: 'FIXED',
  total: '22.00',
  itemsSubtotal: '15',
  extrasTotal: '0',
  discount: '0',
  membershipDiscount: '0',
  logisticsFee: '5',
  tax: '2',
  policyVersion: 1,
  version: 8,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
  items: [],
  events: [],
  customer: { user: { name: 'Luis Mora', phone: '099000111' } },
  legs: [
    {
      id: 'leg-out',
      orderId: ORDER,
      kind: 'OUTBOUND',
      method: 'DRIVER',
      status: status === 'READY_FOR_DELIVERY' ? 'SCHEDULED' : 'IN_PROGRESS',
      addressText: 'Cdla. Kennedy Norte Mz 1',
      latitude: -2.16,
      longitude: -79.9,
      scheduledDate: '2026-11-19',
      slotId: 'slot-1',
      slot: {
        id: 'slot-1',
        date: '2026-11-19',
        startTime: '16:00',
        endTime: '18:00',
        capacity: 10,
        reservedCount: 1,
      },
      driverId: status === 'READY_FOR_DELIVERY' ? null : DRIVER,
      driver: status === 'READY_FOR_DELIVERY' ? null : { userId: 'u-drv' },
    },
  ],
  ...extra,
});

async function mockDeliveries(page, { listFail = false, status = 'DELIVERY_ASSIGNED' } = {}) {
  const state = { order: detail(status) };
  const calls = [];
  const json = (route, code, body) =>
    route.fulfill({
      status: code,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

  await page.route(/\/api\/v1\/(orders|drivers)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/drivers') {
      return json(route, 200, [
        {
          id: DRIVER,
          userId: 'u-drv',
          name: 'Carlos Pérez',
          email: 'carlos@test.com',
          phone: '099',
          status: 'AVAILABLE',
          vehicle: 'VAN',
          plate: 'GSE-1',
          facilityId: 'f1',
          facilityName: 'Sede Norte',
          latitude: -2.1,
          longitude: -79.9,
          locationAt: null,
          activeLegsCount: 0,
        },
      ]);
    }
    if (path === '/orders') {
      if (listFail) return json(route, 500, { message: 'Base de datos no disponible.' });
      const want = url.searchParams.get('status');
      const data = want === state.order.status ? [{ ...state.order }] : [];
      return json(route, 200, { page: 1, pageSize: 100, total: data.length, data });
    }
    if (path === `/orders/${ORDER}/assign`) {
      const body = req.postDataJSON();
      calls.push(['assign', body]);
      state.order = detail('DELIVERY_ASSIGNED');
      state.order.version = body.expectedVersion + 1;
      state.order.legs[0].driverId = body.driverId;
      return json(route, 201, state.order);
    }
    if (path === `/orders/${ORDER}`) return json(route, 200, state.order);
    return json(route, 200, []);
  });
  return { state, calls };
}

test('la lista carga del servidor y no ofrece Despachar ni Entregada locales', async ({ page }) => {
  await mockDeliveries(page, { status: 'DELIVERY_ASSIGNED' });
  await page.goto('/operations/deliveries', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Entregas', exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('SOL-0042')).toBeVisible();
  await expect(page.getByRole('table').getByText('Luis Mora')).toBeVisible();
  await expect(page.getByRole('table').getByText('Chofer asignado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Despachar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Entregada' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Validar salida' })).toBeVisible();
});

test('si el servidor falla se muestra error con Reintentar', async ({ page }) => {
  let fail = true;
  await page.route(/\/api\/v1\/(orders|drivers)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    const json = (code, body) =>
      route.fulfill({
        status: code,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    if (path === '/drivers') return json(200, []);
    if (path === '/orders' && fail) return json(500, { message: 'Base de datos no disponible.' });
    if (path === '/orders') return json(200, { page: 1, pageSize: 100, total: 0, data: [] });
    return json(200, []);
  });
  await page.goto('/operations/deliveries', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert')).toContainText('No se pudieron cargar las entregas');
  fail = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('No hay entregas a domicilio en estas etapas.')).toBeVisible();
});

test('asignar chofer llama POST /orders/:id/assign OUTBOUND en el servidor', async ({ page }) => {
  const { calls } = await mockDeliveries(page, { status: 'READY_FOR_DELIVERY' });
  await page.goto('/operations/deliveries', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('table').getByText('SOL-0042')).toBeVisible();
  await page.getByLabel('Chofer de entrega').selectOption(DRIVER);
  await page.getByRole('button', { name: 'Asignar chofer en servidor' }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0][0]).toBe('assign');
  expect(calls[0][1]).toMatchObject({ leg: 'OUTBOUND', driverId: DRIVER, expectedVersion: 8 });
  await expect(page.getByRole('table').getByText('Chofer asignado')).toBeVisible();
  await expect(page.getByRole('table').getByText('Carlos Pérez')).toBeVisible();
});
