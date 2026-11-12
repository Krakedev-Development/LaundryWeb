const { test, expect } = require('./support/fixtures.cjs');

// El recorrido completo (recogida, custodia, pesaje, pago y entrega) lo ejercita el backend
// con cada rol actuando por su cuenta (LaundryBackend/test/e2e/lifecycle.test.ts). La Web no
// simula al chofer ni al cliente: aquí se verifica lo que sí le corresponde al personal.

test('el personal no puede verificar por el chofer ni ve códigos de custodia', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Sede de operación').selectOption('FAC-02');
  await page.getByRole('tab', { name: 'Transferencias chofer', exact: true }).click();
  await page
    .getByRole('button')
    .filter({ hasText: 'SOL-SAMPLE-FAC-02-CHOFER' })
    .filter({ hasText: 'Ingreso del chofer en planta' })
    .click();
  // Ningún control de muestra, ni código preparado, ni representación del chofer.
  await expect(page.getByText(/Demo:|Control demo|modo demo/i)).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /representar/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /cargar código/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('no existen acciones para simular al cliente o al chofer en el detalle de una solicitud', async ({
  page,
}) => {
  await page.goto('/operations/orders/SOL-HOME-001', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/MVP:|simular/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Marcar llegada/ })).toHaveCount(0);
});
