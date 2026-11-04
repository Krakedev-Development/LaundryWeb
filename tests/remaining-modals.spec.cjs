const { test, expect } = require('@playwright/test');

test('two editable demo memberships are available without duplicate initialization', async ({
  page,
}) => {
  await page.goto('/commercial/memberships');
  for (let visit = 0; visit < 2; visit++) {
    await expect(
      page.getByRole('row').filter({ hasText: 'Plan Esencial' }),
    ).toHaveCount(1);
    await expect(
      page.getByRole('row').filter({ hasText: 'Plan Familiar' }),
    ).toHaveCount(1);
    await page.reload();
  }
});

for (const width of [1440, 390]) {
  test(`remaining forms open centrally and retain their controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
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
