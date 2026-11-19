const { test, expect } = require('./support/fixtures.cjs');

test.use({ viewport: { width: 1440, height: 1000 } });

test('assignment controls, keyboard dismissal and operation screens work at desktop and mobile widths', async ({
  page,
}) => {
  await page.goto('/operations/orders/SOL-HOME-001');
  const trigger = page.getByRole('button', {
    name: 'Asignar chofer de recogida',
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Asignar chofer' });
  await expect(
    dialog.getByRole('button', { name: 'Cerrar', exact: true }),
  ).toBeFocused();
  const confirm = dialog.getByRole('button', {
    name: 'Confirmar asignación',
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('radio').first().check();
  await expect(confirm).toBeEnabled();
  await dialog.getByLabel(/Notas/).fill('Llamar antes de llegar.');
  await dialog.locator('textarea').evaluate((element) => {
    element.closest('.overflow-y-auto').scrollTop = 0;
  });
  await dialog.screenshot({ path: 'test-results/assignment-desktop.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

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
  await page.goto('/operations/orders/SOL-HOME-001');
  await trigger.click();
  await expect(dialog.getByRole('radio').first()).toBeVisible();
  await dialog.getByRole('radio').first().check();
  await expect(confirm).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(812);
  await dialog.screenshot({ path: 'test-results/assignment-mobile.png' });
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('sin GPS reciente el chofer sigue elegible; solo el estado, la sede o la capacidad lo excluyen', async ({ page }) => {
  const cors = { 'access-control-allow-origin': '*' };
  let serverDrivers = [];
  // El primero está desconectado; los demás nunca enviaron ubicación o la última es de hace 2 h.
  await page.route(/\/api\/v1\/drivers(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({
          status: 204,
          headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
        })
      : route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(serverDrivers) }),
  );
  await page.goto('/operations/orders/SOL-HOME-001');
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  serverDrivers = await page.evaluate((at) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    return (raw.drivers || []).map((d, i) => ({
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
    }));
  }, twoHoursAgo);
  expect(serverDrivers.length).toBeGreaterThan(2);

  await page.getByRole('button', { name: 'Asignar chofer de recogida', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Asignar chofer' });
  // Sin ubicación reciente no se inventa un tiempo de llegada: se muestra "GPS pendiente".
  await expect(dialog.getByText('GPS pendiente', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('No hay choferes elegibles con una ruta disponible.')).toHaveCount(0);
  await dialog.locator('summary', { hasText: 'Choferes no elegibles' }).click();
  const list = dialog.getByRole('list', { name: 'Choferes no elegibles' });
  await expect(list).toBeVisible();
  await expect(list).toContainText(serverDrivers[0].name);
  await expect(list).toContainText('Chofer no disponible');
  await expect(list).not.toContainText('Ubicación desactualizada');
  await expect(list).not.toContainText('Sin ubicación registrada');
});
