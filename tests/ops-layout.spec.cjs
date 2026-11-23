const { test, expect } = require('./support/fixtures.cjs');

// Paso 4 (UI): en escritorio y tablet las tablas de Operaciones entran enteras: ninguna columna
// queda escondida detrás de un scroll horizontal y la página no desborda. Solo presentación.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

const leg = (orderId, kind) => ({
  id: `${orderId}-${kind}`, orderId, kind, method: 'DRIVER', status: 'SCHEDULED',
  addressText: 'Cdla. Kennedy Norte, Mz 104', latitude: -2.17, longitude: -79.9, scheduledDate: '2026-11-22',
  slotId: 's1', slot: { id: 's1', date: '2026-11-22', startTime: '09:00', endTime: '11:00', capacity: 10, reservedCount: 3 },
  driverId: null, driver: null,
});
const order = (id, number, status, name, extra = {}) => ({
  id, number, status, mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PENDING', paymentMethodKind: 'TRANSFER',
  pricingStatus: 'FINAL', pricingModel: 'FIXED', total: '18.40', amountDue: '18.40', version: 3,
  createdAt: '2026-11-20T13:00:00.000Z', customer: { user: { name, phone: '099', email: 'cliente.largo@correo.example' } },
  items: [], events: [], incidents: [], legs: [leg(id, 'INBOUND'), leg(id, 'OUTBOUND')], ...extra,
});
const ORDERS = [
  order('o-1', 3001, 'CONFIRMED', 'Ana Torres Villamar'),
  order('o-2', 3002, 'IN_PROCESS', 'Luis Mora Andrade'),
  order('o-3', 3003, 'READY_FOR_DELIVERY', 'María Vera Castillo'),
  order('o-4', 3004, 'DELIVERY_ASSIGNED', 'Carla Ruiz Pazmiño'),
];
const INCIDENTS = [
  { id: 'inc-1', orderId: 'o-2', driverId: null, type: 'PRENDA_DANADA', severity: 'HIGH', status: 'OPEN',
    description: 'Camisa con rotura', previousStatus: 'IN_PROCESS', evidenceRefs: [], createdAt: '2026-11-21T09:00:00.000Z' },
];

async function mockServer(page) {
  await page.route(/\/api\/v1\/(orders|incidents|drivers|facilities)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/orders') {
      const status = url.searchParams.get('status');
      const data = status ? ORDERS.filter((o) => o.status === status) : ORDERS;
      return json(route, 200, { page: 1, pageSize: 100, total: data.length, data });
    }
    const found = ORDERS.find((o) => path === `/orders/${o.id}`);
    if (found) return json(route, 200, found);
    if (path === '/incidents') return json(route, 200, INCIDENTS);
    return json(route, 200, []);
  });
}

/** Contenedores con scroll horizontal que esconden contenido (más de 4 px). */
const hiddenByScroll = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main *')]
      .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX))
      .filter((el) => el.clientWidth > 200 && el.scrollWidth - el.clientWidth > 4)
      .map((el) => `${el.querySelector('table') ? 'tabla' : el.getAttribute('role') || el.tagName} oculta ${el.scrollWidth - el.clientWidth}px`),
  );

for (const width of [1440, 1280, 1024, 768]) {
  test(`a ${width} px las tablas de Operaciones entran enteras`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockServer(page);
    for (const [path, ready] of [
      ['/operations/orders', 'SOL-3001'],
      ['/operations/deliveries', 'SOL-3003'],
      ['/operations/incidents', 'Prenda dañada'],
      ['/operations/plant', 'SOL-3002'],
    ]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main').getByText(ready).first()).toBeAttached();
      expect(await hiddenByScroll(page), `${path} a ${width}px`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
    }
  });
}
