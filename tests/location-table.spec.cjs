const { test, expect } = require('@playwright/test');
test.use({ viewport: { width: 1440, height: 1100 }, actionTimeout: 15000 });

test('location table combines filters, paginates, respects map layers and opens detail', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api.mapbox.com/**', (route) => route.abort());
  await page.goto('/logistics/map');
  const region = page.getByRole('region', {
    name: 'Ubicaciones operativas',
    exact: true,
  });
  const table = region.getByRole('table', { name: 'Ubicaciones operativas' });
  const details = table.getByRole('button', { name: /^Ver detalle de/ });
  await expect(details).toHaveCount(10);
  await region
    .getByRole('button', { name: 'Página siguiente de ubicaciones' })
    .click();
  await expect(region.getByRole('status')).toContainText('11–20');
  await region
    .getByLabel('Tipo de ubicación', { exact: true })
    .selectOption('facility');
  await expect(details).toHaveCount(3);
  await expect(region.getByRole('status')).toHaveText('1–3 de 3 resultados');
  await region.getByLabel('Buscar ubicación', { exact: true }).fill('puntilla');
  await expect(details).toHaveCount(1);
  await expect(table.getByRole('rowheader')).toContainText(
    'Laundry La Puntilla',
  );
  await region
    .getByRole('button', { name: 'Limpiar filtros', exact: true })
    .click();
  await region
    .getByLabel('Estado del chofer', { exact: true })
    .selectOption('OFFLINE');
  await region
    .getByLabel('Actualización GPS', { exact: true })
    .selectOption('stale');
  await expect(details).toHaveCount(1);
  await expect(table.getByRole('rowheader')).toContainText('Fernando');
  await region
    .getByLabel('Tipo de ubicación', { exact: true })
    .selectOption('facility');
  await expect(details).toHaveCount(0);
  await expect(
    table.getByText('No hay ubicaciones para estos filtros.'),
  ).toBeVisible();
  await region
    .getByRole('button', { name: 'Limpiar filtros', exact: true })
    .click();
  await region
    .getByLabel('Tipo de ubicación', { exact: true })
    .selectOption('facility');
  await page
    .getByRole('region', { name: 'Filtros del mapa' })
    .getByLabel('Sedes', { exact: true })
    .uncheck();
  await expect(details).toHaveCount(0);
  await page
    .getByRole('region', { name: 'Filtros del mapa' })
    .getByLabel('Sedes', { exact: true })
    .check();
  await expect(details).toHaveCount(3);
  await region.screenshot({ path: 'test-results/location-table-desktop.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(table).toBeVisible();
  await region.screenshot({ path: 'test-results/location-table-mobile.png' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  await region.getByLabel('Buscar ubicación', { exact: true }).fill('puntilla');
  await details.first().click();
  await expect(page).toHaveURL(/\/logistics\/facilities$/);
  expect(errors).toEqual([]);
});
