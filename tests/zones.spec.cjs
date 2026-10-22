const { test, expect } = require('@playwright/test');
test.use({ viewport: { width: 1440, height: 1000 } });

async function clickMap(dialog, x, y) {
  const map = dialog.locator('svg[aria-label="Mapa de ubicaciones Laundry"]');
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width * x, y: box.height * y } });
}
test('polygon creation, two facility pins, cancel, reload and operational filtering', async ({
  page,
}) => {
  await page.route('**/api.mapbox.com/**', (route) => route.abort());
  await page.goto('/logistics/facilities');
  await page.getByRole('button', { name: 'Crear zona', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Crear zona', exact: true });
  await editor.getByLabel('Nombre de la zona').fill('Zona de prueba');
  await clickMap(editor, 0.1, 0.1);
  await clickMap(editor, 0.3, 0.1);
  await clickMap(editor, 0.3, 0.25);
  await clickMap(editor, 0.1, 0.25);
  await editor
    .getByRole('button', { name: 'Cerrar polígono', exact: true })
    .click();
  await editor
    .getByRole('button', { name: 'Guardar zona', exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  for (const index of [1, 2]) {
    await page
      .getByRole('button', { name: 'Agregar sede', exact: true })
      .last()
      .click();
    const picker = page.getByRole('dialog', { name: 'Ubicar nueva sede' });
    await clickMap(picker, 0.45 + index * 0.02, 0.5);
    const form = page.getByRole('dialog', { name: 'Registrar Nueva Sede' });
    await expect(form).toBeVisible();
    await form
      .locator('input[type=text]')
      .nth(0)
      .fill(`Sede de prueba ${index}`);
    await form.getByLabel('Codigo de la sede').fill(`TEST-${index}`);
    await form
      .locator('input[type=text]')
      .nth(2)
      .fill(`Direccion real ${index}`);
    await form.getByLabel('Ciudad de la sede').fill('Samborondon');
    await form
      .getByRole('button', { name: 'Registrar Sede', exact: true })
      .click();
    await expect(form).toHaveCount(0);
  }
  await expect(page.getByText('2 sedes', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/zones-desktop.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Agregar sede', exact: true })
    .last()
    .click();
  await clickMap(
    page.getByRole('dialog', { name: 'Ubicar nueva sede' }),
    0.5,
    0.5,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await page.reload();
  await expect(page.getByText('2 sedes', { exact: true })).toBeVisible();
  const zoneId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('lw_zones_v1')).zones.find(
        (zone) => zone.name === 'Zona de prueba',
      ).id,
  );
  await page.goto('/logistics/map');
  await page.getByLabel('Zona', { exact: true }).selectOption(zoneId);
  await expect(
    page
      .getByRole('region', { name: 'Ubicaciones operativas' })
      .getByRole('button', { name: /^Ver detalle de/ }),
  ).toHaveCount(2);
  await page.goto('/logistics/facilities');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Sedes Operativas y Plantas de Lavado' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  await page.screenshot({
    path: 'test-results/zones-mobile.png',
    fullPage: true,
  });
});
