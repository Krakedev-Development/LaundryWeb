const { test, expect } = require('@playwright/test');

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
  await page.goto('/operations/handoffs');
  await page.getByLabel('Sede de operación').selectOption('FAC-02');
  await page
    .getByRole('button')
    .filter({ hasText: 'SOL-STORE-001' })
    .filter({ hasText: 'Ingreso del cliente en sede' })
    .click();
  await page
    .getByRole('button', { name: 'Demo: cargar código preparado', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Verificar código', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Revisión y confirmación' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirmar transferencia', exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: 'test-results/handoffs-desktop.png',
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
