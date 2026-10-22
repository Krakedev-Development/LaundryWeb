const { test, expect } = require('@playwright/test');

test('default and other demo sedes contain verifiable intake, pickup and driver reception scenarios', async ({
  page,
}) => {
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  const sede = page.getByLabel('Sede de operación');
  await expect(sede).toHaveValue('FAC-01');
  for (const facilityId of ['FAC-01', 'FAC-02', 'FAC-03']) {
    await sede.selectOption(facilityId);
    for (const [tab, suffix, kind] of [
      ['Esperando retiro', 'RETIRO', 'Retiro del cliente en sede'],
      ['Transferencias chofer', 'CHOFER', 'Ingreso del chofer en planta'],
    ]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page
        .getByRole('button')
        .filter({ hasText: `SOL-DEMO-${facilityId}-${suffix}` })
        .filter({ hasText: kind })
        .click();
      await page
        .getByRole('button', {
          name: 'Demo: cargar código preparado',
          exact: true,
        })
        .click();
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
