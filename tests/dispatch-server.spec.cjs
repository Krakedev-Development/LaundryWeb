const { test, expect } = require('./support/fixtures.cjs');

// Despacho contra el servidor: la cola sale de /orders y la asignación solo existe si el servidor
// la acepta. Sin conexión se muestra el error; nunca se asigna en el navegador.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

const summary = (status = 'CONFIRMED', facilityId = 'f1') => ({
  id: ORDER, number: 3001, status, mode: 'HOME_HOME', facilityId, paymentStatus: 'PAID',
  pricingStatus: 'ESTIMATED', total: '15.00', version: 3, createdAt: '2026-11-19T13:00:00.000Z',
});

// La sede debe ser la del pedido sembrado: solo sus choferes son elegibles.
async function mockServer(page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const facilityId = await page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    return (raw.orders || []).find((o) => o.id === id)?.facilityId ?? 'f1';
  }, ORDER);
  const state = { queue: [summary('CONFIRMED', facilityId)], list: 'ok', assign: 'ok' };
  const calls = [];
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/orders') {
      if (state.list === 'fail') return json(route, 503, { message: 'Servidor en mantenimiento.' });
      const rows = state.queue.filter((o) => o.status === url.searchParams.get('status'));
      return json(route, 200, { page: 1, pageSize: 100, total: rows.length, data: rows });
    }
    if (path === `/orders/${ORDER}/assign`) {
      calls.push(req.postDataJSON());
      if (state.assign === 'offline') return route.abort('internetdisconnected');
      state.queue = [];
      return json(route, 201, { ...summary('PICKUP_ASSIGNED', facilityId), version: 4, legs: [] });
    }
    // Sin detalle: la cola se arma con el resumen del servidor.
    return json(route, 404, { message: 'No existe.' });
  });
  return { state, calls };
}

const localOrder = (page) =>
  page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    const o = (raw.orders || []).find((x) => x.id === id);
    return { status: o?.status, driverId: o?.pickup?.driverId ?? null };
  }, ORDER);

test('la cola de despacho sale del servidor y la asignación se confirma con el servidor', async ({ page }) => {
  const { calls } = await mockServer(page);
  await page.goto('/operations/dispatch');
  const item = page.getByRole('button', { name: /SOL-3001/ });
  await expect(item).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Asignar chofer seleccionado' }).click();
  await expect(page.getByText('La solicitud SOL-3001 ya tiene chofer.')).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ leg: 'INBOUND', expectedVersion: 3 });
  // Se vuelve a consultar la cola: ya no espera chofer.
  await expect(page.getByText('No hay solicitudes pendientes de asignación.')).toBeVisible();
});

test('sin conexión la asignación falla con un aviso y nada cambia en el navegador', async ({ page }) => {
  const { state, calls } = await mockServer(page);
  state.assign = 'offline';
  await page.goto('/operations/dispatch');
  await expect(page.getByRole('button', { name: /SOL-3001/ })).toBeVisible();
  const before = await localOrder(page);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Asignar chofer seleccionado' }).click();
  await expect(page.getByText('No se asignó el chofer')).toBeVisible();
  await expect(page.getByText(/No se pudo conectar con el servidor. La solicitud sigue sin chofer/)).toBeVisible();
  expect(calls).toHaveLength(1);
  // La solicitud sigue en la cola y el almacenamiento local no registró ninguna asignación.
  await expect(page.getByRole('button', { name: /SOL-3001/ })).toBeVisible();
  expect(await localOrder(page)).toEqual(before);
});

test('si el servidor no responde no hay cola y se puede reintentar', async ({ page }) => {
  const { state } = await mockServer(page);
  state.list = 'fail';
  await page.goto('/operations/dispatch');
  const alert = page.getByRole('alert').filter({ hasText: 'No se pudo cargar la cola de despacho' });
  await expect(alert).toContainText('Sin conexión no se puede asignar chofer.');
  await expect(page.getByText('No hay solicitudes pendientes de asignación.')).toBeVisible();
  state.list = 'ok';
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('button', { name: /SOL-3001/ })).toBeVisible();
  await expect(alert).toHaveCount(0);
});
