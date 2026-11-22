const { test, expect } = require('./support/fixtures.cjs');

// Planta contra un servidor simulado: la lista, el historial, el proceso y la retención salen del
// servidor. Si el servidor falla se muestra el error; nunca se usan datos ni botones locales.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

const legs = (id) => [
  { id: `${id}-in`, orderId: id, kind: 'INBOUND', method: 'DRIVER', status: 'COMPLETED', addressText: 'Av. Samborondón km 2', latitude: '-2.14', longitude: '-79.86' },
  { id: `${id}-out`, orderId: id, kind: 'OUTBOUND', method: 'DRIVER', status: 'PENDING', addressText: 'Av. Samborondón km 2', latitude: '-2.14', longitude: '-79.86' },
];
const order = (id, number, status, name, extra = {}) => ({
  id, number, status, mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PAID', pricingStatus: 'FINAL',
  pricingModel: 'FIXED', total: '18.00', amountPaid: '18.00', amountDue: '0', version: 7,
  createdAt: '2026-11-19T13:00:00.000Z', items: [], legs: legs(id), extras: [],
  customer: { id: `c-${id}`, user: { name, email: `${id}@correo.test`, phone: '0990000000' } },
  events: [
    { id: `${id}-e1`, orderId: id, status: 'AT_FACILITY', title: 'Recibido en planta', description: null, actorId: null, actorRole: 'SUPERVISOR', createdAt: '2026-11-19T14:00:00.000Z' },
  ],
  incidents: [],
  ...extra,
});

async function mockServer(page) {
  const mode = { list: 'ok', detail: 'ok' };
  const orders = [
    order('o-wash', 2001, 'IN_PROCESS', 'Ana Ruiz'),
    order('o-held', 2002, 'INCIDENT', 'Luis Mora', {
      incidents: [{ id: 'inc-held', status: 'OPEN', previousStatus: 'QUALITY_CONTROL' }],
    }),
  ];
  const incidents = [
    { id: 'inc-held', orderId: 'o-held', type: 'PRENDA_DANADA', severity: 'HIGH', status: 'OPEN', description: 'Botón roto', previousStatus: 'QUALITY_CONTROL', evidenceRefs: [], createdAt: '2026-11-19T15:00:00.000Z' },
  ];
  const calls = [];
  await page.route(/\/api\/v1\/(orders|incidents)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (req.method() !== 'GET') calls.push([req.method(), path, req.postDataJSON()]);
    if (path === '/orders' && req.method() === 'GET') {
      if (mode.list === 'fail') return json(route, 503, { message: 'Servidor en mantenimiento.' });
      const rows = orders.filter((o) => o.status === url.searchParams.get('status'));
      return json(route, 200, { page: 1, pageSize: 100, total: rows.length, data: rows });
    }
    if (path === '/incidents' && req.method() === 'GET') return json(route, 200, incidents);
    if (path === '/incidents') {
      const body = req.postDataJSON();
      const created = { ...body, id: 'inc-new', status: 'OPEN', previousStatus: 'IN_PROCESS', evidenceRefs: [], createdAt: new Date().toISOString() };
      incidents.unshift(created);
      const held = orders.find((o) => o.id === body.orderId);
      Object.assign(held, { status: 'INCIDENT', version: held.version + 1, incidents: [{ id: 'inc-new', status: 'OPEN', previousStatus: 'IN_PROCESS' }] });
      return json(route, 201, created);
    }
    const m = path.match(/^\/orders\/([^/]+)(\/[a-z]+)?$/);
    const found = m && orders.find((o) => o.id === m[1]);
    if (found && m[2] === '/handoffs')
      return json(route, 200, [
        { id: 'h1', type: 'DRIVER_TO_FACILITY', status: 'USED', generation: 1, expiresAt: null, usedAt: '2026-11-19T13:55:00.000Z', declaredCount: 5, receivedCount: 5 },
      ]);
    if (found && m[2] === '/adjustments') return json(route, 200, []);
    if (found && !m[2]) {
      if (mode.detail === 'fail') return json(route, 503, { message: 'Servidor en mantenimiento.' });
      return json(route, 200, found);
    }
    return json(route, 404, { message: 'No existe.' });
  });
  return { mode, calls, orders };
}

