const { test, expect } = require('./support/fixtures.cjs');

// Servicios del catálogo: la descripción y el tiempo estimado se guardan en el servidor (los ve
// la app del cliente). La web no inventa valores cuando el servidor no los tiene.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

async function mockCatalog(page) {
  const services = [
    { id: 's-premium', name: 'Lavado premium', description: 'Lavado a mano con secado al aire', extraPrice: '3', estimatedHours: 48, active: true },
    { id: 's-basico', name: 'Lavado básico', description: null, extraPrice: '1', estimatedHours: null, active: true },
  ];
  const calls = [];
  await page.route(/\/api\/v1\/catalog\/(garments|services|extras)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (req.method() === 'GET') return json(route, 200, path === '/catalog/services' ? services : []);
    const body = req.postDataJSON();
    calls.push([req.method(), path, body]);
    if (req.method() === 'POST') {
      const created = { id: `s-${services.length + 1}`, active: true, description: null, estimatedHours: null, ...body };
      services.push(created);
      return json(route, 201, created);
    }
    const row = services.find((s) => path.endsWith(`/${s.id}`));
    Object.assign(row, body);
    return json(route, 200, row);
  });
  return calls;
}

const openServices = async (page) => {
  await page.goto('/commercial/catalog');
  await page.getByRole('button', { name: /Servicios & Paquetes/ }).click();
};

test('la tabla muestra la descripción y el tiempo del servidor, sin valores inventados', async ({ page }) => {
  await mockCatalog(page);
  await openServices(page);
  const premium = page.locator('tbody tr').filter({ hasText: 'Lavado premium' });
  await expect(premium).toContainText('Lavado a mano con secado al aire');
  await expect(premium).toContainText('48 horas');
  const basico = page.locator('tbody tr').filter({ hasText: 'Lavado básico' });
  await expect(basico).toContainText('Sin definir');
  await expect(basico).not.toContainText('Modalidad de procesamiento y cuidado');
});

test('crear y editar un servicio envía la descripción y las horas; vaciarlas las borra', async ({ page }) => {
  const calls = await mockCatalog(page);
  await openServices(page);
  await page.getByRole('button', { name: /Nuevo Ítem de SERVICIOS/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Ej: Camisa de lino o Lavado por Kilos').fill('Planchado express');
  await dialog.getByPlaceholder('Detalles sobre el proceso de lavado y cuidado...').fill('Planchado a vapor el mismo día');
  await dialog.locator('input[type="number"]').first().fill('2.5');
  await dialog.getByLabel('Tiempo estimado en horas').fill('72');
  await dialog.getByRole('button', { name: 'Crear Ítem' }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls[0]).toEqual([
    'POST',
    '/catalog/services',
    { name: 'Planchado express', extraPrice: 2.5, description: 'Planchado a vapor el mismo día', estimatedHours: 72 },
  ]);
  await expect(page.locator('tbody tr').filter({ hasText: 'Planchado express' })).toContainText('72 horas');

  await page.locator('tbody tr').filter({ hasText: 'Lavado premium' }).getByTitle('Editar ítem').click();
  await dialog.getByPlaceholder('Detalles sobre el proceso de lavado y cuidado...').fill('');
  await dialog.getByLabel('Tiempo estimado en horas').fill('0');
  await dialog.getByRole('button', { name: 'Guardar Cambios' }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls[1][0]).toBe('PATCH');
  expect(calls[1][1]).toBe('/catalog/services/s-premium');
  expect(calls[1][2]).toMatchObject({ description: null, estimatedHours: null });
  await expect(page.locator('tbody tr').filter({ hasText: 'Lavado premium' })).toContainText('Sin definir');
});

test('un tiempo fuera de rango no se envía al servidor', async ({ page }) => {
  const calls = await mockCatalog(page);
  await openServices(page);
  await page.getByRole('button', { name: /Nuevo Ítem de SERVICIOS/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Ej: Camisa de lino o Lavado por Kilos').fill('Servicio eterno');
  await dialog.getByLabel('Tiempo estimado en horas').fill('800');
  // El navegador bloquea el envío por el máximo del campo; si llegara a enviarse, la web lo frena.
  await dialog.getByRole('button', { name: 'Crear Ítem' }).click();
  await expect(dialog).toBeVisible();
  expect(calls).toEqual([]);
});
