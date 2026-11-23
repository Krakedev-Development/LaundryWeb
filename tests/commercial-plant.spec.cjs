const { randomUUID } = require('node:crypto');
const { test, expect } = require('./support/fixtures.cjs');
const { expectDialogPlacement } = require('./support/dialogPlacement.cjs');

// Servidor simulado de membresías con estado: la prueba no depende de un backend real.
const cors = { 'access-control-allow-origin': '*' };
async function mockMemberships(page) {
  const plans = [];
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(/\/api\/v1\/catalog\/memberships(\/[^/?]+)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (req.method() === 'GET') return json(route, 200, plans);
    const body = req.postDataJSON();
    if (req.method() === 'POST') {
      const plan = { id: randomUUID(), active: true, ...body };
      plans.push(plan);
      return json(route, 201, plan);
    }
    const id = new URL(req.url()).pathname.split('/').pop();
    const plan = plans.find((p) => p.id === id);
    Object.assign(plan, body);
    return json(route, 200, plan);
  });
}

test('membership creation and editing survive a reload', async ({ page }) => {
  await mockMemberships(page);
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
  test(`commercial forms open in place (centered or side panel) and are keyboard dismissible at ${width}px`, async ({
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
      await expectDialogPlacement(page, modal, { width, height: 900 });
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
}