test('la lista de planta sale del servidor y retener registra una incidencia con retención', async ({ page }) => {
  const { calls } = await mockServer(page);
  await page.goto('/operations/plant');
  const table = page.locator('table');
  await expect(table.getByRole('button', { name: 'Abrir pedido SOL-2001' })).toBeVisible();
  await expect(table.getByRole('button', { name: 'Abrir pedido SOL-2002' })).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(2);

  await page.getByRole('combobox', { name: 'Filtrar etapa de planta' }).selectOption('HELD');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table).toContainText('Luis Mora');
  await page.getByRole('combobox', { name: 'Filtrar etapa de planta' }).selectOption('ALL');

  await table.getByRole('button', { name: 'Abrir pedido SOL-2001' }).click();
  const modal = page.getByRole('dialog', { name: /^Pedido SOL-2001/ });
  await expect(modal).toContainText('Ana Ruiz');

  // El historial sale de los eventos, la custodia y las incidencias del servidor.
  await modal.getByRole('tab', { name: 'Historial y bitácora' }).click();
  const history = modal.getByRole('region', { name: 'Historial completo y bitácora' });
  await expect(history).toContainText('Recibido en planta');
  await expect(history).toContainText('Recibidas: 5; declaradas: 5');

  await modal.getByRole('tab', { name: 'Gestionar proceso' }).click();
  await expect(modal.getByRole('region', { name: 'Proceso en planta' })).toContainText('En lavado y cuidado');
  await expect(modal.getByRole('button', { name: 'Pasar a control de calidad' })).toBeVisible();
  await modal.getByRole('button', { name: 'Retener pedido' }).click();

  const hold = page.getByRole('dialog', { name: 'Retener solicitud para revisión' });
  await expect(hold.getByRole('checkbox', { name: /Retener la solicitud/ })).toBeChecked();
  await hold.getByLabel('Descripción del caso *').fill('Mancha que requiere tratamiento especial');
  await hold.getByRole('button', { name: 'Abrir incidencia' }).click();
  await expect(hold).toHaveCount(0);
  expect(calls).toEqual([
    ['POST', '/incidents', {
      orderId: 'o-wash',
      type: 'MANCHA_PERSISTENTE',
      severity: 'MEDIUM',
      description: 'Mancha que requiere tratamiento especial',
      holdOrder: true,
    }],
  ]);
  // La lista se vuelve a consultar: el pedido ya figura como retenido.
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Filtrar etapa de planta' }).selectOption('HELD');
  await expect(table.locator('tbody tr')).toHaveCount(2);
});

test('un pedido retenido indica dónde resolverlo y no ofrece retenerlo otra vez', async ({ page }) => {
  await mockServer(page);
  await page.goto('/operations/plant');
  await page.locator('table').getByRole('button', { name: 'Abrir pedido SOL-2002' }).click();
  const modal = page.getByRole('dialog', { name: /^Pedido SOL-2002/ });
  await modal.getByRole('tab', { name: 'Gestionar proceso' }).click();
  const panel = modal.getByRole('region', { name: 'Proceso en planta' });
  await expect(panel).toContainText('La solicitud está retenida por una incidencia.');
  await expect(panel.getByRole('link', { name: 'Resolver en Incidencias' })).toHaveAttribute(
    'href',
    '/operations/incidents/inc-held',
  );
  await expect(modal.getByRole('button', { name: 'Retener pedido' })).toHaveCount(0);
});

test('si el servidor falla, la planta muestra el error y no usa datos ni botones locales', async ({ page }) => {
  const { mode } = await mockServer(page);
  mode.list = 'fail';
  await page.goto('/operations/plant');
  const alert = page.getByRole('alert').filter({ hasText: 'No se pudieron cargar los pedidos de planta' });
  await expect(alert).toContainText('Servidor en mantenimiento.');
  await expect(page.locator('table')).toHaveCount(0);

  mode.list = 'ok';
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(2);

  // El proceso tampoco cae a un panel local si el servidor deja de responder.
  mode.detail = 'fail';
  await page.locator('table').getByRole('button', { name: 'Abrir pedido SOL-2001' }).click();
  const modal = page.getByRole('dialog', { name: /^Pedido SOL-2001/ });
  await modal.getByRole('tab', { name: 'Gestionar proceso' }).click();
  const error = modal.getByRole('alert').filter({ hasText: 'No se pudo cargar el proceso en planta.' });
  await expect(error).toBeVisible();
  await expect(error.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  for (const local of ['Iniciar procesamiento', 'Marcar listo', 'Liberar a control de calidad'])
    await expect(modal.getByRole('button', { name: local })).toHaveCount(0);
});

test('en móvil la lista de planta del servidor cabe sin desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await mockServer(page);
  await page.goto('/operations/plant');
  const list = page.getByRole('list', { name: 'Pedidos de planta' });
  await expect(list.getByRole('button', { name: 'Abrir pedido SOL-2001' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await list.getByRole('button', { name: 'Abrir pedido SOL-2001' }).click();
  const modal = page.getByRole('dialog', { name: /^Pedido SOL-2001/ });
  await expect(modal.getByRole('heading', { name: 'Prendas del pedido' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
