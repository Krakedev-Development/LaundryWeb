const { test, expect } = require('./support/fixtures.cjs');

test('default and other demo sedes contain verifiable intake, pickup and driver reception scenarios', async ({
  page,
}) => {
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  const sede = page.getByLabel('Sede de operación');
  await expect(sede).toHaveValue('FAC-01');
  for (const facilityId of ['FAC-01', 'FAC-02', 'FAC-03']) {
    await sede.selectOption(facilityId);
    for (const [tab, suffix, kind, type] of [
      ['Esperando retiro', 'RETIRO', 'Retiro del cliente en sede', 'FACILITY_TO_CUSTOMER'],
      ['Transferencias chofer', 'CHOFER', 'Ingreso del chofer en planta', 'DRIVER_TO_FACILITY'],
    ]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page
        .getByRole('button')
        .filter({ hasText: `SOL-DEMO-${facilityId}-${suffix}` })
        .filter({ hasText: kind })
        .click();
      // El código lo conoce quien presenta; la prueba lo lee de los datos sembrados.
      const code = await page.evaluate(
        ({ orderId, type }) =>
          JSON.parse(localStorage.getItem('lw_workflow_v2')).handoffs.find(
            (h) =>
              h.orderId === orderId && h.type === type && h.status === 'ACTIVE',
          ).fallbackCode,
        { orderId: `SOL-DEMO-${facilityId}-${suffix}`, type },
      );
      await page.getByLabel('Código de transferencia').fill(code);
      await page
        .getByRole('button', { name: 'Verificar código', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Revisión y confirmación' }),
      ).toBeVisible();
    }
  }
  await sede.selectOption('FAC-01');
  await page
    .getByRole('tab', { name: 'Esperando retiro', exact: true })
    .click();
  await page.screenshot({
    path: 'test-results/reception-demo-la-puntilla.png',
    fullPage: true,
  });
});
