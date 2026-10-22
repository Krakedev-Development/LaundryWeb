const { test, expect } = require('@playwright/test');
test('weight order uses styled operations, receives unpaid, computes price and gates customer approval', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/operations/orders/SOL-WEIGHT-001');
  await expect(
    page.getByRole('heading', { name: 'Flujo y próximos pasos' }),
  ).toBeVisible();
  await expect(
    page.getByText('Pendiente de pesaje', { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Registrar LB', exact: true }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Primero confirma el ingreso físico' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Asignar chofer de recogida', exact: true })
    .click();
  await page.getByRole('radio').first().check();
  await page
    .getByRole('button', { name: 'Confirmar asignación', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Iniciar recogida', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Marcar llegada', exact: true })
    .click();
  await page.goto('/operations/handoffs');
  await page.getByLabel('Sede de operación').selectOption('FAC-02');
  await page
    .getByRole('tab', { name: 'Transferencias chofer', exact: true })
    .click();
  await page
    .getByRole('button')
    .filter({ hasText: 'SOL-WEIGHT-001' })
    .filter({ hasText: 'Recogida a domicilio' })
    .click();
  await page
    .getByRole('checkbox', { name: /Control demo: representar/ })
    .check();
  await page
    .getByRole('button', { name: 'Demo: cargar código preparado', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Verificar código', exact: true })
    .click();
  await page
    .getByLabel('Prendas recibidas', { exact: true })
    .fill(
      await page.evaluate(() =>
        String(
          JSON.parse(localStorage.getItem('lw_workflow_v2')).orders.find(
            (o) => o.id === 'SOL-WEIGHT-001',
          ).itemCount,
        ),
      ),
    );
  await page
    .getByRole('checkbox', {
      name: 'Verifiqué las prendas y confirmo la entrega física',
      exact: true,
    })
    .check();
  await page
    .getByRole('button', { name: 'Confirmar transferencia', exact: true })
    .click();
  await page.goto('/operations/orders/SOL-WEIGHT-001');
  await page.getByRole('button', { name: 'Ir a planta', exact: true }).click();
  await page
    .getByRole('button', { name: 'Marcar llegada a planta', exact: true })
    .click();
  await page.goto('/operations/handoffs');
  await page.getByLabel('Sede de operación').selectOption('FAC-02');
  await page
    .getByRole('tab', { name: 'Transferencias chofer', exact: true })
    .click();
  await page
    .getByRole('button')
    .filter({ hasText: 'SOL-WEIGHT-001' })
    .filter({ hasText: 'Ingreso del chofer en planta' })
    .click();
  await page
    .getByRole('button', { name: 'Demo: cargar código preparado', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Verificar código', exact: true })
    .click();
  await page
    .getByLabel('Prendas recibidas', { exact: true })
    .fill(
      await page.evaluate(() =>
        String(
          JSON.parse(localStorage.getItem('lw_workflow_v2')).orders.find(
            (o) => o.id === 'SOL-WEIGHT-001',
          ).itemCount,
        ),
      ),
    );
  await page
    .getByRole('checkbox', {
      name: 'Verifiqué las prendas y confirmo la entrega física',
      exact: true,
    })
    .check();
  await page
    .getByRole('button', { name: 'Confirmar transferencia', exact: true })
    .click();
  await page.goto('/operations/orders/SOL-WEIGHT-001');
  await page.getByLabel('Peso real').fill('22.5');
  await page.getByRole('button', { name: 'Registrar LB', exact: true }).click();
  await page
    .getByLabel('Mensaje de inspección')
    .fill('Prenda delicada requiere tratamiento adicional.');
  await page
    .getByRole('button', { name: 'Confirmar inspección', exact: true })
    .click();
  await page.getByLabel('Importe del ajuste').fill('5');
  await page
    .getByLabel('Motivo interno del ajuste')
    .fill('Detalle técnico reservado');
  await page
    .getByRole('button', { name: 'Proponer ajuste', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'MVP: cliente acepta', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'MVP: simular pago del cliente', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Iniciar procesamiento', exact: true })
    .first()
    .click();
  await page.reload();
  const saved = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('lw_workflow_v2')),
      o = s.orders.find((o) => o.id === 'SOL-WEIGHT-001');
    return {
      status: o.status,
      weight: o.pricing.measuredWeight,
      paid: o.pricing.paymentStatus,
      adjustment: s.adjustments.find((a) => a.orderId === o.id).status,
    };
  });
  expect(saved).toEqual({
    status: 'IN_PROCESS',
    weight: 22.5,
    paid: 'PAID',
    adjustment: 'ACCEPTED',
  });
  expect(errors).toEqual([]);
});
test('only two modes are selectable in list and configuration retains review values', async ({
  page,
}) => {
  await page.goto('/operations/orders');
  await expect(
    page.getByLabel('Modalidad', { exact: true }).locator('option'),
  ).toHaveCount(3);
  await page
    .getByLabel('Modalidad', { exact: true })
    .selectOption('HOME_STORE');
  await expect(
    page
      .getByRole('button', { name: /SOL-HS-001/ })
      .or(page.getByText('SOL-HS-001', { exact: true }))
      .first(),
  ).toBeVisible();
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Políticas y agenda del MVP' }),
  ).toBeVisible();
  await expect(page.getByLabel('IVA (fracción: 0.15 = 15%)')).toHaveValue('');
  await expect(
    page.getByText('Decisiones en revisión', { exact: true }),
  ).toBeVisible();
});
