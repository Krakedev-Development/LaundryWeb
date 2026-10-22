const { test, expect } = require('@playwright/test');

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
  const incident = await page.evaluate(() => {
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
    const workflow = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    const incidents =
      workflow.incidents || JSON.parse(localStorage.getItem('lw_incidents'));
    return incidents.find((item) => item.evidences.length > 0);
  });
  for (const path of ['/dashboard', '/logistics/drivers', '/customers/kyc']) {
    await page.goto(path);
    await expect(page.locator('main [role="img"]').first()).toBeVisible();
    await expect(page.locator('main img')).toHaveCount(0);
  }
  await expect(
    page.getByRole('img', { name: 'Documento de identidad', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Selfie de verificación', exact: true }),
  ).toBeVisible();
  await page.goto('/operations/incidents');
  await page
    .locator('tr')
    .filter({ hasText: incident.id })
    .getByRole('button', { name: 'Gestionar' })
    .click();
  await expect(
    page.getByRole('img', { name: incident.evidences[0].caption, exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src*="legacy-photo"]')).toHaveCount(0);
  await page.goto(`/operations/orders/${incident.orderId}`);
  await expect(
    page.getByRole('img', { name: incident.evidences[0].caption, exact: true }),
  ).toBeVisible();
  await expect(page.locator('main img')).toHaveCount(0);
  expect(photoRequests).toEqual([]);
});
