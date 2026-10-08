const { test, expect } = require('@playwright/test');
async function receipt(page, id, type, driver = false) {
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Sede de operación').selectOption('FAC-02');
  await page
    .getByRole('tab', {
      name:
        type === 'CUSTOMER_TO_FACILITY'
          ? 'Esperando ingreso'
          : type === 'FACILITY_TO_CUSTOMER'
            ? 'Esperando retiro'
            : 'Transferencias chofer',
      exact: true,
    })
    .click();
  const labels = {
    CUSTOMER_TO_FACILITY: 'Ingreso del cliente en sede',
    FACILITY_TO_CUSTOMER: 'Retiro del cliente en sede',
    CUSTOMER_TO_DRIVER: 'Recogida a domicilio',
    DRIVER_TO_FACILITY: 'Ingreso del chofer en planta',
    FACILITY_TO_DRIVER: 'Salida de planta con chofer',
    DRIVER_TO_CUSTOMER: 'Entrega a domicilio',
  };
  await page
    .getByRole('button')
    .filter({ hasText: id })
    .filter({ hasText: labels[type] })
    .click();
  if (driver)
    await page
      .getByRole('checkbox', { name: /Control demo: representar/ })
      .check();
  await page
    .getByRole('button', { name: 'Demo: cargar código preparado', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Verificar código', exact: true })
    .click();
  if (
    [
      'CUSTOMER_TO_FACILITY',
      'CUSTOMER_TO_DRIVER',
      'DRIVER_TO_FACILITY',
    ].includes(type)
  ) {
    const count = await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem('lw_workflow_v2'))
          .orders.find((o) => o.id === id)
          .items.reduce((n, i) => n + i.quantity, 0),
      id,
    );
    await page
      .getByLabel('Prendas recibidas', { exact: true })
      .fill(String(count));
  } else if (['FACILITY_TO_CUSTOMER', 'DRIVER_TO_CUSTOMER'].includes(type)) {
    await page
      .getByLabel('Nombre de quien retira', { exact: true })
      .fill('Ana Pérez');
    await page
      .getByLabel('Relación o autorización', { exact: true })
      .fill('Familiar autorizado con código');
  }
  await page
    .getByRole('checkbox', {
      name: 'Verifiqué las prendas y confirmo la entrega física',
      exact: true,
    })
    .check();
  await page
    .getByRole('button', { name: 'Confirmar transferencia', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Acción registrada');
}
async function assign(page, kind) {
  await page
    .getByRole('button', { name: 'Asignar chofer de ' + kind, exact: true })
    .click();
  await page.getByRole('radio').first().check();
  await page
    .getByRole('button', { name: 'Confirmar asignación', exact: true })
    .click();
}
async function action(page, id, name) {
  await page.goto('/operations/orders/' + id, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name, exact: true }).click();
}
test('HOME_STORE verifies home pickup, processes, retires with authorized recipient and persists', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const id = 'SOL-STORE-001';
  await page.goto('/operations/orders/' + id);
  await assign(page, 'recogida');
  await action(page, id, 'Iniciar recogida');
  await action(page, id, 'Marcar llegada');
  await receipt(page, id, 'CUSTOMER_TO_DRIVER', true);
  await action(page, id, 'Ir a planta');
  await action(page, id, 'Marcar llegada a planta');
  await receipt(page, id, 'DRIVER_TO_FACILITY');
  for (const name of [
    'Iniciar procesamiento',
    'Control de calidad',
    'Marcar Lista para entrega',
  ])
    await action(page, id, name);
  await page.goto('/operations/orders/' + id);
  await expect(
    page.getByRole('button', {
      name: 'Asignar chofer de entrega',
      exact: true,
    }),
  ).toHaveCount(0);
  await receipt(page, id, 'FACILITY_TO_CUSTOMER');
  await page.reload();
  const saved = await page.evaluate((id) => {
    const d = JSON.parse(localStorage.getItem('lw_workflow_v2'));
    return {
      status: d.orders.find((o) => o.id === id).status,
      used: d.handoffs.filter((h) => h.orderId === id && h.status === 'USED')
        .length,
    };
  }, id);
  expect(saved).toEqual({ status: 'COMPLETED', used: 3 });
  expect(errors).toEqual([]);
  await page.screenshot({
    path: 'test-results/web-store-completed.png',
    fullPage: true,
  });
});
test('HOME_HOME retains manual dispatch and mock tracking and requires all four handoffs', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const id = 'SOL-HOME-001';
  await page.goto('/operations/orders/' + id);
  await assign(page, 'recogida');
  await page
    .getByRole('button', { name: 'Iniciar recogida', exact: true })
    .click();
  const location = () =>
    page.evaluate((id) => {
      const d = JSON.parse(localStorage.getItem('lw_workflow_v2'));
      const o = d.orders.find((o) => o.id === id);
      const driver = d.drivers.find((v) => v.id === o.pickup.driverId);
      return JSON.stringify([driver.location.lat, driver.location.lng]);
    }, id);
  const initial = await location();
  await expect.poll(location, { timeout: 15000 }).not.toBe(initial);
  await action(page, id, 'Marcar llegada');
  await receipt(page, id, 'CUSTOMER_TO_DRIVER', true);
  await action(page, id, 'Ir a planta');
  await action(page, id, 'Marcar llegada a planta');
  await receipt(page, id, 'DRIVER_TO_FACILITY');
  for (const name of [
    'Iniciar procesamiento',
    'Control de calidad',
    'Marcar Lista para entrega',
  ])
    await action(page, id, name);
  await page.goto('/operations/orders/' + id);
  await assign(page, 'entrega');
  await receipt(page, id, 'FACILITY_TO_DRIVER');
  await action(page, id, 'Marcar En entrega');
  await action(page, id, 'Marcar llegada');
  await receipt(page, id, 'DRIVER_TO_CUSTOMER', true);
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem('lw_workflow_v2')).orders.find(
            (o) => o.id === id,
          ).status,
        id,
      ),
    )
    .toBe('COMPLETED');
  await page.goto('/logistics/map', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByText('Mapa Operativo Logístico', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
