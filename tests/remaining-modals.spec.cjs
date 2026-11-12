const { test, expect } = require('./support/fixtures.cjs');

// El directorio de clientes viene del servidor: se simula un cliente aprobado.
const cors = { 'access-control-allow-origin': '*' };
async function mockDirectory(page) {
  await page.route('**/api/v1/customers', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'c-eva', name: 'Eva Soto', email: 'eva@correo.test', phone: '0991234567',
              kycStatus: 'APPROVED', membershipPlan: null, kycDocumentType: 'CEDULA',
              kycDocumentNumber: '0912345675', kycRejectionReason: null,
              kycReviewedAt: '2026-11-10T14:00:00.000Z', addresses: [], totalOrders: 0,
              createdAt: '2026-11-10T13:00:00.000Z',
            },
          ]),
        }),
  );
}

for (const width of [1440, 390]) {
  test(`remaining forms open centrally and retain their controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockDirectory(page);
    const center = async () => {
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      const bounds = await modal.boundingBox();
      expect(Math.abs(bounds.x + bounds.width / 2 - width / 2)).toBeLessThan(3);
      expect(bounds.height).toBeLessThanOrEqual(810);
      return modal;
    };
    await page.goto('/logistics/drivers');
    await page
      .getByRole('button', { name: 'Registrar Chofer', exact: true })
      .click();
    let modal = await center();
    await expect(
      modal.getByRole('button', { name: 'Registrar Chofer', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/drivers-centered-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await page
      .getByRole('button', { name: 'Editar chofer', exact: true })
      .first()
      .click();
    modal = await center();
    await expect(
      modal.getByRole('button', { name: 'Guardar Cambios' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/customers');
    await page.getByRole('row').nth(1).getByRole('cell').first().click();
    modal = await center();
    await modal.getByRole('button', { name: /Puntos/ }).click();
    await modal.getByRole('button', { name: 'Ajuste Manual' }).click();
    await expect(modal.getByRole('button', { name: 'Guardar Ajuste' })).toBeVisible();
    await page.screenshot({
      path: `test-results/customers-centered-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await page.goto('/operations/incidents');
    await page.getByRole('row').nth(1).getByRole('cell').first().click();
    modal = await center();
    await expect(
      modal.getByRole('heading', { name: /Incidencia en Solicitud/ }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/incidents-centered-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
}
