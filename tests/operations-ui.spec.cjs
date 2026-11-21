const { test, expect } = require('./support/fixtures.cjs');

test.use({ viewport: { width: 1440, height: 1000 } });

test('la recogida se asigna solo en Despacho y las pantallas de operación funcionan en escritorio y móvil', async ({
  page,
}) => {
  // El detalle no asigna: solo enlaza a Despacho con la solicitud preseleccionada (contrato 1).
  await page.goto('/operations/orders/SOL-HOME-001');
  const link = page.getByRole('link', { name: 'Asignar en Despacho' }).first();
  await expect(link).toHaveAttribute('href', '/operations/dispatch?pedido=SOL-HOME-001');
  await expect(page.getByRole('button', { name: 'Asignar chofer de recogida', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Logística', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Asignar en Despacho' })).toHaveAttribute(
    'href',
    '/operations/dispatch?pedido=SOL-HOME-001',
  );
  await expect(page.getByRole('button', { name: 'Asignar chofer de recogida', exact: true })).toHaveCount(0);

  // La cola de Despacho sale del servidor: se simula una recogida confirmada en la sede del pedido.
  const facilityId = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    return (raw.orders || []).find((o) => o.id === 'SOL-HOME-001')?.facilityId ?? 'f1';
  });
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(/\/api\/v1\/orders(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify({
            page: 1, pageSize: 100, total: 1,
            data: new URL(route.request().url()).searchParams.get('status') === 'CONFIRMED'
              ? [{ id: 'SOL-HOME-001', number: 3001, status: 'CONFIRMED', mode: 'HOME_HOME', facilityId, paymentStatus: 'PAID', pricingStatus: 'ESTIMATED', total: '15.00', version: 3, createdAt: '2026-11-19T13:00:00.000Z' }]
              : [],
          }),
        }),
  );
  await page.goto('/operations/dispatch');
  await expect(
    page.getByRole('heading', { name: 'Despacho', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio').first().check();
  await expect(
    page.getByRole('button', { name: 'Asignar chofer seleccionado' }),
  ).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/dispatch-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/operations/dispatch', '/operations/handoffs']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(375);
    await page.screenshot({
      path: `test-results/${path.split('/').pop()}-mobile.png`,
      fullPage: true,
    });
  }
  // En móvil el enlace del detalle lleva a Despacho con la solicitud preseleccionada.
  await page.goto('/operations/orders/SOL-HOME-001');
  await page.getByRole('link', { name: 'Asignar en Despacho' }).first().click();
  await expect(page).toHaveURL(/\/operations\/dispatch\?pedido=SOL-HOME-001$/);
  await expect(page.getByRole('button', { name: /SOL-3001/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('en Despacho, sin GPS reciente el chofer sigue elegible; el estado lo excluye', async ({ page }) => {
  const cors = { 'access-control-allow-origin': '*' };
  const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (route, body) =>
    route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  let serverDrivers = [];
  let facilityId = 'f1';
  await page.route(/\/api\/v1\/drivers(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: preflight }) : json(route, serverDrivers),
  );
  await page.route(/\/api\/v1\/orders(\?.*)?$/, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const confirmed = new URL(route.request().url()).searchParams.get('status') === 'CONFIRMED';
    return json(route, {
      page: 1, pageSize: 100, total: confirmed ? 1 : 0,
      data: confirmed
        ? [{ id: 'SOL-HOME-001', number: 3001, status: 'CONFIRMED', mode: 'HOME_HOME', facilityId, paymentStatus: 'PAID', pricingStatus: 'ESTIMATED', total: '15.00', version: 3, createdAt: '2026-11-19T13:00:00.000Z' }]
        : [],
    });
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  // En la sede del pedido: el primero está desconectado; los demás nunca enviaron ubicación o la
  // última es de hace 2 h.
  ({ facilityId, serverDrivers } = await page.evaluate((at) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    const facility = (raw.orders || []).find((o) => o.id === 'SOL-HOME-001')?.facilityId ?? 'f1';
    const local = (raw.drivers || []).filter((d) => d.facilityId === facility);
    return {
      facilityId: facility,
      serverDrivers: local.map((d, i) => ({
        id: d.id,
        userId: `u-${d.id}`,
        name: d.name,
        email: d.email,
        phone: d.phone,
        status: i === 0 ? 'OFFLINE' : 'AVAILABLE',
        vehicle: d.vehicleType,
        plate: d.vehiclePlate,
        facilityId: d.facilityId,
        facilityName: d.facilityName,
        latitude: d.location.lat,
        longitude: d.location.lng,
        locationAt: i === 1 ? null : at,
        activeLegsCount: 0,
      })),
    };
  }, twoHoursAgo));
  expect(serverDrivers.length).toBeGreaterThan(2);

  await page.goto('/operations/dispatch?pedido=SOL-HOME-001');
  await expect(page.getByRole('button', { name: /SOL-3001/ })).toHaveAttribute('aria-pressed', 'true');
  // Sin ubicación reciente no se inventa un tiempo de llegada: se muestra "GPS pendiente".
  await expect(page.getByText('GPS pendiente', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/No hay choferes elegibles/)).toHaveCount(0);
  for (const d of serverDrivers.slice(1))
    await expect(page.getByRole('radio', { name: d.name, exact: true })).toHaveCount(1);
  await expect(page.getByRole('radio', { name: serverDrivers[0].name, exact: true })).toHaveCount(0);
});
