const { test, expect } = require('./support/fixtures.cjs');

// Avisos en tiempo real: cuando el servidor informa un cambio de estado (p. ej. el cliente canceló
// desde la app), las vistas de pedidos se recargan solas, sin pulsar "Actualizar".
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

const summary = (status, facilityId) => ({
  id: ORDER, number: 3001, status, mode: 'HOME_HOME', facilityId, paymentStatus: 'PAID',
  pricingStatus: 'ESTIMATED', total: '15.00', version: 3, createdAt: '2026-11-19T13:00:00.000Z',
});

// Servidor Socket.IO simulado (protocolo Engine.IO 4 sobre WebSocket): acepta la conexión y
// permite empujar eventos desde la prueba.
async function mockSocket(page) {
  const sockets = [];
  await page.routeWebSocket(/socket\.io/, (ws) => {
    sockets.push(ws);
    ws.send(JSON.stringify({ sid: 'eio-test', upgrades: [], pingInterval: 60000, pingTimeout: 60000, maxPayload: 1e6 }).replace(/^/, '0'));
    ws.onMessage((message) => {
      const text = String(message);
      if (text.startsWith('40')) ws.send('40{"sid":"sock-test"}');
      if (text === '2') ws.send('3');
    });
  });
  return {
    connected: () => sockets.length > 0,
    emit: (event, data) => {
      for (const ws of sockets) ws.send(`42${JSON.stringify([event, data])}`);
    },
  };
}

test('la cola de despacho se actualiza sola cuando el cliente cancela la solicitud', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const facilityId = await page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    return (raw.orders || []).find((o) => o.id === id)?.facilityId ?? 'f1';
  }, ORDER);
  const state = { queue: [summary('CONFIRMED', facilityId)], listCalls: 0 };
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/orders') {
      state.listCalls += 1;
      const rows = state.queue.filter((o) => o.status === url.searchParams.get('status'));
      return json(route, 200, { page: 1, pageSize: 100, total: rows.length, data: rows });
    }
    return json(route, 404, { message: 'No existe.' });
  });
  const socket = await mockSocket(page);

  await page.goto('/operations/dispatch');
  await expect(page.getByRole('button', { name: /SOL-3001/ })).toBeVisible();
  await expect.poll(() => socket.connected()).toBe(true);
  const before = state.listCalls;

  // El cliente cancela desde la app: el servidor ya no la tiene en la cola y avisa.
  state.queue = [];
  socket.emit('order:status:changed', {
    orderId: ORDER, orderNumber: 3001, status: 'CANCELLED', activeLeg: null,
    facilityId, updatedAt: new Date().toISOString(),
  });
  await expect(page.getByText('No hay solicitudes pendientes de asignación.')).toBeVisible();
  expect(state.listCalls).toBeGreaterThan(before);
});
