const { test, expect } = require('@playwright/test');
test('operator completes the independent Samborondon scenario with manual dispatch and mock movement', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/operations/dispatch');
  await page
    .getByRole('button', { name: 'Abrir solicitud de demostración' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Asignar chofer de recogida' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Asignar chofer de recogida' })
    .click();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Confirmar asignación' }).click();
  await page
    .getByRole('button', { name: 'Iniciar recogida', exact: true })
    .click();
  const location = () =>
    page.evaluate(() => {
      const order = JSON.parse(localStorage.getItem('lw_orders')).find(
        (o) => o.id === 'SOL-DEMO-001',
      );
      const driver = JSON.parse(localStorage.getItem('lw_drivers')).find(
        (d) => d.id === order.pickup.driverId,
      );
      return JSON.stringify({
        lat: driver.location.lat,
        lng: driver.location.lng,
      });
    });
  const initial = await location();
  await expect.poll(location, { timeout: 15000 }).not.toBe(initial);
  await page.screenshot({
    path: 'test-results/web-pickup.png',
    fullPage: true,
  });
  for (const action of [
    'Marcar llegada',
    'Confirmar recogida',
    'Ir a planta',
    'Registrar recepción en planta',
    'Iniciar procesamiento',
    'Control de calidad',
    'Marcar Lista para entrega',
  ])
    await page.getByRole('button', { name: action, exact: true }).click();
  await page.getByRole('button', { name: 'Asignar chofer de entrega' }).click();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Confirmar asignación' }).click();
  for (const action of [
    'Marcar En entrega',
    'Marcar llegada',
    'Confirmar entrega',
    'Cerrar Solicitud',
  ])
    await page.getByRole('button', { name: action, exact: true }).click();
  await expect(
    page.getByText('Finalizada', { exact: true }).first(),
  ).toBeVisible();
  await page.goto('/logistics/map');
  await expect(
    page.getByText('Mapa Operativo Logístico', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/web-map.png', fullPage: true });
  expect(errors).toEqual([]);
});
