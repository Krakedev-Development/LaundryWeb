const { test, expect } = require('@playwright/test');

test('membership creation and editing survive a reload', async ({ page }) => {
  await page.goto('/commercial/memberships');
  await page
    .getByRole('button', { name: 'Crear membresía', exact: true })
    .first()
    .click();
  const modal = page.getByRole('dialog', { name: 'Crear membresía' });
  await modal.getByLabel('Nombre del plan').fill('Plan familiar de prueba');
  await modal.getByLabel(/Precio \(/).fill('39.90');
  await modal.getByLabel('Peso incluido', { exact: true }).fill('15');
  await modal.getByLabel('Recogidas incluidas').fill('2');
  await modal.getByRole('button', { name: 'Guardar membresía' }).click();
  await expect(modal).not.toBeVisible();
  await page.reload();
  const row = page
    .getByRole('row')
    .filter({ hasText: 'Plan familiar de prueba' });
  await expect(row).toContainText('$39.90');
  await expect(row).toContainText('15 KG');
  await row
    .getByRole('button', { name: 'Editar Plan familiar de prueba' })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Estado', { exact: true })
    .selectOption('INACTIVE');
  await page.getByRole('button', { name: 'Guardar membresía' }).click();
  await page.reload();
  await expect(row).toContainText('Inactiva');
  await page.screenshot({
    path: 'test-results/memberships-desktop.png',
    fullPage: true,
  });
  await page
    .getByRole('combobox', { name: 'Filtrar estado de membresía' })
    .selectOption('ACTIVE');
  await expect(row).not.toBeVisible();
});

for (const width of [1440, 390]) {
  test(`commercial forms are centered and keyboard dismissible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const surface of [
      {
        path: '/commercial/catalog',
        trigger: /Nuevo Ítem de/,
        title: /Crear nuevo ítem/,
        shot: 'catalog',
      },
      {
        path: '/commercial/promotions',
        trigger: 'Nueva Promoción',
        title: 'Nueva promoción comercial',
        shot: 'promotions',
      },
      {
        path: '/commercial/rewards',
        trigger: 'Nueva Recompensa',
        title: 'Nueva recompensa',
        shot: 'rewards',
      },
    ]) {
      await page.goto(surface.path);
      const trigger = page.getByRole('button', {
        name: surface.trigger,
        exact: typeof surface.trigger === 'string',
      });
      await trigger.click();
      const modal = page.getByRole('dialog', { name: surface.title });
      await expect(modal).toBeVisible();
      const box = await modal.boundingBox();
      expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(3);
      expect(box.y).toBeGreaterThan(0);
      expect(box.height).toBeLessThanOrEqual(810);
      await expect(
        modal.getByRole('button', { name: 'Cerrar modal' }),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/${surface.shot}-modal-${width}.png`,
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
  });

  test(`plant list opens the process and complete history at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/operations/plant');
    if (width >= 768)
      await expect(
        page.getByRole('columnheader', { name: 'Línea de proceso' }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole('list', { name: 'Pedidos de planta' }),
      ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Abrir pedido / }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/plant-list-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: /^Abrir pedido / })
      .first()
      .click();
    const modal = page.getByRole('dialog', { name: /^Pedido / });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      modal.getByRole('heading', { name: 'Prendas del pedido' }),
    ).toBeVisible();
    await modal.getByRole('button', { name: 'Historial y bitácora' }).click();
    await expect(
      modal.getByRole('region', { name: 'Historial completo y bitácora' }),
    ).toBeVisible();
    await expect(
      modal
        .getByRole('region', { name: 'Historial completo y bitácora' })
        .getByRole('listitem')
        .first(),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/plant-history-${width}.png`,
      fullPage: true,
    });
    await modal.getByRole('button', { name: 'Gestionar proceso' }).click();
    await expect(
      modal.getByRole('link', { name: /Abrir recepción y retiros/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await page
      .getByRole('textbox', { name: 'Buscar pedidos de planta' })
      .fill('pedido-inexistente-000');
    await expect(
      page.getByText('No hay pedidos para esta vista'),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}
