const { test, expect } = require('./support/fixtures.cjs');

test.use({ viewport: { width: 1440, height: 900 } });

test('MVP uses icons even when stored records contain legacy image URLs', async ({
  page,
}) => {
  const photoRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('legacy-photo.png'))
      photoRequests.push(request.url());
  });
  await page.goto('/dashboard');
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => {
    const url = 'https://example.invalid/legacy-photo.png';
    for (const key of [
      'lw_drivers',
      'lw_customers',
      'lw_incidents',
      'lw_workflow_v2',
    ]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const replaceImages = (value) => {
        if (!value || typeof value !== 'object') return;
        for (const field of Object.keys(value)) {
          if (
            ['avatar', 'kycDocumentUrl', 'kycSelfieUrl', 'url'].includes(field)
          )
            value[field] = url;
          else replaceImages(value[field]);
        }
      };
      replaceImages(data);
      localStorage.setItem(key, JSON.stringify(data));
    }
  });
  // Las incidencias vienen del servidor; una evidencia con URL de foto se muestra como conteo.
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(/\/api\/v1\/incidents(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'inc-1', orderId: 'SOL-HOME-001', type: 'PRENDA_DANADA', severity: 'HIGH',
              status: 'OPEN', description: 'Camisa con rotura', previousStatus: null,
              evidenceRefs: ['https://example.invalid/legacy-photo.png'],
              createdAt: '2026-11-19T15:00:00.000Z',
            },
          ]),
        }),
  );
  for (const path of ['/dashboard', '/logistics/drivers']) {
    await page.goto(path);
    await expect(page.locator('main [role="img"]').first()).toBeVisible();
    // Las teselas del mapa son cartografía, no fotos de personas ni documentos.
    await expect(page.locator('main img:not(.leaflet-tile)')).toHaveCount(0);
  }
  // La revisión KYC no trae datos de ejemplo: sin una solicitud elegida no muestra imágenes.
  await page.goto('/customers/kyc');
  await expect(page.locator('main img')).toHaveCount(0);
  await page.goto('/operations/incidents');
  await page.locator('tbody tr').first().getByRole('button', { name: 'Gestionar' }).click();
  await expect(page.getByRole('dialog')).toContainText('Evidencias registradas: 1');
  await expect(page.locator('img[src*="legacy-photo"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.goto('/operations/orders/SOL-HOME-001');
  await page.getByRole('button', { name: /^Actividad/ }).click();
  await expect(page.getByText('Camisa con rotura')).toBeVisible();
  await expect(page.locator('main img:not(.leaflet-tile)')).toHaveCount(0);
  expect(photoRequests).toEqual([]);
});
