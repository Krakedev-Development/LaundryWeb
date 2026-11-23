const { test, expect } = require('./support/fixtures.cjs');

const cors = { 'access-control-allow-origin': '*' };
const preflight = {
  ...cors,
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

async function mockRewardsAndRedemptions(page, { failList = false } = {}) {
  const rows = [
    {
      id: 'red-1',
      customerId: 'c1',
      rewardId: 'rw1',
      pointsCost: 80,
      status: 'PENDING',
      createdAt: '2026-11-19T12:00:00.000Z',
      reward: { title: 'Planchado gratis' },
      customer: { user: { name: 'Luis Mora' } },
    },
  ];
  const calls = [];
  const json = (route, code, body) =>
    route.fulfill({
      status: code,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

  await page.route(/\/api\/v1\/(catalog\/rewards|redemptions)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path.startsWith('/catalog/rewards')) return json(route, 200, []);
    if (path === '/redemptions' && req.method() === 'GET') {
      if (failList) return json(route, 500, { message: 'Servidor no disponible.' });
      return json(route, 200, rows);
    }
    const m = path.match(/^\/redemptions\/([^/]+)\/review$/);
    if (m && req.method() === 'POST') {
      const body = req.postDataJSON();
      calls.push(body);
      Object.assign(rows[0], {
        status: body.approve ? 'APPROVED' : 'REJECTED',
        reviewReason: body.reason ?? null,
        reviewedAt: new Date().toISOString(),
      });
      return json(route, 201, rows[0]);
    }
    return json(route, 404, { message: 'No encontrado' });
  });
  return calls;
}

test('los canjes se cargan del servidor y aprobar llama al review', async ({ page }) => {
  const calls = await mockRewardsAndRedemptions(page);
  await page.goto('/commercial/rewards', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /Solicitudes de Canje/ }).click();
  await expect(page.getByText('Luis Mora')).toBeVisible();
  await expect(page.getByText('Planchado gratis')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Marcar Entregado' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({ approve: true });
  await expect(page.getByText('APPROVED')).toBeVisible();
});

test('si fallan los canjes se muestra error con Reintentar', async ({ page }) => {
  let fail = true;
  await page.route(/\/api\/v1\/(catalog\/rewards|redemptions)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: preflight });
    }
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    const json = (code, body) =>
      route.fulfill({
        status: code,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    if (path.startsWith('/catalog/rewards')) return json(200, []);
    if (path === '/redemptions' && fail) return json(500, { message: 'Servidor no disponible.' });
    if (path === '/redemptions') return json(200, []);
    return json(404, {});
  });
  await page.goto('/commercial/rewards', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /Solicitudes de Canje/ }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudieron cargar los canjes');
  fail = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('No hay solicitudes de canje en el servidor.')).toBeVisible();
});
