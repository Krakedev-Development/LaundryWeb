const { test, expect } = require('./support/fixtures.cjs');
test('only two modes are selectable in list and configuration shows the server-backed panels', async ({
  page,
}) => {
  // La lista solo muestra lo que devuelve el servidor (T-11): una solicitud de cada modalidad.
  const cors = { 'access-control-allow-origin': '*' };
  const summary = (id, number, mode) => ({
    id, number, status: 'CONFIRMED', mode, facilityId: 'f1', paymentStatus: 'PAID',
    pricingStatus: 'ESTIMATED', total: '15.00', version: 1, createdAt: '2026-11-19T13:00:00.000Z',
  });
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path !== '/orders') return route.fulfill({ status: 404, headers: cors, contentType: 'application/json', body: '{"message":"No existe."}' });
    const data = [summary('SOL-HOME-001', 3001, 'HOME_HOME'), summary('SOL-HS-001', 3002, 'HOME_STORE')];
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ page: 1, pageSize: 50, total: 2, data }) });
  });
  await page.goto('/operations/orders');
  await expect(
    page.getByLabel('Modalidad', { exact: true }).locator('option'),
  ).toHaveCount(3);
  await expect(page.getByText('SOL-3001', { exact: true }).first()).toBeVisible();
  await page
    .getByLabel('Modalidad', { exact: true })
    .selectOption('HOME_STORE');
  await expect(page.getByText('SOL-3002', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('SOL-3001', { exact: true })).toHaveCount(0);
  await page.goto('/settings');
  // La política y la agenda viven en el servidor (detalle en policy.spec y time-slots.spec).
  await expect(
    page.getByRole('heading', { name: 'Política de negocio', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Franjas horarias y cupos', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Decisiones en revisión', { exact: true })).toHaveCount(0);
});
